// Test the new concise coaching format
const http = require('http');

function testNewFormat() {
  const postData = JSON.stringify({
    message: 'How is Brad doing?',
    sessionId: 'format-test-' + Date.now()
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('\n=== NEW COACHING FORMAT TEST ===\n');
        console.log('Question: "How is Brad doing?"\n');
        console.log('Response:\n');
        console.log(response.response);
        console.log('\n================================\n');
      } catch (error) {
        console.error('Error parsing response:', error.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error.message);
  });

  req.write(postData);
  req.end();
}

testNewFormat();
