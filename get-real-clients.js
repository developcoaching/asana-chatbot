// Get real client names from Asana for testing
require('dotenv').config();
const AsanaClient = require('./src/asana-client');

async function getRealClients() {
  const client = new AsanaClient();

  try {
    const projects = await client.getClientProjects();

    // Filter for likely client names (First Last format)
    const clientProjects = projects
      .filter(p => {
        const name = p.name;
        const words = name.trim().split(/\s+/);

        // Must have at least two words
        if (words.length < 2) return false;

        // First word should start with capital (first name)
        if (!/^[A-Z]/.test(words[0])) return false;

        // Second word should start with capital (last name)
        if (!/^[A-Z]/.test(words[1])) return false;

        // Filter out template/utility projects
        const lowerName = name.toLowerCase();
        if (lowerName.includes('template') ||
            lowerName.includes('roadmap') ||
            lowerName.includes('visual') ||
            lowerName.includes('tasks') ||
            lowerName.includes('project template') ||
            lowerName.includes('completed')) {
          return false;
        }

        return true;
      })
      .slice(0, 10);  // Get first 10 client names

    console.log('\n=== REAL CLIENT NAMES FOR TESTING ===\n');
    clientProjects.forEach((project, i) => {
      const firstName = project.name.split(' ')[0];
      console.log(`${i + 1}. Full: "${project.name}" | First: "${firstName}"`);
    });
    console.log('\n');

    // Export for test script
    const firstNames = clientProjects.map(p => p.name.split(' ')[0]).slice(0, 5);
    console.log('First names for test (5 clients):');
    console.log(JSON.stringify(firstNames, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getRealClients();
