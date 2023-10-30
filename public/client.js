const socket = io()
let state = false
let savedData = {}
const ctx = document.getElementById('live-chart').getContext('2d')
let liveChart = initializeLiveChart('')

document.getElementById('submitButton').addEventListener('click', function () {
  const submitButton = document.getElementById('submitButton')
  submitButton.style.display = 'none'

  document.getElementById('stationSelect').disabled = true
  document.getElementById('thresholdInput').disabled = true
  document.getElementById('stepsInput').disabled = true
  document.getElementById('dataLength').disabled = true

  const stopButton = document.getElementById('stopButton')
  stopButton.style.display = 'block'

  const newData = {
    active: true,
    station: stationSelect.value,
    threshold: thresholdInput.value,
    stepSize: stepsInput.value,
    dataLength: dataLength.value
  }
  // Send user input to the server
  socket.emit('updateServer', newData)

  savedData = newData

  // Update the label of the dataset in liveChart
  liveChart.data.datasets[0].label = stationSelect.value

  // Update the chart to reflect the changes
  liveChart.update()
})

document.getElementById('stopButton').addEventListener('click', function () {
  savedData.active = false

  document.getElementById('stationSelect').disabled = false
  document.getElementById('thresholdInput').disabled = false
  document.getElementById('stepsInput').disabled = false
  document.getElementById('dataLength').disabled = false

  document.getElementById('dataContainer').style.display = 'none'
  document.getElementById('loadingContainer').style.display = 'none'

  const submitButton = document.getElementById('submitButton')
  submitButton.style.display = 'block'

  const stopButton = document.getElementById('stopButton')
  stopButton.style.display = 'none'

  const newData = { active: false, station: '' }

  // Send user input to the server
  socket.emit('updateServer', newData)

  // Update the label of the dataset in liveChart
  liveChart.data.datasets[0].label =
    'Choose station and press submit to see data'

  // Update the chart to reflect the changes
  liveChart.update()
})

// Listen for data from the server
socket.on('initApp', data => {
  savedData = data
  const stationSelect = document.getElementById('stationSelect')
  const submitButton = document.getElementById('submitButton')
  const stopButton = document.getElementById('stopButton')
  const thresholdInput = document.getElementById('thresholdInput')
  thresholdInput.value = savedData.threshold

  const stepsInput = document.getElementById('stepsInput')
  stepsInput.value = savedData.stepSize

  const dataLength = document.getElementById('dataLength')
  dataLength.value = savedData.dataLength

  // console.log(`Received data from the server: ${savedData}`);

  if (savedData.active) {
    submitButton.style.display = 'none'
    stationSelect.disabled = true
    thresholdInput.disabled = true
    stepsInput.disabled = true
    dataLength.disabled = true
    stopButton.style.display = 'block'
  } else {
    submitButton.style.display = 'block'
    stationSelect.disabled = false
    thresholdInput.disabled = false
    stepsInput.disabled = false
    dataLength.disabled = false
    stopButton.style.display = 'none'
  }

  // console.log(savedData.station);
  liveChart.data.datasets[0].label = savedData.station
  liveChart.update()
})

async function getStations () {
  // Wrap the AJAX call in a Promise
  const ajaxPromise = new Promise((resolve, reject) => {
    $.ajax({
      dataType: 'text',
      method: 'GET',
      url: 'https://orfeus-eu.org/fdsnws/station/1/query?level=station&format=text',
      success: function (json) {
        markers = new Array()

        json = json.split('\n').slice(1, -1).map(rewriteJSON)

        for (var i = 0; i < json.length; i++) {
          var station = json[i]

          if (station.end && new Date(station.end) < Date.now()) {
            // Skip stations that are not operational
            continue
          }

          var option = document.createElement('option')
          option.value = station.net + '.' + station.sta
          option.text = station.net + '.' + station.sta
          stationSelect.appendChild(option)
        }
        resolve()
      },
      error: function (error) {
        reject(error)
      }
    })
  })

  try {
    await ajaxPromise
    var selectElement = document.getElementById('stationSelect')
    var optionValue = 'NL.ROLD'
    selectElement.value = optionValue
  } catch (error) {
    console.error('Error loading stations:', error)
  }
}

function rewriteJSON (x) {
  let parameters = x.split('|')

  return {
    net: parameters[0],
    sta: parameters[1],
    lat: Number(parameters[2]),
    lon: Number(parameters[3]),
    desc: parameters[5],
    start: parameters[6],
    end: parameters[7]
  }
}

function initializeLiveChart (label) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [], // Store generated timestamps here
      datasets: [
        {
          label, // Initialize with the provided label
          data: [],
          borderColor: 'blue',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          lineTension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: 'time',
          time: {
            tooltipFormat: 'HH:mm'
          }
        },
        y: {
          min: 'auto',
          max: 'auto'
        }
      }
    }
  })
}

// Function to generate timestamps
function generateTimestamp () {
  return new Date().toISOString()
}

let batchData = [] // Store data points in a batch
const batchSize = 200 // Update the chart every 50 data points

socket.on('data', data => {
  const timestamp = generateTimestamp() // Generate a timestamp for this data point
  const currentValue = data.currentValue
  batchData.push({ timestamp, currentValue })

  document.getElementById('currentValue').innerText = currentValue
  document.getElementById('maxValue').innerText = data.maxValue
  document.getElementById('minValue').innerText = data.minValue
  document.getElementById('averageValue').innerText = data.averageValue

  if (batchData.length >= batchSize) {
    // Update the chart with the batch of data points
    batchData.forEach(point => {
      liveChart.data.labels.push(point.timestamp)
      liveChart.data.datasets[0].data.push(point.currentValue)
    })
    if (liveChart.data.labels.length > 1000) {
      const removeCount = liveChart.data.labels.length - 1000
      liveChart.data.labels.splice(0, removeCount)
      liveChart.data.datasets[0].data.splice(0, removeCount)
    }
    // Update the chart
    liveChart.update()
    // Clear the batch
    batchData = []
  }
})

socket.on('info', data => {
  document.getElementById('dataAmount').innerText = data
  document.getElementById('dataGoal').innerText = savedData.dataLength
  if (data >= savedData.dataLength) {
    document.getElementById('dataContainer').style.display = 'flex'
    document.getElementById('loadingContainer').style.display = 'none'
  } else {
    document.getElementById('dataContainer').style.display = 'none'
    document.getElementById('loadingContainer').style.display = 'flex'
  }
})

// Your existing code...
function init () {}

init()

document.addEventListener('DOMContentLoaded', function () {
  getStations()
  document.getElementById('dataContainer').style.display = 'none'
  document.getElementById('loadingContainer').style.display = 'none'
})
