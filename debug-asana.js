const https = require('https');
require('dotenv').config();

const ASANA_TOKEN = process.env.ASANA_API_TOKEN;

// Helper function for API calls with full response logging
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

    console.log(`\n🔌 API Call: ${method} ${endpoint}`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          console.log(`📊 Status: ${res.statusCode}`);
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          console.log(`❌ Parse Error: ${e.message}`);
          console.log(`Raw response: ${data.substring(0, 200)}`);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function debug() {
  console.log('🔍 Asana API Debug\n');

  try {
    // 1. Check token validity with user info
    console.log('═'.repeat(60));
    console.log('1️⃣  USER INFO');
    console.log('═'.repeat(60));
    const userInfo = await asanaRequest('/users/me');
    console.log('✅ User Details:');
    console.log(JSON.stringify(userInfo, null, 2));

    const userId = userInfo.data.id;

    // 2. Check workspaces
    console.log('\n' + '═'.repeat(60));
    console.log('2️⃣  WORKSPACES');
    console.log('═'.repeat(60));
    const workspacesResponse = await asanaRequest('/workspaces');
    console.log('📋 Workspaces:');
    console.log(JSON.stringify(workspacesResponse, null, 2));

    // 3. Check for user's projects
    console.log('\n' + '═'.repeat(60));
    console.log('3️⃣  USER\'S PROJECTS');
    console.log('═'.repeat(60));
    const userProjectsResponse = await asanaRequest(`/users/${userId}/projects`);
    console.log('📋 User Projects:');
    console.log(JSON.stringify(userProjectsResponse, null, 2));

    // 4. Check for portfolios
    console.log('\n' + '═'.repeat(60));
    console.log('4️⃣  PORTFOLIOS');
    console.log('═'.repeat(60));
    const portfoliosResponse = await asanaRequest(`/portfolios`);
    console.log('📋 Portfolios:');
    console.log(JSON.stringify(portfoliosResponse, null, 2));

    // 5. Check tasks assigned to user
    console.log('\n' + '═'.repeat(60));
    console.log('5️⃣  TASKS ASSIGNED TO USER');
    console.log('═'.repeat(60));
    const tasksResponse = await asanaRequest(`/tasks?assignee=${userId}&limit=5`);
    console.log('📋 Tasks:');
    console.log(JSON.stringify(tasksResponse, null, 2));

    // 6. Check for any projects (filtered)
    console.log('\n' + '═'.repeat(60));
    console.log('6️⃣  ALL PROJECTS (FILTERED)');
    console.log('═'.repeat(60));
    const allProjectsResponse = await asanaRequest(`/projects?archived=false&limit=10`);
    console.log('📋 Projects:');
    console.log(JSON.stringify(allProjectsResponse, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

debug();
