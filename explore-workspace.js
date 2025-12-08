const https = require('https');
require('dotenv').config();

const ASANA_TOKEN = process.env.ASANA_API_TOKEN;

// Workspaces from previous debug
const WORKSPACES = {
  'Personal Projects': '498346170860',
  'Develop Coaching': '237098990512572'
};

async function asanaRequest(endpoint, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'app.asana.com',
      path: `/api/1.0${endpoint}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${ASANA_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function explore() {
  console.log('🏢 Exploring Develop Coaching Workspace\n');

  try {
    const workspaceId = WORKSPACES['Develop Coaching'];

    // 1. Get projects in workspace
    console.log('📁 PROJECTS IN "DEVELOP COACHING"\n');
    console.log('═'.repeat(70));
    const projectsResponse = await asanaRequest(`/workspaces/${workspaceId}/projects`);
    const projects = projectsResponse.data || [];

    console.log(`Found ${projects.length} projects:\n`);

    if (projects.length === 0) {
      console.log('No projects found. Checking for sections...\n');
    }

    // Show first 20 projects
    for (let i = 0; i < Math.min(projects.length, 20); i++) {
      const project = projects[i];
      console.log(`${i + 1}. ${project.name}`);
      console.log(`   ID: ${project.gid}`);
      console.log(`   Status: ${project.archived ? 'Archived' : 'Active'}`);
      console.log('');
    }

    if (projects.length > 20) {
      console.log(`... and ${projects.length - 20} more projects\n`);
    }

    // 2. If projects found, explore first one
    if (projects.length > 0) {
      const firstProject = projects[0];
      console.log('\n' + '═'.repeat(70));
      console.log(`📋 EXPLORING FIRST PROJECT: "${firstProject.name}"\n`);

      // Get tasks in project
      const tasksResponse = await asanaRequest(`/projects/${firstProject.gid}/tasks?limit=5`);
      const tasks = tasksResponse.data || [];

      console.log(`Found ${tasks.length} tasks (showing first 5):\n`);

      for (let i = 0; i < Math.min(tasks.length, 5); i++) {
        const task = tasks[i];
        console.log(`${i + 1}. ${task.name}`);
        console.log(`   ID: ${task.gid}`);
        console.log('');
      }

      // Get detailed info on first task
      if (tasks.length > 0) {
        const firstTask = tasks[0];
        console.log('\n' + '═'.repeat(70));
        console.log(`📝 DETAILED TASK STRUCTURE (${firstTask.name})\n`);

        const taskDetailsResponse = await asanaRequest(`/tasks/${firstTask.gid}?opt_fields=*`);
        console.log(JSON.stringify(taskDetailsResponse.data, null, 2));
      }
    }

    // 3. Get custom fields for workspace
    console.log('\n' + '═'.repeat(70));
    console.log('🏷️  CUSTOM FIELDS IN WORKSPACE\n');

    const customFieldsResponse = await asanaRequest(`/workspaces/${workspaceId}/custom_fields`);
    const customFields = customFieldsResponse.data || [];

    console.log(`Found ${customFields.length} custom fields:\n`);

    customFields.forEach(field => {
      console.log(`• ${field.name}`);
      console.log(`  Type: ${field.type}`);
      console.log(`  ID: ${field.gid}`);
      if (field.enum_options && field.enum_options.length > 0) {
        console.log(`  Options: ${field.enum_options.map(o => o.name).join(', ')}`);
      }
      console.log('');
    });

    console.log('\n✅ Exploration complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

explore();
