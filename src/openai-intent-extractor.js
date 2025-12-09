const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables with override
dotenv.config({ override: true });

class OpenAIIntentExtractor {
  constructor() {
    // Read API key directly from .env file to avoid system env override
    let apiKey = process.env.OPENAI_API_KEY;

    // If still getting placeholder, read directly from .env file
    if (apiKey === 'your-openai-api-key' || apiKey?.startsWith('your-')) {
      try {
        const envPath = path.join(__dirname, '..', '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/OPENAI_API_KEY=(.+)/);
        if (match && match[1] && !match[1].startsWith('your-')) {
          apiKey = match[1].trim();
          process.env.OPENAI_API_KEY = apiKey; // Update process.env
        }
      } catch (e) {
        console.warn('Could not read .env file directly:', e.message);
      }
    }

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    if (apiKey === 'your-openai-api-key' || apiKey.startsWith('your-')) {
      throw new Error('OPENAI_API_KEY appears to be a placeholder. Please set a valid API key in .env file');
    }

    // Allow both sk- and sk-proj- prefixes
    if (!apiKey.startsWith('sk-')) {
      throw new Error('OPENAI_API_KEY format is invalid. Should start with "sk-"');
    }

    console.log('✅ OpenAI Intent Extractor initialized');

    this.client = new OpenAI({
      apiKey: apiKey,
    });
  }

  async extractIntent(userMessage, conversationHistory = [], currentClient = null) {
    try {
      // Build system prompt with context awareness
      let systemPrompt = `You are a helpful assistant that extracts client/project names from user messages.

**YOUR JOB:** Extract ANY name mentioned - even just a first name like "Brad", "Jamie", "Mike", etc.

**CRITICAL RULES:**
1. **ALWAYS extract names** - first names, last names, full names - ALL of them count!
2. **Examples that MUST be extracted:**
   - "How is Brad doing?" → extract "Brad"
   - "Tell me about Jamie" → extract "Jamie"
   - "What about Mike?" → extract "Mike"
   - "Status on Sarah" → extract "Sarah"
   - "How's Tom's project" → extract "Tom"

3. **INTENT**: What they want to know (status, progress, tasks, sales, cashflow, etc.)

4. **TIME RANGE**: Extract time-related phrases if mentioned:
   - "last week", "past week", "1 week" → "last_week"
   - "last 2 weeks", "past 2 weeks" → "last_2_weeks"
   - "last 3 weeks", "past 3 weeks" → "last_3_weeks"
   - "last 4 weeks", "last month", "past month" → "last_4_weeks"
   - "last 2 months", "past 2 months" → "last_2_months"
   - "recent", "recently" → "last_week"
   - If NO time mentioned → null`;

      // Add current client context if available
      if (currentClient) {
        systemPrompt += `\n\n**CURRENT CONTEXT:** User was discussing "${currentClient}"

**When to keep current client "${currentClient}":**
- User says "he", "his", "him", "she", "her", "them", "their"
- User says "the client", "the project", "this one"
- General questions: "What's the progress?", "How's it going?"

**When to extract a NEW name (SWITCH CLIENT):**
- User says ANY new name: "Jamie", "Tom", "Sarah", "Brad", "Martin", etc.
- User says "switch to [name]", "how is [name]", "what about [name]"
- User says "my last conversation with [name]"
- User mentions ANY proper name (capitalized first name)

🚨 **CRITICAL - NAME SWITCHING RULES:**
- If the message contains "Brad" → return "Brad" (NOT "${currentClient}")
- If the message contains "Martin" → return "Martin" (NOT "${currentClient}")
- If the message contains ANY name different from "${currentClient}" → return that NEW name
- ONLY use "${currentClient}" if NO other name appears AND user uses pronouns (he/she/him/her/they)

Example: Current context is "Martin", user asks "What was my last conversation with Brad?"
→ Return {"clientName": "Brad", ...} because "Brad" is explicitly mentioned!`;
      }

      systemPrompt += `\n\n**OUTPUT FORMAT:** {"clientName": "exact name from message or current context", "intent": "what they want to know", "timeRange": "time period or null"}

**IMPORTANT:**
- Extract EXACT name from message (preserve capitalization)
- If no name in message AND no current context, return {"clientName": "unknown", "intent": "status", "timeRange": null}
- If no name BUT there IS current context, use the current context name
- Default intent to "status" if unclear
- Default timeRange to null if no time mentioned`;

      // Build messages array with conversation history
      const messages = [
        {
          role: 'system',
          content: systemPrompt,
        }
      ];

      // Add conversation history (last 5 messages for context)
      const recentHistory = conversationHistory.slice(-5);
      messages.push(...recentHistory);

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage,
      });

      console.log('🤖 OpenAI context:', {
        currentClient,
        historyLength: conversationHistory.length,
        recentMessages: recentHistory.length
      });

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
      });

      const content = response.choices[0].message.content;
      const extracted = JSON.parse(content);

      console.log('📊 Extracted intent:', extracted);

      return {
        clientName: extracted.clientName || currentClient || 'unknown',
        intent: extracted.intent || 'status',
        timeRange: extracted.timeRange || null,
        success: true,
      };
    } catch (error) {
      console.error('Error extracting intent from OpenAI:', error);
      return {
        clientName: currentClient || 'unknown',
        intent: 'status',
        timeRange: null,
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = OpenAIIntentExtractor;
