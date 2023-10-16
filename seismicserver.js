// index.js
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);

const serverIo = require("socket.io")(server); // Initialize Socket.IO for server-side communication
const clientIo = require("socket.io-client"); // Import socket.io-client for client-side communication

let stationSocket;

app.use(express.static(__dirname + "/public"));

const globalData = [];
let isLogging = false;
let intervalId;

const savedData = {
  active: false,
  station: "Choose station and press submit to see data",
  threshold: 2000,
};

const desiredLength = 500;
const initialDelay = 40;
const feedbackFactor = 0.03;
const smoothingFactor = 0.2;

let currentDelay = initialDelay;

function subscribeToStation(stationId) {
  console.log("subscribed to station: " + stationId);
  stationSocket = clientIo("https://orfeus-eu.org", {
    path: "/socket.io",
    transports: ["websocket", "polling"],
  });

  stationSocket.on("connect", function () {
    console.log("Connected to orfeus-eu.org server");
    stationSocket.emit("subscribe", stationId);
  });

  stationSocket.on("record", async function (data) {
    const values = data.data;
    globalData.push(...values);

    if (globalData.length >= desiredLength && !isLogging) {
      isLogging = true;
      startLogging();
    }

    adjustDelay();
  });
}

// Function to adjust the delay based on globalData length
function adjustDelay() {
  const currentLength = globalData.length;
  const delta = desiredLength - currentLength;

  // Calculate a new delay based on the feedback mechanism
  const newDelay = initialDelay + delta * feedbackFactor;

  // Smoothly adjust the delay using a simple moving average
  currentDelay =
    currentDelay * (1 - smoothingFactor) + newDelay * smoothingFactor;

  // Clear the existing interval and set a new one with the adjusted delay
  clearInterval(intervalId);
  if (isLogging) {
    intervalId = setInterval(logDataContinuously, currentDelay);
  }
}

// Function to start logging data
function startLogging() {
  // Clear the existing interval (if any)
  clearInterval(intervalId);

  // Start logging data
  intervalId = setInterval(logDataContinuously, currentDelay);
}

let previousValue = null;

function logDataContinuously() {
  if (globalData.length > 0) {
    const currentValue = globalData.shift(); // Remove and get the first value

    if (previousValue !== null) {
      const diff = Math.abs(currentValue - previousValue);
      console.log("Data: ", currentValue);

      if (diff > savedData.threshold) {
        // console.log("Data: ", currentValue);
        serverIo.emit("data", currentValue);
      }
    }

    previousValue = currentValue;
  }
}

// function logDataContinuously() {
//   if (globalData.length > 0) {
//     const value = globalData.shift(); // Remove and get the first value
//     // console.log("Data: " + value);
//     // console.log(globalData.length);

//     // Check if the value is below -1000 or above 1000 before logging
//     if (value < -3000 || value > 3000) {
//       console.log("Data: ", value);
//       // Emit data to connected clients here
//       serverIo.emit("data", value);
//     }
//   }
// }

// Serve the HTML file
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Socket.IO connection handling for server-side communication
serverIo.on("connection", (socket) => {
  console.log("A user connected to the server");
  socket.emit("initApp", savedData);
  // console.log(savedData)
  socket.on("disconnect", () => {
    console.log("User disconnected from the server");
  });

  socket.on("updateServer", (data) => {
    console.log(data);
    if (data.active) {
      console.log(data);
      savedData.active = true;
      savedData.station = data.station;
      savedData.threshold = data.threshold;
      if (stationSocket) {
        stationSocket.close();
      }
      subscribeToStation(data.station);
    } else {
      if (stationSocket) {
        stationSocket.close();
        savedData.active = false;
        console.log("Connection to orfeus-eu.org server closed");
      }
    }
  });
});

// Start the server
server.listen(3002, () => {
  console.log("Server is running on http://localhost:3002");
});

// Your existing code...
function init() {
  if (savedData.active) {
    subscribeToStation(savedData.station);
  }
}

init();
