const https = require('https');
const fs = require('fs');
require('dotenv').config();

const ASANA_TOKEN = process.env.ASANA_API_TOKEN;
const BASE_URL = 'https://app.asana.com/api/1.0';

// Helper function for API calls
async function asanaRequest(endpoint, method = 'GET', body = null) {
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

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function explore() {
  console.log('🔍 Exploring Asana workspace structure...\n');

  try {
    // 1. Get user info
    console.log('📋 Fetching user information...');
    const userInfo = await asanaRequest('/users/me');
    const userId = userInfo.data.id;
    const userEmail = userInfo.data.email;
    console.log(`✅ User: ${userEmail}\n`);

    // 2. Get all teams
    console.log('🏢 Fetching teams...');
    const teamsResponse = await asanaRequest('/teams');
    const teams = teamsResponse.data || [];
    console.log(`✅ Found ${teams.length} team(s)\n`);

    if (teams.length === 0) {
      console.log('No teams found. Trying to get projects directly...\n');
    }

    // 3. For each team, get projects
    let allProjects = [];

    if (teams.length > 0) {
      for (const team of teams) {
        console.log(`\n📁 Team: ${team.name} (ID: ${team.id})`);
        console.log('─'.repeat(50));

        const projectsResponse = await asanaRequest(`/teams/${team.id}/projects`);
        const projects = projectsResponse.data || [];

        console.log(`Found ${projects.length} projects:\n`);
        allProjects = allProjects.concat(projects);

        // Get details for each project
        for (let i = 0; i < Math.min(projects.length, 10); i++) {
          const project = projects[i];
          console.log(`  ${i + 1}. ${project.name}`);
          console.log(`     ID: ${project.id}`);
          console.log(`     Archived: ${project.archived}`);

          // Get tasks count and custom fields
          try {
            const tasksResponse = await asanaRequest(`/projects/${project.id}/tasks?limit=1`);
            const taskCount = tasksResponse.data ? tasksResponse.data.length : 0;
            console.log(`     Tasks: ~${taskCount} (sample)`);

            // Get project details including custom fields
            const projectDetails = await asanaRequest(`/projects/${project.id}`);
            if (projectDetails.data && projectDetails.data.custom_fields && projectDetails.data.custom_fields.length > 0) {
              console.log(`     Custom Fields:`);
              projectDetails.data.custom_fields.forEach(field => {
                console.log(`       - ${field.name} (${field.type})`);
              });
            }
          } catch (e) {
            console.log(`     (Could not fetch task details)`);
          }
          console.log('');
        }

        if (projects.length > 10) {
          console.log(`  ... and ${projects.length - 10} more projects`);
        }
      }
    } else {
      // Fallback: Get all projects directly
      console.log('📁 Fetching projects directly...\n');
      const projectsResponse = await asanaRequest('/projects');
      allProjects = projectsResponse.data || [];

      console.log(`Found ${allProjects.length} projects:\n`);

      for (let i = 0; i < Math.min(allProjects.length, 10); i++) {
        const project = allProjects[i];
        console.log(`  ${i + 1}. ${project.name}`);
        console.log(`     ID: ${project.id}`);
        console.log(`     Archived: ${project.archived}\n`);
      }

      if (allProjects.length > 10) {
        console.log(`  ... and ${allProjects.length - 10} more projects`);
      }
    }

    // 4. Get custom fields schema
    console.log('\n\n📊 Workspace Custom Fields');
    console.log('─'.repeat(50));
    try {
      const customFieldsResponse = await asanaRequest('/custom_fields');
      const customFields = customFieldsResponse.data;
      console.log(`Found ${customFields.length} custom fields:\n`);

      customFields.forEach(field => {
        console.log(`• ${field.name}`);
        console.log(`  Type: ${field.type}`);
        console.log(`  ID: ${field.id}`);
        if (field.enum_options) {
          console.log(`  Options: ${field.enum_options.map(o => o.name).join(', ')}`);
        }
        console.log('');
      });
    } catch (e) {
      console.log('Could not fetch workspace custom fields');
    }

    // 5. Sample task to see structure
    console.log('\n📝 Sample Task Structure');
    console.log('─'.repeat(50));
    try {
      if (allProjects.length > 0) {
        const projectId = allProjects[0].id;
        const tasksResponse = await asanaRequest(`/projects/${projectId}/tasks?limit=1&opt_fields=name,description,custom_fields,notes,projects,assignee,due_on,completed`);

        if (tasksResponse.data && tasksResponse.data.length > 0) {
          console.log('Sample Task:');
          console.log(JSON.stringify(tasksResponse.data[0], null, 2));
        } else {
          console.log('No tasks found in first project');
        }
      } else {
        console.log('No projects found to sample');
      }
    } catch (e) {
      console.log('Could not fetch sample task:', e.message);
    }

    console.log('\n✅ Exploration complete!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

explore();
