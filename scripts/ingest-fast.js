/**
 * FAST Training Ingestion - Option A (Simple, streams to DB)
 */
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SOURCE = '/Users/equipp/Downloads/TranscriptsExtracted/Transcripts';
const CHUNK_SIZE = 3000; // chars
const CHUNK_OVERLAP = 300;

async function main() {
  console.log('FAST INGESTION\n');

  // Find all files
  const files = [];
  function scan(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) scan(p);
      else if (/\.(pdf|docx|txt)$/i.test(e.name)) {
        const rel = path.relative(SOURCE, p).split(path.sep);
        files.push({ path: p, name: e.name, cat: rel[0], sub: rel[1] || null });
      }
    }
  }
  scan(SOURCE);
  console.log(`Found ${files.length} files\n`);

  let total = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const t0 = Date.now();

    // Extract text
    let text = '';
    try {
      if (f.name.endsWith('.txt')) text = fs.readFileSync(f.path, 'utf-8');
      else if (f.name.endsWith('.pdf')) text = execSync(`pdftotext "${f.path}" -`, { encoding: 'utf-8', maxBuffer: 10*1024*1024 });
      else if (f.name.endsWith('.docx')) text = execSync(`textutil -convert txt -stdout "${f.path}"`, { encoding: 'utf-8' });
    } catch { }

    if (!text || text.trim().length < 50) {
      console.log(`[${i+1}/${files.length}] ${f.name.slice(0,35).padEnd(35)} SKIP`);
      continue;
    }

    // Chunk
    text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    const chunks = [];
    for (let s = 0; s < text.length; s += CHUNK_SIZE - CHUNK_OVERLAP) {
      const c = text.slice(s, s + CHUNK_SIZE).trim();
      if (c.length > 100) chunks.push(c);
    }

    // Embed + store each chunk immediately (no memory buildup)
    for (let j = 0; j < chunks.length; j++) {
      try {
        const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: chunks[j].slice(0, 8000) });
        await supabase.from('training_knowledge').upsert({
          filename: f.name,
          chunk_index: j,
          content: chunks[j],
          embedding: emb.data[0].embedding,
          metadata: { category: f.cat, subcategory: f.sub, total_chunks: chunks.length }
        }, { onConflict: 'filename,chunk_index' });
        total++;
      } catch (e) {
        console.error(`  chunk ${j} error: ${e.message}`);
      }
    }

    console.log(`[${i+1}/${files.length}] ${f.name.slice(0,35).padEnd(35)} ${chunks.length} chunks, ${((Date.now()-t0)/1000).toFixed(1)}s`);
  }

  console.log(`\nDone! ${total} chunks stored`);
  const { count } = await supabase.from('training_knowledge').select('*', { count: 'exact', head: true });
  console.log(`Total in DB: ${count}`);
}

main().catch(console.error);
