const socket = io();

const ctx = document.getElementById('live-chart').getContext('2d');
const liveChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], // Store generated timestamps here
        datasets: [{
            label: 'NL.ROLD',
            data: [],
            borderColor: 'blue',
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            lineTension: 0.4, 
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: {
                type: 'time',
                time: {
                    tooltipFormat: 'HH:mm',
                },
            },
            y: {
                min: 'auto',
                max: 'auto',
            },
        },
    },
});

// Function to generate timestamps
function generateTimestamp() {
    return new Date().toISOString();
}

let batchData = []; // Store data points in a batch
const batchSize = 5; // Update the chart every 5 data points

socket.on('data', (data) => {
    const timestamp = generateTimestamp(); // Generate a timestamp for this data point

    console.log('Received data:', data);
    console.log('Generated timestamp:', timestamp);

    batchData.push({ timestamp, data });

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
