/**
 * Step 1: Verification Script
 * Prove that "Private User" comments exist in raw Asana API data
 *
 * This script:
 * 1. Finds Lee Wane's team
 * 2. Gets tasks from their Progress project
 * 3. Fetches RAW stories with full created_by object
 * 4. Reports on "Private User" or GID-only authors
 */

const https = require('https');
require('dotenv').config();

const ASANA_TOKEN = process.env.ASANA_API_TOKEN;
const WORKSPACE_ID = '237098990512572';

// Make raw API request
async function asanaRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'app.asana.com',
      path: `/api/1.0${endpoint}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ASANA_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(70));
  console.log('STEP 1: VERIFICATION - Proving "Private User" data exists');
  console.log('='.repeat(70));
  console.log('');

  // 1. Get all teams
  console.log('📋 Fetching all teams...');
  const teamsResp = await asanaRequest(`/organizations/${WORKSPACE_ID}/teams`);
  const teams = teamsResp.data || [];

  // Find Lee Wane (or similar)
  const leeWane = teams.find(t => t.name.toLowerCase().includes('lee wane'));

  if (!leeWane) {
    console.log('⚠️  Lee Wane not found. Trying first 5 teams instead...');
    for (const team of teams.slice(0, 5)) {
      await checkTeamForPrivateUsers(team);
    }
  } else {
    console.log(`✅ Found team: "${leeWane.name}" (GID: ${leeWane.gid})`);
    await checkTeamForPrivateUsers(leeWane);
  }
}

async function checkTeamForPrivateUsers(team) {
  console.log('');
  console.log(`🔍 Checking team: "${team.name}"`);
  console.log('-'.repeat(50));

  // Get team projects
  const projectsResp = await asanaRequest(`/teams/${team.gid}/projects`);
  const projects = projectsResp.data || [];

  const progressProject = projects.find(p =>
    p.name.toLowerCase() === 'progress' ||
    p.name.toLowerCase().includes('progress')
  );

  if (!progressProject) {
    console.log('   No Progress project found');
    return;
  }

  console.log(`   📁 Progress project: ${progressProject.name} (${progressProject.gid})`);

  // Get tasks
  const tasksResp = await asanaRequest(`/projects/${progressProject.gid}/tasks?limit=20`);
  const tasks = tasksResp.data || [];
  console.log(`   📋 Found ${tasks.length} tasks`);

  let privateUserCount = 0;
  let unknownAuthorCount = 0;
  let normalAuthorCount = 0;
  const examples = [];

  // Check each task for stories
  for (const task of tasks.slice(0, 10)) {
    // CRITICAL: Fetch stories with FULL created_by object AND resource_subtype
    const storiesResp = await asanaRequest(
      `/tasks/${task.gid}/stories?opt_fields=created_at,text,type,resource_subtype,created_by,created_by.name,created_by.gid,created_by.resource_type`
    );
    const stories = storiesResp.data || [];

    // Filter for comments only
    const comments = stories.filter(s => s.type === 'comment' && s.text);

    for (const comment of comments) {
      const createdBy = comment.created_by || {};
      const authorName = createdBy.name || null;
      const authorGid = createdBy.gid || null;
      const resourceSubtype = comment.resource_subtype || null;

      if (!authorName || authorName === 'Private User') {
        privateUserCount++;
        if (examples.length < 5) {
          examples.push({
            taskName: task.name,
            taskGid: task.gid,
            commentPreview: comment.text.substring(0, 100),
            created_by: createdBy,
            resource_subtype: resourceSubtype,
            date: comment.created_at,
          });
        }
      } else if (authorName === 'Unknown' || !authorGid) {
        unknownAuthorCount++;
      } else {
        normalAuthorCount++;
      }
    }
  }

  console.log('');
  console.log('   📊 RESULTS:');
  console.log(`   ├─ Normal authors (name present):     ${normalAuthorCount}`);
  console.log(`   ├─ "Private User" or missing name:   ${privateUserCount}`);
  console.log(`   └─ Unknown/no GID:                   ${unknownAuthorCount}`);
  console.log('');

  if (examples.length > 0) {
    console.log('   🔍 EXAMPLES OF "Private User" OR MISSING NAME COMMENTS:');
    console.log('   ' + '='.repeat(60));

    for (const ex of examples) {
      console.log('');
      console.log(`   Task: "${ex.taskName}" (${ex.taskGid})`);
      console.log(`   Date: ${ex.date}`);
      console.log(`   resource_subtype: ${ex.resource_subtype}`);
      console.log(`   created_by object:`);
      console.log(`     - name: "${ex.created_by.name || 'NULL'}"`);
      console.log(`     - gid: "${ex.created_by.gid || 'NULL'}"`);
      console.log(`     - resource_type: "${ex.created_by.resource_type || 'NULL'}"`);
      console.log(`   Comment preview: "${ex.commentPreview}..."`);
      console.log('   ' + '-'.repeat(50));
    }
  } else {
    console.log('   ✅ No "Private User" comments found in this team.');
    console.log('   (All comments have proper author names)');
  }
}

main().catch(console.error);
