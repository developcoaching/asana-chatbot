/**
 * Step 1: Extended Verification Script
 * Search ALL teams for "Private User" or missing author comments
 */

const https = require('https');
require('dotenv').config();

const ASANA_TOKEN = process.env.ASANA_API_TOKEN;
const WORKSPACE_ID = '237098990512572';

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
  console.log('EXTENDED VERIFICATION - Checking ALL teams for Private User comments');
  console.log('='.repeat(70));
  console.log('');

  const teamsResp = await asanaRequest(`/organizations/${WORKSPACE_ID}/teams`);
  const teams = teamsResp.data || [];
  console.log(`📋 Found ${teams.length} teams total\n`);

  const allExamples = [];
  const teamsWithIssues = [];
  let totalPrivateUser = 0;
  let totalNormal = 0;

  // Check first 20 teams
  for (const team of teams.slice(0, 20)) {
    process.stdout.write(`   Checking: ${team.name.substring(0, 30).padEnd(32)}... `);

    try {
      const projectsResp = await asanaRequest(`/teams/${team.gid}/projects`);
      const projects = projectsResp.data || [];
      const progressProject = projects.find(p => p.name.toLowerCase().includes('progress'));

      if (!progressProject) {
        console.log('(no Progress project)');
        continue;
      }

      const tasksResp = await asanaRequest(`/projects/${progressProject.gid}/tasks?limit=15`);
      const tasks = tasksResp.data || [];

      let teamPrivateCount = 0;
      let teamNormalCount = 0;

      for (const task of tasks.slice(0, 8)) {
        const storiesResp = await asanaRequest(
          `/tasks/${task.gid}/stories?opt_fields=created_at,text,type,resource_subtype,created_by,created_by.name,created_by.gid,created_by.email`
        );
        const stories = storiesResp.data || [];
        const comments = stories.filter(s => s.type === 'comment' && s.text);

        for (const comment of comments) {
          const createdBy = comment.created_by || {};
          const authorName = createdBy.name || null;

          if (!authorName || authorName === 'Private User' || authorName === '') {
            teamPrivateCount++;
            totalPrivateUser++;
            if (allExamples.length < 10) {
              allExamples.push({
                team: team.name,
                taskName: task.name,
                taskGid: task.gid,
                commentText: comment.text.substring(0, 150),
                created_by: createdBy,
                resource_subtype: comment.resource_subtype,
                date: comment.created_at,
              });
            }
          } else {
            teamNormalCount++;
            totalNormal++;
          }
        }
      }

      if (teamPrivateCount > 0) {
        console.log(`⚠️  ${teamPrivateCount} Private User, ${teamNormalCount} normal`);
        teamsWithIssues.push({ name: team.name, privateCount: teamPrivateCount });
      } else if (teamNormalCount > 0) {
        console.log(`✅ ${teamNormalCount} normal comments`);
      } else {
        console.log('(no comments)');
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total "Private User" or missing name: ${totalPrivateUser}`);
  console.log(`Total normal (name present):          ${totalNormal}`);
  console.log(`Teams with issues: ${teamsWithIssues.length}`);

  if (teamsWithIssues.length > 0) {
    console.log('\nTeams with Private User comments:');
    teamsWithIssues.forEach(t => console.log(`  - ${t.name}: ${t.privateCount} comments`));
  }

  if (allExamples.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('EXAMPLE "PRIVATE USER" COMMENTS');
    console.log('='.repeat(70));

    for (const ex of allExamples) {
      console.log(`\n📌 Team: "${ex.team}"`);
      console.log(`   Task: "${ex.taskName}" (${ex.taskGid})`);
      console.log(`   Date: ${ex.date}`);
      console.log(`   resource_subtype: ${ex.resource_subtype}`);
      console.log(`   created_by:`);
      console.log(`     name: "${ex.created_by.name || 'NULL'}"`);
      console.log(`     gid: "${ex.created_by.gid || 'NULL'}"`);
      console.log(`     email: "${ex.created_by.email || 'NULL'}"`);
      console.log(`   Text: "${ex.commentText}..."`);
    }
  } else {
    console.log('\n✅ No "Private User" comments found in any team!');
    console.log('The issue may be with coach name filtering, not Private User.');
  }

  // Also check what coach names ARE appearing
  console.log('\n' + '='.repeat(70));
  console.log('UNIQUE AUTHOR NAMES FOUND (to check coach matching)');
  console.log('='.repeat(70));

  const uniqueAuthors = new Set();
  // Re-check a few teams to collect author names
  for (const team of teams.slice(0, 10)) {
    try {
      const projectsResp = await asanaRequest(`/teams/${team.gid}/projects`);
      const projects = projectsResp.data || [];
      const progressProject = projects.find(p => p.name.toLowerCase().includes('progress'));
      if (!progressProject) continue;

      const tasksResp = await asanaRequest(`/projects/${progressProject.gid}/tasks?limit=10`);
      for (const task of (tasksResp.data || []).slice(0, 5)) {
        const storiesResp = await asanaRequest(
          `/tasks/${task.gid}/stories?opt_fields=text,type,created_by.name`
        );
        for (const story of (storiesResp.data || [])) {
          if (story.type === 'comment' && story.created_by?.name) {
            uniqueAuthors.add(story.created_by.name);
          }
        }
      }
    } catch (e) {}
  }

  console.log('\nUnique author names appearing in comments:');
  [...uniqueAuthors].sort().forEach(name => console.log(`  - "${name}"`));
}

main().catch(console.error);
