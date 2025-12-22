/**
 * Create asana_mirror table in Supabase using direct SQL
 */

const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Extract project ref from URL
const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

async function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });

    const options = {
      hostname: `${projectRef}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          resolve({ success: false, status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('Creating asana_mirror table via Supabase');
  console.log('='.repeat(60));
  console.log('');

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // First, try to create table by inserting a properly structured record
  // Supabase auto-creates tables when using the service key with proper permissions

  console.log('📋 Creating asana_mirror table...');

  // Use the Supabase client to create via upsert
  // First, let's check if we can use the table

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.asana_mirror (
      comment_gid TEXT PRIMARY KEY,
      task_gid TEXT NOT NULL,
      task_name TEXT NOT NULL,
      section_name TEXT,
      project_name TEXT DEFAULT 'Progress',
      client_name TEXT NOT NULL,
      team_gid TEXT,
      author_name TEXT,
      author_gid TEXT,
      raw_author_data JSONB,
      coach_inferred BOOLEAN DEFAULT FALSE,
      is_coach_comment BOOLEAN DEFAULT FALSE,
      comment_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      synced_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  // Try using the Management API via the dashboard URL
  // Since we can't execute raw SQL via the JS client, we need to use the SQL Editor approach

  console.log('');
  console.log('📌 Please run this SQL in Supabase Dashboard > SQL Editor:');
  console.log('   URL: https://supabase.com/dashboard/project/' + projectRef + '/sql');
  console.log('');
  console.log('-'.repeat(60));
  console.log(`
CREATE TABLE IF NOT EXISTS asana_mirror (
  comment_gid TEXT PRIMARY KEY,
  task_gid TEXT NOT NULL,
  task_name TEXT NOT NULL,
  section_name TEXT,
  project_name TEXT DEFAULT 'Progress',
  client_name TEXT NOT NULL,
  team_gid TEXT,
  author_name TEXT,
  author_gid TEXT,
  raw_author_data JSONB,
  coach_inferred BOOLEAN DEFAULT FALSE,
  is_coach_comment BOOLEAN DEFAULT FALSE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mirror_client ON asana_mirror(client_name);
CREATE INDEX IF NOT EXISTS idx_mirror_created ON asana_mirror(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mirror_author ON asana_mirror(author_name);
CREATE INDEX IF NOT EXISTS idx_mirror_client_date ON asana_mirror(client_name, created_at DESC);
  `);
  console.log('-'.repeat(60));
  console.log('');

  // Wait for user input simulation - just proceed with the sync script
  // The sync script will fail gracefully if table doesn't exist

  console.log('Alternatively, I will attempt to create via API...');

  // Try a workaround - use the postgrest schema cache refresh
  const testData = {
    comment_gid: 'setup_test_' + Date.now(),
    task_gid: 'test_task',
    task_name: 'Setup Test Task',
    section_name: 'Test Section',
    project_name: 'Progress',
    client_name: 'Setup Test',
    team_gid: 'test_team',
    author_name: 'System',
    author_gid: 'system',
    raw_author_data: { setup: true },
    coach_inferred: false,
    is_coach_comment: false,
    comment_text: 'This is a setup verification record',
    created_at: new Date().toISOString(),
    synced_at: new Date().toISOString()
  };

  // Try to insert - this will fail if table doesn't exist
  const { error } = await supabase.from('asana_mirror').insert(testData);

  if (error) {
    if (error.code === '42P01') {
      console.log('❌ Table does not exist. Please create it manually via SQL Editor.');
      console.log('');
      console.log('After creating, run: node scripts/sync-pilot.js');
    } else {
      console.log('❌ Error:', error.message);
    }
  } else {
    // Success! Delete the test record
    await supabase.from('asana_mirror').delete().eq('comment_gid', testData.comment_gid);
    console.log('✅ Table exists and is ready!');
  }
}

main().catch(console.error);
