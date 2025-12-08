const fetch = require('node-fetch');

const questions = [
  "Give me a status update for Brad",
  "From the roadmap we implemented, where is he right now?",
  "What are the problems that he could face in the future?"
];

async function testQuestion(question, sessionId) {
  console.log('\n' + '='.repeat(80));
  console.log('QUESTION:', question);
  console.log('='.repeat(80));

  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: question,
      sessionId: sessionId
    })
  });

  const data = await response.json();
  console.log('\nRESPONSE:');
  console.log(data.response);
  console.log('\n');
}

async function runTests() {
  const sessionId = 'test-coaching-' + Date.now();

  console.log('\n🎯 TESTING COACHING RESPONSE GENERATOR');
  console.log('Session ID:', sessionId);

  for (const question of questions) {
    await testQuestion(question, sessionId);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between questions
  }

  console.log('✅ All tests complete!');
}

runTests().catch(console.error);
