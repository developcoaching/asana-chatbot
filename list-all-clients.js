require('dotenv').config();
const AsanaClient = require('./src/asana-client');

async function listAllClients() {
  const client = new AsanaClient();
  const projects = await client.getClientProjects();

  console.log(`\nTotal projects: ${projects.length}\n`);
  console.log('First 20 project names:\n');

  projects.slice(0, 20).forEach((project, index) => {
    console.log(`${index + 1}. ${project.name}`);
  });
}

listAllClients().catch(console.error);
