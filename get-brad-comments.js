// Fetch Brad's tasks and their most recent comments
require('dotenv').config();
const AsanaClient = require('./src/asana-client');

async function getBradComments() {
  const client = new AsanaClient();

  try {
    console.log('📦 Fetching all projects...');
    const projects = await client.getClientProjects();

    // Find Brad's project
    const bradProject = projects.find(p => p.name.toLowerCase().includes('brad'));

    if (!bradProject) {
      console.log('❌ Could not find Brad\'s project');
      return;
    }

    console.log(`✅ Found project: ${bradProject.name}`);
    console.log(`📋 Fetching tasks...`);

    const tasks = await client.getProjectTasks(bradProject.gid);
    console.log(`✅ Found ${tasks.length} tasks\n`);

    // Fetch comments for all tasks
    const allComments = [];

    for (const task of tasks) {
      console.log(`💬 Checking comments for: "${task.name}"`);
      const stories = await client.getTaskStories(task.gid);

      // Filter for actual comments
      const comments = stories.filter(s => s.type === 'comment' && s.text);

      if (comments.length > 0) {
        for (const comment of comments) {
          allComments.push({
            taskName: task.name,
            text: comment.text,
            createdAt: comment.created_at,
            date: new Date(comment.created_at)
          });
        }
        console.log(`  └─ Found ${comments.length} comment(s)`);
      } else {
        console.log(`  └─ No comments`);
      }
    }

    // Sort all comments by date (most recent first)
    allComments.sort((a, b) => b.date - a.date);

    console.log('\n========================================');
    console.log('📊 LAST 3 COMMENTS FROM BRAD\'S TASKS:');
    console.log('========================================\n');

    const last3 = allComments.slice(0, 3);

    if (last3.length === 0) {
      console.log('❌ No comments found on any of Brad\'s tasks');
    } else {
      last3.forEach((comment, i) => {
        console.log(`${i + 1}. Task: "${comment.taskName}"`);
        console.log(`   Date: ${comment.date.toLocaleString()}`);
        console.log(`   Comment: "${comment.text.substring(0, 100)}${comment.text.length > 100 ? '...' : ''}"`);
        console.log('');
      });
    }

    console.log(`\nTotal comments found: ${allComments.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getBradComments();
