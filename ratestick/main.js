// Define constants
const caseFolder = 'output-petn-30-granite-5'; // output folder name from Ratestick
const explosive = 'PETN';
const confiner = 'Granite'; // Set NA in case of unconfined
const air = 'Air';

const explosive_y_radius = 30;
const confiner_y_width = 5;
const filetype = 'png'; // 'pdf'

// Global variables for data and coordinates
let time, end_time, frame_count, advance_x, time_contour;
let densityValues, x_coords, y_coords, xmin, xmax, ymin, ymax;
let confiner_loc, explosive_loc, explosive_prod_loc, air_loc;


const plasmaColorscale = [
    [0.0, '#0d0887'],
    [0.1, '#41049d'],
    [0.2, '#6a00a8'],
    [0.3, '#8f0da4'],
    [0.4, '#b12a90'],
    [0.5, '#cc4778'],
    [0.6, '#e16462'],
    [0.7, '#f2844b'],
    [0.8, '#fca636'],
    [0.9, '#f6d644'],
    [1.0, '#f0f921']
];

const RdBu_rColorscale = [
    [0.0, '#053061'],  // Deep Blue
    [0.1, '#2166ac'],  // Dark Blue
    [0.2, '#4393c3'],  // Blue
    [0.3, '#92c5de'],  // Light Blue
    [0.4, '#d1e5f0'],  // Very Light Blue
    [0.5, '#f7f7f7'],  // White (Neutral)
    [0.6, '#fdbeb7'],  // Very Light Orange
    [0.7, '#f4a582'],  // Light Orange
    [0.8, '#d6604d'],  // Orange Red
    [0.9, '#b2182b'],  // Light Red
    [1.0, '#67001f']   // Deep Red
];

// const whites = [0.5, 'rgb(247, 247, 247)'];
const whites = [
    [0.0, '#f7f7f7'],
    [0.1, '#f7f7f7'],
    [0.2, '#f7f7f7'],
    [0.3, '#f7f7f7'],
    [0.4, '#f7f7f7'],
    [0.5, '#f7f7f7'],
    [0.6, '#f7f7f7'],
    [0.7, '#f7f7f7'],
    [0.8, '#f7f7f7'],
    [0.9, '#f7f7f7'],
    [1.0, '#f7f7f7']
];



// Function to convert a hex color to RGB
function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    return [r, g, b];
}

// Function to get the color from the colorscale
function getColorFromScale(value, colorscale) {
    for (let i = 0; i < colorscale.length - 1; i++) {
        if (value >= colorscale[i][0] && value <= colorscale[i + 1][0]) {
            // Linear interpolation between the two colors
            const t = (value - colorscale[i][0]) / (colorscale[i + 1][0] - colorscale[i][0]);
            const startColor = hexToRgb(colorscale[i][1]);
            const endColor = hexToRgb(colorscale[i + 1][1]);
            const r = Math.round(startColor[0] + t * (endColor[0] - startColor[0]));
            const g = Math.round(startColor[1] + t * (endColor[1] - startColor[1]));
            const b = Math.round(startColor[2] + t * (endColor[2] - startColor[2]));
            return [r, g, b];
        }
    }
    return [0, 0, 0]; // Fallback to black if something goes wrong
}

// Function to normalize a value between 0 and 1
function normalize(value, min, max) {
    return (value - min) / (max - min);
}

// Function to calculate luminance from RGB
function calculateLuminance(rgb) {
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    // return 0.299 * r + 0.587 * g + 0.114 * b;
    return (r + g + b)/3;
    // return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // return Math.sqrt(0.299 * Math.pow(r, 2) + 0.587 * Math.pow(g, 2) + 0.114 * Math.pow(b, 2));
}

// Function to get the appropriate text color based on luminance
function get_text_color(x, y, values, xmin, xmax, ymin, ymax, cmap) {
    const xIndex = Math.floor((x - xmin) / (xmax - xmin) * values[0].length);
    const yIndex = Math.floor((y - ymin) / (ymax - ymin) * values.length);
    const valueAtPoint = values[yIndex][xIndex];

    const normalizedValue = normalize(valueAtPoint, Math.min(...values.flat()), Math.max(...values.flat()));
    const rgb = getColorFromScale(normalizedValue, cmap);

    const luminance = calculateLuminance(rgb);
    return luminance < 0.5 ? 'white' : 'black';
}

// Function to load CSV data
function loadCSV(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            callback(xhr.responseText);
        }
    };
    xhr.send();
}

// Function to process CSV data into arrays
function processCSV(data) {
    var rows = data.trim().split('\n');
    return rows.map(row => row.trim().split(/\s+/).map(value => {
        const num = parseFloat(value);
        return isNaN(num) ? null : num; // Return null for non-numeric values
    }));
}

// Function to generate linearly spaced arrays (equivalent to np.linspace)
function linspace(start, end, num) {
    var arr = [];
    var step = (end - start) / (num - 1);
    for (var i = 0; i < num; i++) {
        arr.push(start + (step * i));
    }
    return arr;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////
// Load and process data
function loadData() {
    // Load constants
    loadCSV(`${caseFolder}/Plotting_constants.dat`, function(response) {
        const constants = processCSV(response);
        const [time, end_time, frame_count, advance_x, time_contour] = constants[1] || [0, 0, 0, 0, 0];
        
        console.log('Time:', time, 'End Time:', end_time, 'Frame Count:', frame_count, 'Advance X:', advance_x, 'Time Contour:', time_contour);

        // Load density data
        loadCSV(`${caseFolder}/density.dat`, function(response) {
            const densityValues = processCSV(response);
            console.log('Density Values:', densityValues);

            // Load z1 data
            loadCSV(`${caseFolder}/z1.dat`, function(response) {
                const z1Values = processCSV(response);
                console.log('Z1 Values:', z1Values);

                // Load pressure data
                loadCSV(`${caseFolder}/pressure.dat`, function(response) {
                    const pressureValues = processCSV(response);
                    console.log('Pressure Values:', pressureValues);

                    // Define variables based on loaded data
                    const ymin = 0;
                    const ymax = explosive_y_radius + confiner_y_width + 15;
                    let xmin = frame_count * advance_x;
                    let xmax = xmin + 3 * advance_x;

                    // Redefine xmax based on dx, if available
                    const dx = 0.5; // Uncomment and define dx if needed
                    if (dx) {
                        // xmax = xmin + densityValues.length * dx;
                    }

                    // Generate coordinates
                    const x_coords = linspace(xmin, xmax, densityValues[0].length);
                    const y_coords = linspace(ymin, ymax, densityValues.length);

                    // Define legend positions
                    const confiner_loc       = [xmin+(xmax-xmin)*0.8,explosive_y_radius+(confiner_y_width/2)];
                    const explosive_loc      = [xmin+(xmax-xmin)*0.8,explosive_y_radius/2];
                    const explosive_prod_loc = [xmin+(xmax-xmin)*0.2,explosive_y_radius/2];
                    const air_loc            = [xmin+(xmax-xmin)*0.8,(ymax-ymin+(explosive_y_radius+confiner_y_width))/2];

                    // Now create the plots
                    createDensityPlot(time, x_coords, y_coords, densityValues, xmin, xmax, ymin, ymax, confiner_loc, explosive_loc, explosive_prod_loc, air_loc);
                    createPressurePlot(time, x_coords, y_coords, pressureValues, z1Values, xmin, xmax, ymin, ymax, confiner_loc, explosive_loc, explosive_prod_loc, air_loc);
                });
            });
        });
    });
}

// Function to create a simple plot for verification
function createPlot(data, title) {
    const x = data.map(row => row[0]);
    const y = data.map(row => row[1]);

    var trace = {
        x: x,
        y: y,
        mode: 'markers',
        type: 'scatter'
    };

    var plotData = [trace];

    var layout = {
        title: title,
        xaxis: { title: 'X' },
        yaxis: { title: 'Y' }
    };

    Plotly.newPlot('plot', plotData, layout);
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////
// Function to create the density plot
function createDensityPlot(time, x_coords, y_coords, densityValues, xmin, xmax, ymin, ymax, confiner_loc, explosive_loc, explosive_prod_loc, air_loc) {

    const density_cmap = plasmaColorscale;

    var fig = {
        data: [],
        layout: {}
    };

    fig.data.push({
        z: densityValues,
        x: x_coords,
        y: y_coords,
        type: 'contour',
        colorscale: plasmaColorscale,
        contours: {
            start: Math.min(...densityValues.flat()),
            end: Math.max(...densityValues.flat()),
            size: (Math.max(...densityValues.flat()) - Math.min(...densityValues.flat())) / 200
        },
        colorbar: {
            title: {
                text: 'Density [10³ kg/m³]',
                side: 'right'
            }
        },
        line: {
            smoothing: 0.85,
            width: 0
        },
        hovertemplate: '<b>Density</b><br>[10³ kg/m³]: %{z}<extra></extra><br>x [mm]: %{x}<br>y [mm]: %{y}'
    });

    const annotations = [
        {
            x: air_loc[0],
            y: air_loc[1],
            text: `${air}`,
            showarrow: false,
            font: {
                size: 28,
                color: get_text_color(air_loc[0], air_loc[1], densityValues, xmin, xmax, ymin, ymax, density_cmap),
                family: 'Times New Roman'
            }
        },
        {
            x: explosive_loc[0],
            y: explosive_loc[1],
            text: `${explosive}`,
            showarrow: false,
            font: {
                size: 28,
                color: get_text_color(explosive_loc[0], explosive_loc[1], densityValues, xmin, xmax, ymin, ymax, density_cmap),
                family: 'Times New Roman'
            }
        },
        {
            x: explosive_prod_loc[0],
            y: explosive_prod_loc[1],
            text: `${explosive}<br>products`,
            showarrow: false,
            font: {
                size: 28,
                color: get_text_color(explosive_prod_loc[0], explosive_prod_loc[1], densityValues, xmin, xmax, ymin, ymax, density_cmap),
                family: 'Times New Roman'
            }
        }
    ];

    if (confiner !== 'NA') {
        annotations.push({
            x: confiner_loc[0],
            y: confiner_loc[1],
            text: `${confiner}`,
            showarrow: false,
            font: {
                size: 28,
                color: get_text_color(confiner_loc[0], confiner_loc[1], densityValues, xmin, xmax, ymin, ymax, density_cmap),
                family: 'Times New Roman'
            }
        });
    }

    fig.layout = {
        title: `Time = ${time} μs`,
        xaxis: {
            title: 'X [mm]',
            range: [xmin, xmax]
        },
        yaxis: {
            title: {
                text: 'Y [mm]',
                automargin: true  // Automatically adjust margin for the title
            },
            range: [ymin, ymax]
        },
        font: {
            family: 'Times New Roman',
            size: 22
        },
        width: 800,
        height: 600,
        annotations: annotations,
        margin: {
            l: 70,  // Increase the left margin to provide more space
            r: 5,
            t: 50,
            b: 70
        }
    };

    Plotly.newPlot('plot_density', fig.data, fig.layout);

    // Plotly.toImage('plot_density', { format: filetype, width: 800, height: 600, scale: 2 })
    //     .then(function (imageData) {
    //         var a = document.createElement('a');
    //         a.href = imageData;
    //         a.download = `density.${filetype}`;
    //         document.body.appendChild(a);
    //         a.click();
    //         document.body.removeChild(a);
    //     });
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function createPressurePlot(time, x_coords, y_coords, pressureValues, z1Values, xmin, xmax, ymin, ymax, confiner_loc, explosive_loc, explosive_prod_loc, air_loc) {
    
    const pressure_cmap = RdBu_rColorscale;// 'RdBu_r' colorscale

    var fig = {
        data: [],
        layout: {}
    };

    // Add the pressure contour trace
    fig.data.push({
        z: pressureValues,
        x: x_coords,
        y: y_coords,
        type: 'contour',
        colorscale: RdBu_rColorscale,
        contours: {
            start: Math.min(...pressureValues.flat()),
            end: Math.max(...pressureValues.flat()),
            size: (Math.max(...pressureValues.flat()) - Math.min(...pressureValues.flat())) / 200
        },
        colorbar: {
            title: {
                text: 'Pressure [GPa]',
                side: 'right'
            }
        },
        line: {
            smoothing: 0.85,
            width: 0
        },
        hovertemplate: '<b>Pressure</b><br>[GPa]: %{z}<extra></extra><br>x [mm]: %{x}<br>y [mm]: %{y}'
    });

    // Add the specific contour line for z1 = 0.5 with a custom color
    fig.data.push({
        z: z1Values,
        x: x_coords,
        y: y_coords,
        type: 'contour',
        colorscale: whites,
        contours: {
            start: 0.5,
            end: 0.5,
            size: 0.01,
            coloring: 'lines'
        },
        line: {
            color: 'black',
            width: 2
        },
        showscale: false,
        hoverinfo: 'skip'
    });

    // Add text annotations
    const annotations = [
        {
            x: air_loc[0],
            y: air_loc[1],
            text: `${air}`,
            showarrow: false,
            font: {
                size: 28,
                color: get_text_color(air_loc[0], air_loc[1], pressureValues, xmin, xmax, ymin, ymax, pressure_cmap),
                family: 'Times New Roman'
            }
        },
        {
            x: explosive_loc[0],
            y: explosive_loc[1],
            text: `${explosive}`,
            showarrow: false,
            font: {
                size: 28,
                color: get_text_color(explosive_loc[0], explosive_loc[1], pressureValues, xmin, xmax, ymin, ymax, pressure_cmap),
                family: 'Times New Roman'
            }
        },
        {
            x: explosive_prod_loc[0],
            y: explosive_prod_loc[1],
            text: `${explosive}<br>products`,
            showarrow: false,
            font: {
                size: 28,
                color: get_text_color(explosive_prod_loc[0], explosive_prod_loc[1], pressureValues, xmin, xmax, ymin, ymax, pressure_cmap),
                family: 'Times New Roman'
            }
        }
    ];

    // Add confiner annotation if confiner is not 'NA'
    if (confiner !== 'NA') {
        annotations.push({
            x: confiner_loc[0],
            y: confiner_loc[1],
            text: `${confiner}`,
            showarrow: false,
            font: {
                size: 28,
                color: get_text_color(confiner_loc[0], confiner_loc[1], pressureValues, xmin, xmax, ymin, ymax, pressure_cmap),
                family: 'Times New Roman'
            }
        });
    }

    // Set layout parameters
    fig.layout = {
        title: `Time = ${time} μs`,
        xaxis: {
            title: 'X [mm]',
            range: [xmin, xmax]
        },
        yaxis: {
            title: {
                text: 'Y [mm]',
                automargin: true  // Automatically adjust margin for the title
            },
            range: [ymin, ymax]
        },
        font: {
            family: 'Times New Roman',
            size: 22
        },
        width: 800,
        height: 600,
        annotations: annotations,
        margin: {
            l: 70,  // Increase the left margin to provide more space
            r: 5,
            t: 50,
            b: 70
        }
    };

    // Plot the figure
    Plotly.newPlot('plot_pressure', fig.data, fig.layout);

    // Save the plot as an image if needed
    // Plotly.toImage('plot_pressure', { format: filetype, width: 800, height: 600, scale: 2 })
    //     .then(function (imageData) {
    //         var a = document.createElement('a');
    //         a.href = imageData;
    //         a.download = `pressure.${filetype}`;
    //         document.body.appendChild(a);
    //         a.click();
    //         document.body.removeChild(a);
    //     });
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Load and process VoD data
function loadVoDData() {
    loadCSV(`${caseFolder}/VoD.dat`, function(response) {
        const VoD_data = processCSV(response);
        console.log('VoD Data:', VoD_data);

        // Calculate the running average
        const window_size = 20;
        const running_average = calculateRunningAverage(VoD_data, window_size);

        // Calculate mean VoD for the last 1/6th of the data
        const mean_vod = calculateMeanVoD(VoD_data);

        // Now create the VoD plot
        createVoDPlot(VoD_data, running_average, mean_vod);
    });
}

// Function to calculate running average
function calculateRunningAverage(data, windowSize) {
    const averagedData = [];
    for (let i = 0; i < data.length; i++) {
        if (i < windowSize - 1) {
            averagedData.push(null); // Not enough data points for a full window
        } else {
            const window = data.slice(i - windowSize + 1, i + 1).map(d => d[1]);
            const windowSum = window.reduce((a, b) => a + b, 0);
            averagedData.push(windowSum / windowSize);
        }
    }
    return averagedData;
}

// Function to calculate mean VoD for the last 1/6th of the data
function calculateMeanVoD(data) {
    const last_sixth = Math.floor(data.length * 5 / 6);
    const last_sixth_data = data.slice(last_sixth).map(d => d[1]);
    const mean_vod = last_sixth_data.reduce((a, b) => a + b, 0) / last_sixth_data.length;
    return mean_vod.toFixed(2); // Round to 2 decimal places
}

// Function to create the VoD plot
function createVoDPlot(VoD_data, running_average, mean_vod) {
    var fig = {
        data: [],
        layout: {}
    };

    // Add instantaneous VoD trace
    fig.data.push({
        x: VoD_data.map(d => d[0]),
        y: VoD_data.map(d => d[1]),
        mode: 'lines',
        line: { color: 'grey', width: 0.5 },
        name: 'Instantaneous VoD',
        hovertemplate: '[Km/s]: %{y}<br>t [µs]: %{x}',
        hoverinfo: 'x+y' // Show hover info only when close to a data point
    });

    // Add running average VoD trace
    fig.data.push({
        x: VoD_data.map(d => d[0]),
        y: running_average,
        mode: 'lines',
        line: { color: 'royalblue', width: 2 },
        name: 'Running Average VoD',
        hovertemplate: '[Km/s]: %{y}<br>t [µs]: %{x}',
        hoverinfo: 'x+y'
    });

    // Add mean VoD trace
    fig.data.push({
        x: VoD_data.map(d => d[0]),
        y: Array(VoD_data.length).fill(mean_vod),
        mode: 'lines',
        line: { color: 'black', width: 1, dash: 'dash' },
        name: `VoD = ${mean_vod} Km/s`,
        hovertemplate: 't [µs]: %{x}',
        hoverinfo: 'x+y'
    });

    // Set layout parameters
    fig.layout = {
        title: 'VoD',
        xaxis: {
            title: 'Time [µs]',
            range: [0, VoD_data[VoD_data.length - 1][0]]
        },
        yaxis: {
            title: 'VoD [Km/s]'
        },
        font: {
            family: 'Times New Roman',
            size: 20
        },
        legend: {
            orientation: 'h',
            yanchor: 'bottom',
            y: 1.02,
            xanchor: 'right',
            x: 1
        },
        width: 800,
        height: 600,
        hovermode: 'closest', // Only show hover info when the cursor is close to a point
        hoverdistance: 18, // Pixels from the data point
        spikedistance: 18   // Same for the spike
    };

    // Plot the figure
    Plotly.newPlot('plot_vod', fig.data, fig.layout);

    // // Save the plot as an image if needed
    // Plotly.toImage('plot_vod', { format: filetype, width: 800, height: 600, scale: 2 })
    //     .then(function (imageData) {
    //         var a = document.createElement('a');
    //         a.href = imageData;
    //         a.download = `VOD.${filetype}`;
    //         document.body.appendChild(a);
    //         a.click();
    //         document.body.removeChild(a);
    //     });
}


// Start loading data when the page loads
document.addEventListener('DOMContentLoaded', loadData);

// Start loading VoD data when the page loads
document.addEventListener('DOMContentLoaded', loadVoDData);
