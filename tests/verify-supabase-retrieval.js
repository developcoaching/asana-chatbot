/**
 * Phase 4: Verification Test
 * Test that pilot clients use Supabase retrieval
 */

const http = require('http');
require('dotenv').config();

const PILOT_CLIENTS = ['Lee Wane', 'Dale Marshall', 'Brad Goodridge'];

async function testQuery(message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      message,
      sessionId: 'test-supabase-' + Date.now()
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ response: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => reject(new Error('Timeout')));
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('PHASE 4: VERIFICATION - Supabase-First Retrieval');
  console.log('='.repeat(60));
  console.log('');

  // Wait for server to start
  console.log('⏳ Waiting for server...');
  await new Promise(r => setTimeout(r, 3000));

  for (const client of PILOT_CLIENTS) {
    console.log('\n' + '-'.repeat(60));
    console.log(`📋 Testing: "${client}"`);
    console.log('-'.repeat(60));

    try {
      // Test 1: Latest comments
      console.log('\n🧪 Test: "What are the latest comments for ' + client + '?"');
      const result = await testQuery(`What are the latest comments for ${client}?`);

      if (result.response) {
        console.log('✅ Response received:');
        console.log(result.response.substring(0, 500) + '...');
      } else {
        console.log('❌ No response:', result);
      }

    } catch (err) {
      console.log('❌ Error:', err.message);
    }
  }

  // Test specific coach query
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Testing Coach Query: "Greg comments on Dale Marshall"');
  console.log('='.repeat(60));

  try {
    const coachResult = await testQuery('Greg comments on Dale Marshall');
    if (coachResult.response) {
      console.log('✅ Response:');
      console.log(coachResult.response.substring(0, 500) + '...');
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Show Supabase stats
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUPABASE MIRROR STATS');
  console.log('='.repeat(60));

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  for (const client of PILOT_CLIENTS) {
    const { count } = await supabase
      .from('asana_mirror')
      .select('*', { count: 'exact', head: true })
      .ilike('client_name', client);

    const { count: coachCount } = await supabase
      .from('asana_mirror')
      .select('*', { count: 'exact', head: true })
      .ilike('client_name', client)
      .eq('is_coach_comment', true);

    console.log(`${client}: ${count} total, ${coachCount} coach comments`);
  }

  // Show sample retrieved comment
  console.log('\n📝 SAMPLE FROM SUPABASE (Dale Marshall):');
  const { data: sample } = await supabase
    .from('asana_mirror')
    .select('*')
    .ilike('client_name', 'Dale Marshall')
    .eq('is_coach_comment', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (sample && sample[0]) {
    console.log(`   Task: ${sample[0].task_name}`);
    console.log(`   Author: ${sample[0].author_name}`);
    console.log(`   Coach: ${sample[0].is_coach_comment ? 'Yes' : 'No'}`);
    console.log(`   Date: ${sample[0].created_at}`);
    console.log(`   Text: "${sample[0].comment_text.substring(0, 150)}..."`);
  }
}

main().catch(console.error);
