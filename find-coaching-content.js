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

async function explore() {
  console.log('Fetching all projects...');
  const projects = await req('/workspaces/237098990512572/projects?limit=100');
  console.log('Found ' + projects.data.length + ' projects\n');
  
  const interesting = [];
  
  for (let i = 0; i < Math.min(projects.data.length, 30); i++) {
    const p = projects.data[i];
    console.log((i+1) + '. ' + p.name + ' (ID: ' + p.gid + ')');
    
    try {
      const detail = await req('/projects/' + p.gid + '?opt_fields=name,notes,archived');
      const tasks = await req('/projects/' + p.gid + '/tasks?limit=5');
      const taskCount = tasks.data ? tasks.data.length : 0;
      
      if (taskCount > 0) {
        console.log('   Tasks: ' + taskCount);
        
        if (detail.data.notes && detail.data.notes.length > 50) {
          console.log('   Project notes: ' + detail.data.notes.length + ' chars');
          interesting.push({
            project: p.name,
            projectId: p.gid,
            type: 'project_notes',
            length: detail.data.notes.length
          });
        }
        
        const sample = tasks.data[0];
        if (sample) {
          const taskDetail = await req('/tasks/' + sample.gid + '?opt_fields=name,notes');
          const stories = await req('/tasks/' + sample.gid + '/stories');
          const comments = stories.data ? stories.data.filter(s => s.type === 'comment' && s.text) : [];
          
          if (taskDetail.data.notes && taskDetail.data.notes.length > 50) {
            console.log('   Task notes: ' + taskDetail.data.notes.length + ' chars');
            interesting.push({
              project: p.name,
              projectId: p.gid,
              type: 'task_notes',
              length: taskDetail.data.notes.length
            });
          }
          
          if (comments.length > 0) {
            console.log('   Comments: ' + comments.length);
            interesting.push({
              project: p.name,
              projectId: p.gid,
              type: 'comments',
              count: comments.length
            });
          }
        }
      }
      
    } catch (e) {
      console.log('   Error: ' + e.message);
    }
    
    console.log('');
    await new Promise(r => setTimeout(r, 250));
  }
  
  console.log('\n\nProjects with content:');
  const uniqueProjects = [...new Set(interesting.map(i => i.projectId))];
  uniqueProjects.forEach(pid => {
    const items = interesting.filter(i => i.projectId === pid);
    const proj = items[0].project;
    console.log('\n  ' + proj + ':');
    items.forEach(item => {
      if (item.type === 'project_notes') {
        console.log('    - Project notes (' + item.length + ' chars)');
      } else if (item.type === 'task_notes') {
        console.log('    - Task notes (' + item.length + ' chars)');
      } else if (item.type === 'comments') {
        console.log('    - ' + item.count + ' comments');
      }
    });
  });
  
  fs.writeFileSync('interesting-projects.json', JSON.stringify(interesting, null, 2));
  console.log('\n\nSaved to interesting-projects.json');
}

explore().catch(console.error);
