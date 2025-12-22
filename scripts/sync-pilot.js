/**
 * PHASE 2: Sync 5 Pilot Clients to Supabase Mirror
 *
 * Fetches ALL comments from Asana for 5 clients and mirrors them to Supabase
 * Includes identity resolution for "Private User" comments
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Asana config
const ASANA_TOKEN = process.env.ASANA_API_TOKEN;
const WORKSPACE_ID = '237098990512572';

// ALL CLIENTS (66 total, excluding internal teams)
const PILOT_CLIENTS = [
  'Abigail Jerram',
  'Adam Cook',
  'Adam, Marv, Tom',
  'Aileen Andrews',
  'Alexandra & Richard Powell',
  'Alistair Pottinger',
  'Anthony Baines',
  'Anthony Litchfield',
  'Ben Townsend & Ally Wilson',
  'Brad Goodridge',
  'Bradley Jackson',
  'Bradley Wheaton',
  'Charlie Sutton',
  'Chris James',
  'Dale Marshall',
  'Declan O\'Neill',
  'Deepak Gupta',
  'Duncan McIntosh',
  'Ellis Wiseman',
  'Frank Rawle',
  'Gary Gillett',
  'George Munton',
  'Graeme Taylor',
  'Huw & Mark Carrel',
  'James Wilcock',
  'Jay & Kayleigh Mardell',
  'John Eastwood',
  'Jordan Stubley',
  'Julian Thorngate',
  'Kate & James -Kiwi',
  'Krzysztof Poplawski',
  'Lee Wane',
  'Marek Przychocki',
  'Mark & Connor',
  'Martin Durham',
  'Matthew Carter',
  'Matthew McFarlane',
  'Mike Calvert',
  'Mikey Chambers & Chris Angell',
  'Mostyn Pritchard',
  'Nick Cahill',
  'Owain Bancroft',
  'Paul & Roxanne Murphy',
  'Rachel Moors',
  'Ray Delaney',
  'Reece Blake',
  'Robert McGill',
  'Ryan  Meredith',
  'Sam & Rose Chambers',
  'Sean Ryan',
  'Terry Diver',
  'Tim Day',
];

// Known coaches for identity resolution
const KNOWN_COACHES = {
  '1206947945106498': 'Greg Wilkes',
  '1204578469248079': 'Jamie Mills',
  '1207005372889368': 'Nick Tobing',
  '1207005372889369': 'Harmeet Johal',
};

const COACH_NAMES = ['greg wilkes', 'jamie mills', 'nick tobing', 'harmeet johal', 'greg', 'jamie', 'nick', 'harmeet'];

// Asana API request
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

async function syncClient(clientName, teamGid) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SYNCING: ${clientName}`);
  console.log('='.repeat(60));

  const stats = {
    tasksFound: 0,
    commentsInAsana: 0,
    commentsInserted: 0,
    commentsUpdated: 0,
    privateUserResolved: 0,
    coachComments: 0,
  };

  try {
    // Get Progress project
    const projectsResp = await asanaRequest(`/teams/${teamGid}/projects`);
    const projects = projectsResp.data || [];
    const progressProject = projects.find(p => p.name.toLowerCase().includes('progress'));

    if (!progressProject) {
      console.log(`   ⚠️  No Progress project found`);
      return stats;
    }

    console.log(`   📁 Progress project: ${progressProject.gid}`);

    // Get sections
    const sectionsResp = await asanaRequest(`/projects/${progressProject.gid}/sections`);
    const sections = sectionsResp.data || [];
    const sectionMap = new Map();

    // Get all tasks with their sections
    const allTasks = [];

    for (const section of sections) {
      const tasksResp = await asanaRequest(`/sections/${section.gid}/tasks?opt_fields=gid,name,notes,completed,created_at`);
      const tasks = tasksResp.data || [];

      for (const task of tasks) {
        sectionMap.set(task.gid, section.name);
        allTasks.push(task);
      }
    }

    stats.tasksFound = allTasks.length;
    console.log(`   📋 Found ${allTasks.length} tasks`);

    // Fetch comments for each task
    const commentsToInsert = [];

    for (const task of allTasks) {
      const storiesResp = await asanaRequest(
        `/tasks/${task.gid}/stories?opt_fields=gid,created_at,text,type,resource_subtype,created_by,created_by.name,created_by.gid`
      );
      const stories = storiesResp.data || [];
      const comments = stories.filter(s => s.type === 'comment' && s.text);

      for (const comment of comments) {
        stats.commentsInAsana++;

        const authorName = comment.created_by?.name || null;
        const authorGid = comment.created_by?.gid || null;

        // Identity resolution
        let resolvedAuthorName = authorName;
        let coachInferred = false;
        let isCoachComment = false;

        // Check if Private User or missing name
        if (!authorName || authorName === 'Private User' || authorName === '') {
          // Try to resolve from known coaches
          if (authorGid && KNOWN_COACHES[authorGid]) {
            resolvedAuthorName = KNOWN_COACHES[authorGid];
            coachInferred = true;
            stats.privateUserResolved++;
          } else {
            resolvedAuthorName = `Unknown (GID: ${authorGid || 'none'})`;
          }
        }

        // Check if this is a coach comment
        if (resolvedAuthorName) {
          const nameLower = resolvedAuthorName.toLowerCase();
          if (COACH_NAMES.some(coach => nameLower.includes(coach))) {
            isCoachComment = true;
            stats.coachComments++;
          }
        }

        commentsToInsert.push({
          comment_gid: comment.gid,
          task_gid: task.gid,
          task_name: task.name,
          section_name: sectionMap.get(task.gid) || null,
          project_name: 'Progress',
          client_name: clientName,
          team_gid: teamGid,
          author_name: resolvedAuthorName,
          author_gid: authorGid,
          raw_author_data: comment.created_by || null,
          coach_inferred: coachInferred,
          is_coach_comment: isCoachComment,
          comment_text: comment.text,
          created_at: comment.created_at,
          synced_at: new Date().toISOString(),
        });
      }
    }

    console.log(`   💬 Found ${stats.commentsInAsana} comments in Asana`);

    // Batch insert to Supabase
    if (commentsToInsert.length > 0) {
      // Upsert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < commentsToInsert.length; i += batchSize) {
        const batch = commentsToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('asana_mirror')
          .upsert(batch, { onConflict: 'comment_gid' });

        if (error) {
          console.log(`   ❌ Insert error: ${error.message}`);
        } else {
          stats.commentsInserted += batch.length;
        }
      }
    }

    console.log(`   ✅ Inserted/Updated: ${stats.commentsInserted} comments`);
    console.log(`   🧑‍🏫 Coach comments: ${stats.coachComments}`);
    if (stats.privateUserResolved > 0) {
      console.log(`   🔍 Private User resolved: ${stats.privateUserResolved}`);
    }

    // Log sync
    await supabase.from('asana_sync_log').insert({
      client_name: clientName,
      comments_found: stats.commentsInAsana,
      comments_inserted: stats.commentsInserted,
      status: 'completed'
    });

  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  return stats;
}

async function main() {
  console.log('='.repeat(60));
  console.log('PHASE 2: PILOT SYNC - 5 CLIENTS TO SUPABASE');
  console.log('='.repeat(60));
  console.log(`\nPilot Clients: ${PILOT_CLIENTS.join(', ')}`);

  // Get all teams
  console.log('\n📋 Fetching teams from Asana...');
  const teamsResp = await asanaRequest(`/organizations/${WORKSPACE_ID}/teams`);
  const teams = teamsResp.data || [];
  console.log(`   Found ${teams.length} teams`);

  // Match pilot clients to teams - use EXACT matching
  const clientTeams = [];
  for (const clientName of PILOT_CLIENTS) {
    const team = teams.find(t =>
      t.name.toLowerCase() === clientName.toLowerCase()
    );

    if (team) {
      clientTeams.push({ clientName, teamGid: team.gid, teamName: team.name });
      console.log(`   ✅ ${clientName} → ${team.name} (${team.gid})`);
    } else {
      console.log(`   ❌ ${clientName} → NOT FOUND`);
    }
  }

  // Sync each client
  const allStats = {
    totalTasks: 0,
    totalCommentsAsana: 0,
    totalCommentsSynced: 0,
    totalCoachComments: 0,
  };

  for (const { clientName, teamGid } of clientTeams) {
    const stats = await syncClient(clientName, teamGid);
    allStats.totalTasks += stats.tasksFound;
    allStats.totalCommentsAsana += stats.commentsInAsana;
    allStats.totalCommentsSynced += stats.commentsInserted;
    allStats.totalCoachComments += stats.coachComments;
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('SYNC COMPLETE - SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n📊 RESULTS:`);
  console.log(`   Clients synced:     ${clientTeams.length}`);
  console.log(`   Total tasks:        ${allStats.totalTasks}`);
  console.log(`   Comments in Asana:  ${allStats.totalCommentsAsana}`);
  console.log(`   Comments synced:    ${allStats.totalCommentsSynced}`);
  console.log(`   Coach comments:     ${allStats.totalCoachComments}`);

  // Verify in Supabase
  console.log('\n📋 VERIFICATION - Supabase counts:');
  for (const { clientName } of clientTeams) {
    const { count } = await supabase
      .from('asana_mirror')
      .select('*', { count: 'exact', head: true })
      .eq('client_name', clientName);

    console.log(`   ${clientName}: ${count} comments`);
  }

  // Show sample comment
  console.log('\n📝 SAMPLE COMMENT FROM SUPABASE:');
  const { data: sample } = await supabase
    .from('asana_mirror')
    .select('*')
    .limit(1);

  if (sample && sample[0]) {
    const s = sample[0];
    console.log(`   Client: ${s.client_name}`);
    console.log(`   Task: ${s.task_name}`);
    console.log(`   Author: ${s.author_name} (GID: ${s.author_gid})`);
    console.log(`   Coach: ${s.is_coach_comment ? 'Yes' : 'No'}`);
    console.log(`   Text: "${s.comment_text.substring(0, 100)}..."`);
    console.log(`   Date: ${s.created_at}`);
  }
}

main().catch(console.error);
