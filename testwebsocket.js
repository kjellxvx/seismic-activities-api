const WebSocket = require('ws');

// Replace with the actual WebSocket URL
const serverUrl = 'ws://www.wistoff.de:3002';

const client = new WebSocket(serverUrl);

client.on('open', () => {
  console.log('Connected to the WebSocket server');
  
  // You can send data to the server after establishing the connection, if needed
  // client.send('Hello, server!');
});

client.on('message', (data) => {
  console.log(`Received data: ${data}`);
  // Handle the received data here
});

client.on('error', (error) => {
  console.error(`WebSocket error: ${error.message}`);

  // Additional error handling logic can be added here
  if (error.message === 'getaddrinfo ENOTFOUND www.wistoff.de') {
    console.error('Check if the server URL is correct.');
  } else if (error.message === 'connect ECONNREFUSED 127.0.0.1:3002') {
    console.error('Make sure the WebSocket server is running and listening on the specified port.');
  }
});

client.on('close', (code, reason) => {
  console.log(`WebSocket connection closed with code ${code} and reason: ${reason}`);
  // You can implement reconnection logic here if needed
});

// You can also send data to the server using the client.send() method
// client.send('Hello, server!');

// Handle graceful exit or any other logic here
process.on('SIGINT', () => {
  if (client.readyState === WebSocket.OPEN) {
    client.close();
  }
  console.log('WebSocket connection closed due to SIGINT');
  process.exit();
});
