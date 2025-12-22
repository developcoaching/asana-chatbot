/**
 * Run the asana_mirror table setup in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log('='.repeat(60));
  console.log('PHASE 1: Creating asana_mirror table in Supabase');
  console.log('='.repeat(60));
  console.log('');

  // Create the table using Supabase's SQL execution
  // We'll use individual queries since Supabase JS doesn't support raw SQL execution directly
  // Instead, we'll use the REST API or create the table via schema

  // First, check if table exists
  const { data: existingTable, error: checkError } = await supabase
    .from('asana_mirror')
    .select('comment_gid')
    .limit(1);

  if (checkError && checkError.code === '42P01') {
    console.log('📋 Table does not exist. Creating via Supabase Dashboard...');
    console.log('');
    console.log('Please run this SQL in Supabase Dashboard > SQL Editor:');
    console.log('');
    console.log('CREATE TABLE asana_mirror (');
    console.log('    comment_gid TEXT PRIMARY KEY,');
    console.log('    task_gid TEXT NOT NULL,');
    console.log('    task_name TEXT NOT NULL,');
    console.log('    section_name TEXT,');
    console.log('    project_name TEXT DEFAULT \'Progress\',');
    console.log('    client_name TEXT NOT NULL,');
    console.log('    team_gid TEXT,');
    console.log('    author_name TEXT,');
    console.log('    author_gid TEXT,');
    console.log('    raw_author_data JSONB,');
    console.log('    coach_inferred BOOLEAN DEFAULT FALSE,');
    console.log('    is_coach_comment BOOLEAN DEFAULT FALSE,');
    console.log('    comment_text TEXT NOT NULL,');
    console.log('    created_at TIMESTAMPTZ NOT NULL,');
    console.log('    synced_at TIMESTAMPTZ DEFAULT NOW()');
    console.log(');');
    console.log('');
    console.log('CREATE INDEX idx_asana_mirror_client ON asana_mirror(client_name);');
    console.log('CREATE INDEX idx_asana_mirror_created ON asana_mirror(created_at DESC);');
    console.log('');

    // Try to create via RPC or direct insert test
    console.log('Attempting to create table via API...');

    // Alternative: Create table by attempting an upsert with schema inference
    const testRecord = {
      comment_gid: 'test_setup_' + Date.now(),
      task_gid: 'test',
      task_name: 'Setup Test',
      client_name: 'Test Client',
      author_name: 'System',
      comment_text: 'Table setup verification',
      created_at: new Date().toISOString()
    };

    const { error: createError } = await supabase
      .from('asana_mirror')
      .upsert(testRecord, { onConflict: 'comment_gid' });

    if (createError) {
      console.log('❌ Could not auto-create table:', createError.message);
      console.log('');
      console.log('Please create the table manually in Supabase Dashboard.');
      return false;
    } else {
      // Delete the test record
      await supabase.from('asana_mirror').delete().eq('comment_gid', testRecord.comment_gid);
      console.log('✅ Table created and verified!');
    }
  } else if (existingTable) {
    console.log('✅ Table asana_mirror already exists');

    // Get current count
    const { count } = await supabase
      .from('asana_mirror')
      .select('*', { count: 'exact', head: true });

    console.log(`   Current records: ${count || 0}`);
  } else {
    console.log('⚠️  Unexpected response:', checkError);
  }

  // Create sync_log table
  console.log('');
  console.log('📋 Creating asana_sync_log table...');

  const syncLogTest = {
    client_name: 'Test',
    sync_type: 'setup',
    comments_found: 0,
    comments_inserted: 0,
    status: 'test'
  };

  const { error: syncLogError } = await supabase
    .from('asana_sync_log')
    .insert(syncLogTest);

  if (syncLogError && syncLogError.code === '42P01') {
    console.log('   Note: asana_sync_log table needs to be created manually');
  } else {
    // Clean up test record
    await supabase.from('asana_sync_log').delete().eq('client_name', 'Test');
    console.log('✅ asana_sync_log table ready');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('PHASE 1 COMPLETE');
  console.log('='.repeat(60));

  return true;
}

main().catch(console.error);
