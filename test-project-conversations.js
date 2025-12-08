// Test fetching project-level conversations and status updates
require('dotenv').config();
const AsanaClient = require('./src/asana-client');

async function testProjectConversations() {
  const client = new AsanaClient();

  try {
    console.log('📦 Fetching teams...');
    const teams = await client.getClientTeams();

    // Get Declan's team
    const declanTeam = teams.find(t => t.name.includes('Declan'));
    if (!declanTeam) {
      console.log('❌ Declan not found');
      return;
    }

    console.log(`✅ Found team: ${declanTeam.name}`);

    // Get Progress project
    const progressProject = await client.getTeamProgressProject(declanTeam.gid);
    if (!progressProject) {
      console.log('❌ No Progress project');
      return;
    }

    console.log(`✅ Progress project: ${progressProject.name} (${progressProject.gid})`);

    // Try fetching project status updates
    console.log('\n📊 Fetching project status updates...');
    try {
      const statusUpdates = await client.request(
        `/projects/${progressProject.gid}/project_statuses?opt_fields=title,text,created_at,author.name`
      );

      if (statusUpdates.data && statusUpdates.data.length > 0) {
        console.log(`✅ Found ${statusUpdates.data.length} status updates`);
        console.log('\n📝 Most recent status updates:');

        statusUpdates.data.slice(0, 3).forEach((update, i) => {
          console.log(`\n${i + 1}. ${update.title || '(No title)'}`);
          console.log(`   Author: ${update.author?.name || 'Unknown'}`);
          console.log(`   Date: ${new Date(update.created_at).toLocaleString()}`);
          console.log(`   Text: ${update.text?.substring(0, 100) || '(No text)'}${update.text?.length > 100 ? '...' : ''}`);
        });
      } else {
        console.log('📭 No status updates found');
      }
    } catch (error) {
      console.log(`⚠️  Status updates error: ${error.message}`);
    }

    // Try fetching project activity/stories
    console.log('\n\n📊 Fetching project stories (activity feed)...');
    try {
      const projectStories = await client.request(
        `/projects/${progressProject.gid}/project_status_updates?opt_fields=title,text,created_at,author.name`
      );

      if (projectStories.data && projectStories.data.length > 0) {
        console.log(`✅ Found ${projectStories.data.length} project stories`);
      } else {
        console.log('📭 No project stories found');
      }
    } catch (error) {
      console.log(`⚠️  Project stories error: ${error.message}`);
    }

    // Check team conversations
    console.log('\n\n📊 Checking team-level conversations...');
    try {
      const teamConversations = await client.request(
        `/teams/${declanTeam.gid}/conversations`
      );

      if (teamConversations.data && teamConversations.data.length > 0) {
        console.log(`✅ Found ${teamConversations.data.length} team conversations`);
      } else {
        console.log('📭 No team conversations found');
      }
    } catch (error) {
      console.log(`⚠️  Team conversations error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testProjectConversations();
