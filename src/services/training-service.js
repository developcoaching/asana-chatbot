/**
 * Phase 15.2: Training Knowledge Service
 *
 * Uses LangChain for RAG with self-correction grader loop.
 * Retrieves training content from Supabase vector store.
 */

const { ChatOpenAI, OpenAIEmbeddings } = require('@langchain/openai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-3-small'
});

const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0
});

class TrainingService {
  constructor() {
    this.maxAttempts = 2;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Search training knowledge with self-correction grader
   */
  async search(query, options = {}) {
    let currentQuery = query;
    let attempts = 0;
    let bestResult = null;

    while (attempts < this.maxAttempts) {
      attempts++;

      // 1. Embed query
      const queryEmbedding = await embeddings.embedQuery(currentQuery);

      // 2. Vector search in Supabase (direct query with pgvector)
      let query = supabase
        .from('training_knowledge')
        .select('id, filename, content, metadata')
        .limit(options.topK || 5);

      // Add category filter if specified
      if (options.category) {
        query = query.eq('metadata->>category', options.category);
      }

      // Note: For proper vector search, we need to use RPC or raw SQL
      // For now, fetch all and sort in memory (works for small datasets)
      const { data: allChunks, error } = await supabase
        .from('training_knowledge')
        .select('id, filename, content, metadata, embedding');

      if (error) throw error;

      // Calculate cosine similarity and sort
      const chunks = allChunks
        .map(chunk => {
          // Parse embedding from pgvector string format "[0.1,0.2,...]"
          let emb = chunk.embedding;
          if (typeof emb === 'string') {
            emb = emb.slice(1, -1).split(',').map(Number);
          }
          return {
            ...chunk,
            similarity: this.cosineSimilarity(queryEmbedding, emb)
          };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, options.topK || 5);

      if (error) {
        console.error('Search error:', error);
        return { success: false, error: error.message };
      }

      if (!chunks || chunks.length === 0) {
        return { success: false, error: 'No results found' };
      }

      // 3. Grade relevance
      const gradeResult = await this.gradeRelevance(query, chunks);

      if (gradeResult.score >= 0.7) {
        // Good enough - return results
        return {
          success: true,
          query: currentQuery,
          originalQuery: query,
          attempts,
          relevanceScore: gradeResult.score,
          chunks: chunks.map(c => ({
            content: c.content,
            filename: c.filename,
            category: c.metadata?.category,
            similarity: c.similarity
          }))
        };
      }

      // 4. Low relevance - try to rewrite query
      if (attempts < this.maxAttempts) {
        console.log(`  Relevance ${gradeResult.score.toFixed(2)} < 0.7, rewriting query...`);
        currentQuery = await this.rewriteQuery(query, gradeResult.reason, chunks);
        console.log(`  New query: "${currentQuery}"`);
      }

      bestResult = {
        success: true,
        query: currentQuery,
        originalQuery: query,
        attempts,
        relevanceScore: gradeResult.score,
        chunks: chunks.map(c => ({
          content: c.content,
          filename: c.filename,
          category: c.metadata?.category,
          similarity: c.similarity
        }))
      };
    }

    // Return best effort
    return bestResult;
  }

  /**
   * Grade if retrieved chunks answer the question
   */
  async gradeRelevance(query, chunks) {
    const chunksText = chunks.map((c, i) =>
      `[${i + 1}] (${c.filename}): ${c.content.slice(0, 500)}...`
    ).join('\n\n');

    const response = await llm.invoke([
      {
        role: 'system',
        content: `You are a relevance grader for a construction business coaching knowledge base.
Score how well the retrieved chunks answer the user's question.

Return JSON: { "score": 0.0-1.0, "reason": "brief explanation" }

Scoring:
- 1.0: Chunks directly answer the question with specific info
- 0.7-0.9: Chunks are relevant and helpful
- 0.4-0.7: Chunks are somewhat related but don't fully answer
- 0.0-0.4: Chunks are irrelevant or off-topic`
      },
      {
        role: 'user',
        content: `Question: "${query}"

Retrieved chunks:
${chunksText}

Grade the relevance:`
      }
    ]);

    try {
      const text = response.content.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(text);
    } catch {
      return { score: 0.5, reason: 'Could not parse grader response' };
    }
  }

  /**
   * Rewrite query to improve retrieval
   */
  async rewriteQuery(originalQuery, reason, chunks) {
    const response = await llm.invoke([
      {
        role: 'system',
        content: `You are a query rewriter for a construction business coaching knowledge base.
The original query didn't retrieve good results. Rewrite it to be more specific.

Tips:
- Use construction/business terminology
- "the thing where we check the house" → "site visit inspection procedure"
- "money stuff" → "profit and loss tracking P&L"
- Add specific terms from the failed chunks if they seem relevant

Return ONLY the rewritten query, nothing else.`
      },
      {
        role: 'user',
        content: `Original query: "${originalQuery}"
Reason for low relevance: ${reason}

Rewrite the query:`
      }
    ]);

    return response.content.trim().replace(/^["']|["']$/g, '');
  }

  /**
   * Generate answer using retrieved context
   */
  async answer(query, options = {}) {
    // Get relevant chunks
    const searchResult = await this.search(query, options);

    if (!searchResult.success) {
      return {
        success: false,
        answer: "I couldn't find relevant training content for that question.",
        error: searchResult.error
      };
    }

    // Generate answer
    const context = searchResult.chunks.map(c =>
      `[From: ${c.filename}]\n${c.content}`
    ).join('\n\n---\n\n');

    const response = await llm.invoke([
      {
        role: 'system',
        content: `You are Greg, a construction business coach at Develop Coaching.
Answer questions using ONLY the training content provided below.
Be conversational but authoritative. Format checklists as clear markdown.
If the content doesn't fully answer the question, say what you found and suggest they ask a coach.`
      },
      {
        role: 'user',
        content: `Training content:
${context}

Question: ${query}

Answer:`
      }
    ]);

    return {
      success: true,
      answer: response.content,
      sources: searchResult.chunks.map(c => c.filename),
      relevanceScore: searchResult.relevanceScore,
      attempts: searchResult.attempts
    };
  }
}

module.exports = TrainingService;

// CLI test
if (require.main === module) {
  const service = new TrainingService();
  const query = process.argv[2] || 'How do I do a site visit?';

  console.log(`Query: "${query}"\n`);

  service.answer(query).then(result => {
    console.log('Answer:', result.answer);
    console.log('\nSources:', result.sources);
    console.log('Relevance:', result.relevanceScore);
    console.log('Attempts:', result.attempts);
  });
}
