const socket = io();
let state = false;
let savedData = {};
const ctx = document.getElementById("live-chart").getContext("2d");
let liveChart = initializeLiveChart("");

document.getElementById("submitButton").addEventListener("click", function () {
  const stationSelect = document.getElementById("stationSelect");
  stationSelect.style.display = "none";

  const submitButton = document.getElementById("submitButton");
  submitButton.style.display = "none";

  const thresholdInput = document.getElementById("thresholdInput");
  thresholdInput.style.display = "none";

  const stopButton = document.getElementById("stopButton");
  stopButton.style.display = "block";

  const newData = {
    active: true,
    station: stationSelect.value,
    threshold: thresholdInput.value,
  };
  // Send user input to the server
  socket.emit("updateServer", newData);

  // Update the label of the dataset in liveChart
  liveChart.data.datasets[0].label = stationSelect.value;

  // Update the chart to reflect the changes
  liveChart.update();
});

document.getElementById("stopButton").addEventListener("click", function () {
  savedData.active = false;
  const stationSelect = document.getElementById("stationSelect");
  stationSelect.style.display = "block";

  const thresholdInput = document.getElementById("thresholdInput");
  thresholdInput.style.display = "block";

  const submitButton = document.getElementById("submitButton");
  submitButton.style.display = "block";

  const stopButton = document.getElementById("stopButton");
  stopButton.style.display = "none";

  const newData = { active: false, station: "" };

  // Send user input to the server
  socket.emit("updateServer", newData);

  // Update the label of the dataset in liveChart
  liveChart.data.datasets[0].label =
    "Choose station and press submit to see data";

  // Update the chart to reflect the changes
  liveChart.update();
});

// Listen for data from the server
socket.on("initApp", (savedData) => {
  const stationSelect = document.getElementById("stationSelect");
  const submitButton = document.getElementById("submitButton");
  const stopButton = document.getElementById("stopButton");
  const thresholdInput = document.getElementById("thresholdInput");
  thresholdInput.value = savedData.threshold;

  console.log(`Received data from the server: ${savedData}`);

  if (savedData.active) {
    stationSelect.style.display = "none";
    submitButton.style.display = "none";
    thresholdInput.style.display = "none";
    stopButton.style.display = "block";
  } else {
    stationSelect.style.display = "block";
    submitButton.style.display = "block";
    thresholdInput.style.display = "block";
    stopButton.style.display = "none";
  }

  console.log(savedData.station);
  liveChart.data.datasets[0].label = savedData.station;
  liveChart.update();
});

function getStations() {
  // Ajax request to get ODC stations
  $.ajax({
    dataType: "text",
    method: "GET",
    url: "https://orfeus-eu.org/fdsnws/station/1/query?level=station&format=text",
    success: function (json) {
      markers = new Array();

      json = json.split("\n").slice(1, -1).map(rewriteJSON);

      // Go over all stations
      for (var i = 0; i < json.length; i++) {
        var station = json[i];

        if (station.end && new Date(station.end) < Date.now()) {
          // Skip stations that are not operational
          continue;
        }

        // Create an option for the operational station
        var option = document.createElement("option");
        option.value = station.net + "." + station.sta;
        option.text = station.net + "." + station.sta;
        stationSelect.appendChild(option);
        // console.log(station);
      }
    },
  });
}

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

function initializeLiveChart(label) {
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: [], // Store generated timestamps here
      datasets: [
        {
          label, // Initialize with the provided label
          data: [],
          borderColor: "blue",
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          lineTension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: "time",
          time: {
            tooltipFormat: "HH:mm",
          },
        },
        y: {
          min: "auto",
          max: "auto",
        },
      },
    },
  });
}

// Function to generate timestamps
function generateTimestamp() {
  return new Date().toISOString();
}

let batchData = []; // Store data points in a batch
const batchSize = 5; // Update the chart every 5 data points

socket.on("data", (data) => {
  const timestamp = generateTimestamp(); // Generate a timestamp for this data point
  console.log("Received data:", data);
  console.log("Generated timestamp:", timestamp);
  batchData.push({ timestamp, data });
  document.getElementById("dataElement").innerText = data;
  if (batchData.length >= batchSize) {
    // Update the chart with the batch of data points
    batchData.forEach((point) => {
      liveChart.data.labels.push(point.timestamp);
      liveChart.data.datasets[0].data.push(point.data);
    });
    if (liveChart.data.labels.length > 500) {
      // Remove excess data points (last 100)
      const removeCount = liveChart.data.labels.length - 500;
      liveChart.data.labels.splice(0, removeCount);
      liveChart.data.datasets[0].data.splice(0, removeCount);
    }
    // Update the chart
    liveChart.update();
    // Clear the batch
    batchData = [];
  }
});

// Your existing code...
function init() {}

init();

document.addEventListener("DOMContentLoaded", function () {
  getStations();
});
