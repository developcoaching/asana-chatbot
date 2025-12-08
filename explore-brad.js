
const https = require('https');
const fs = require('fs');
require('dotenv').config();

const ASANA_TOKEN = process.env.ASANA_API_TOKEN;
const BRAD_PROJECT_ID = '1199409624394854';

function asanaRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'app.asana.com',
      path: '/api/1.0' + endpoint,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + ASANA_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
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

async function explore() {
  const data = { project: null, sections: [], tasks: [], taskDetails: [], comments: [] };
  
  console.log('Fetching project...');
  const proj = await asanaRequest('/projects/' + BRAD_PROJECT_ID);
  data.project = proj.data;
  
  console.log('Fetching sections...');
  const secs = await asanaRequest('/projects/' + BRAD_PROJECT_ID + '/sections');
  data.sections = secs.data || [];
  
  console.log('Fetching tasks...');
  const tasks = await asanaRequest('/projects/' + BRAD_PROJECT_ID + '/tasks?limit=100&opt_fields=name,notes,completed');
  data.tasks = tasks.data || [];
  
  console.log('Fetching ' + data.tasks.length + ' task details...');
  for (let i = 0; i < data.tasks.length; i++) {
    const task = data.tasks[i];
    console.log('  [' + (i+1) + '/' + data.tasks.length + '] ' + task.name);
    const detail = await asanaRequest('/tasks/' + task.id + '?opt_fields=name,notes,html_notes');
    data.taskDetails.push(detail.data);
    
    const stories = await asanaRequest('/tasks/' + task.id + '/stories');
    const comments = (stories.data || []).filter(s => s.type === 'comment' && s.text);
    if (comments.length > 0) {
      console.log('    ' + comments.length + ' comments');
      data.comments.push({ taskId: task.id, taskName: task.name, comments: comments });
    }
    
    await new Promise(r => setTimeout(r, 150));
  }
  
  fs.writeFileSync('brad-goodridge-data.json', JSON.stringify(data, null, 2));
  console.log('Saved to brad-goodridge-data.json');
}

explore().catch(e => console.error(e));
