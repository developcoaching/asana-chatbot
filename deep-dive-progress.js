require('dotenv').config();
const https = require('https');
const fs = require('fs');

function req(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'app.asana.com',
      path: '/api/1.0' + endpoint,
      headers: {
        'Authorization': 'Bearer ' + process.env.ASANA_API_TOKEN,
        'Content-Type': 'application/json',
      },
    };
    https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve(JSON.parse(data)); });
    }).on('error', reject).end();
  });
}

const progressProjectIds = [
  '1200630862705910',  // 27 comments
  '1202942051797940',  // 18 comments
  '1203227635319901',  // 14 comments
  '1203575790182792',  // 15 comments
  '1200667146969199',  // 6 comments + notes
  '1202079370118630',  // 5 comments
  '1202622327801795'   // 2 comments + notes
];

async function deepDive() {
  const allData = [];
  
  for (const projectId of progressProjectIds) {
    console.log('\n========================================');
    console.log('Exploring Project ID: ' + projectId);
    console.log('========================================\n');
    
    const projectData = {
      projectId: projectId,
      project: null,
      tasks: [],
      allComments: []
    };
    
    try {
      const project = await req('/projects/' + projectId + '?opt_fields=name,notes,owner,created_at');
      projectData.project = project.data;
      console.log('Project: ' + project.data.name);
      console.log('Created: ' + project.data.created_at);
      console.log('Owner: ' + (project.data.owner ? project.data.owner.name || 'N/A' : 'N/A'));
      
      if (project.data.notes && project.data.notes.length > 0) {
        console.log('\nProject Notes:');
        console.log(project.data.notes);
      }
      
      const tasksResp = await req('/projects/' + projectId + '/tasks?limit=100&opt_fields=name,notes,completed,due_on');
      const tasks = tasksResp.data || [];
      console.log('\nFound ' + tasks.length + ' tasks');
      
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        console.log('\n  Task ' + (i+1) + ': ' + task.name);
        
        const taskDetail = await req('/tasks/' + task.gid + '?opt_fields=name,notes,completed,due_on,assignee,created_at,modified_at');
        const stories = await req('/tasks/' + task.gid + '/stories');
        
        const comments = (stories.data || []).filter(s => s.type === 'comment' && s.text && s.text.trim().length > 0);
        
        if (taskDetail.data.notes && taskDetail.data.notes.length > 0) {
          console.log('    Notes (' + taskDetail.data.notes.length + ' chars):');
          console.log('    ' + taskDetail.data.notes.substring(0, 200));
          if (taskDetail.data.notes.length > 200) {
            console.log('    ...(truncated)');
          }
        }
        
        if (comments.length > 0) {
          console.log('    Comments: ' + comments.length);
          comments.forEach((comment, idx) => {
            console.log('\n      Comment ' + (idx+1) + ' by ' + (comment.created_by ? comment.created_by.name : 'Unknown'));
            console.log('      Date: ' + comment.created_at);
            console.log('      ---');
            console.log('      ' + comment.text);
            console.log('      ---');
          });
        }
        
        projectData.tasks.push({
          id: task.gid,
          name: task.name,
          notes: taskDetail.data.notes || '',
          comments: comments
        });
        
        projectData.allComments = projectData.allComments.concat(comments.map(c => ({
          taskName: task.name,
          comment: c
        })));
        
        await new Promise(r => setTimeout(r, 150));
      }
      
      allData.push(projectData);
      
    } catch (e) {
      console.log('Error: ' + e.message);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  fs.writeFileSync('coaching-content-full.json', JSON.stringify(allData, null, 2));
  console.log('\n\n========================================');
  console.log('Data saved to coaching-content-full.json');
  console.log('========================================');
}

deepDive().catch(console.error);
