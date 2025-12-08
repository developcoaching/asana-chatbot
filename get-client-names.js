// Quick script to get real client names from Asana
require('dotenv').config();
const AsanaClient = require('./src/asana-client');

async function getClientNames() {
  const client = new AsanaClient();

  try {
    const projects = await client.getAllProjects();

    // Filter for likely client names (First Last format)
    const clientNames = projects
      .map(p => p.name)
      .filter(name => {
        // Must have at least two words
        const words = name.trim().split(/\s+/);
        if (words.length < 2) return false;

        // First word should start with capital (first name)
        if (!/^[A-Z]/.test(words[0])) return false;

        // Second word should start with capital (last name)
        if (!/^[A-Z]/.test(words[1])) return false;

        // Filter out template/utility projects
        if (name.includes('Template') || name.includes('Roadmap') ||
            name.includes('Visual') || name.includes('Tasks')) return false;

        return true;
      })
      .slice(0, 5);  // Get first 5 client names

    console.log('\n=== CLIENT NAMES FOUND ===');
    clientNames.forEach((name, i) => {
      const firstName = name.split(' ')[0];
      console.log(`${i + 1}. ${name} (first name: "${firstName}")`);
    });
    console.log('\n');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

getClientNames();
