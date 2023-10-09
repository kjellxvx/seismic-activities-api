const express = require("express");
const http = require("http");
const WebSocket = require("ws"); // Use the 'ws' library for WebSocket handling

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname + "/public"));

const globalData = [];
let isLogging = false;
let intervalId;

const desiredLength = 5000;
const initialDelay = 40;
const feedbackFactor = 0.03;
const smoothingFactor = 0.2;

let currentDelay = initialDelay;

function rewriteJSON(x) {
  let parameters = x.split("|");

  return {
    net: parameters[0],
    sta: parameters[1],
    lat: Number(parameters[2]),
    lon: Number(parameters[3]),
    desc: parameters[5],
    start: parameters[6],
    end: parameters[7],
  };
}

// WebSocket connection handling for all clients
wss.on("connection", (socket) => {
  console.log("A user connected to the WebSocket server");

  // Handle incoming WebSocket messages
  socket.on("message", (message) => {
    console.log(`Received message: ${message}`);
    // Handle the received message here
  });

  socket.on("close", () => {
    console.log("User disconnected from the WebSocket server");
  });
});

// Function to start the server
function startServer() {
  server.listen(3002, () => {
    console.log("Server is running on http://localhost:3002");
  });
}

// Start the server
startServer();
