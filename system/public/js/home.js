import { getDatabase, ref, onValue, query, limitToLast, orderByChild, startAt, set, } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

//latest agriknows 2026-06-03

const firebaseConfig = {
    apiKey: "AIzaSyCq4lH4tj4AS9-cqvM29um--Nu4v2UdvZw",
    authDomain: "agriknows-data.firebaseapp.com",
    databaseURL: "https://agriknows-data-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "agriknows-data",
    storageBucket: "agriknows-data.firebasestorage.app",
    messagingSenderId: "922008629713",
    appId: "1:922008629713:web:5cf15ca9d47036b9a8f0f0"
};
//--------popup------------
function showPopup(message) {
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");
    const popupText = document.getElementById("popup-text");

    popupText.innerHTML = message;

    popup.classList.remove("hidden");
    overlay.classList.remove("hidden");


    document.getElementById("popup-btn").addEventListener("click", () => {
        document.getElementById("popup").classList.add("hidden");
        document.getElementById("overlay").classList.add("hidden");
    });
}
window.showPopup = showPopup;

//-------------------------------------Firebase Initialization--------------------

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const database = getDatabase(app);
const db = getDatabase(app);
const dbPath = 'sensorData';



function preventBack() {
    window.history.forward();
}
// 1. Modern replacement for onunload
window.addEventListener('pagehide', (event) => {
    console.log("Cleaning up session view...");
});

// 2. The proper way to handle the "Back" button after logout
window.onload = function() {
    if (typeof window.history.pushState === "function") {
        window.history.pushState("jt656", null, null);
        window.onpopstate = function() {
            window.history.pushState('jt656', null, null);
            // Optional: Force a redirect to login if they try to go back
            window.location.href = "/login"; 
        };
    }
};

//-------------------------------------Global Variables let---------------------------
let devices = [];
let currentPumpStatus = 'off';
let deviceIdCounter = 1;
// **NEW**: Global object to hold all crop data (predefined + custom)
let allCropData = {};
// **NEW**: Variable to track the currently selected crop key
let currentCropKey = null;
let latestHistoryData = []; // Store data for graphs
let chartInstances = {};    // Store Chart.js instances to manage updates

// Crop data with optimal environmental conditions (Predefined part)
const PREDEFINED_CROP_DATA = {
    corn: {
        name: "Corn",
        temperature: { min: 18, max: 30 },
        moisture: { min: 50, max: 70 },
        ph: { min: 5.8, max: 7.0 },
        humidity: { min: 50, max: 70 },
    },
    rice: {
        name: "Rice",
        temperature: { min: 20, max: 35 },
        moisture: { min: 70, max: 90 },
        ph: { min: 5.0, max: 6.5 },
        humidity: { min: 70, max: 85 },
    },
    eggplant: {
        name: "Eggplant",
        temperature: { min: 20, max: 30 },
        moisture: { min: 60, max: 80 },
        ph: { min: 5.5, max: 6.8 },
        humidity: { min: 50, max: 70 },
    },
    tomato: {
        name: "Tomato",
        temperature: { min: 18, max: 27 },
        moisture: { min: 60, max: 80 },
        ph: { min: 5.5, max: 6.8 },
        humidity: { min: 65, max: 85 },
    },
    onion: {
        name: "Onion",
        temperature: { min: 15, max: 30 },
        moisture: { min: 60, max: 80 },
        ph: { min: 6.0, max: 7.0 },
        humidity: { min: 50, max: 70 },
    }
};

//user input crop selector

function listenToSelectedCrop(cropId) {
    const cropRef = ref(database, `Crop/${cropId}`);

    onValue(cropRef, (snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.val();

        // Convert Firebase data to your existing structure
        allCropData[cropId] = {
            name: data.customCropName || "Custom Crop",
            temperature: { min: data.tempMin, max: data.tempMax },
            moisture: { min: data.moistureMin, max: data.moistureMax },
            humidity: { min: data.humidityMin, max: data.humidityMax },
            ph: { min: data.phMin, max: data.phMax }
        };

        currentCropKey = cropId;

        console.log("Crop ranges loaded from Firebase:", allCropData[cropId]);
    });
}

function selectCropFromFirebase(cropId) {
    listenToSelectedCrop(cropId);
    localStorage.setItem("selectedCropId", cropId);
}

//------------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    initDashboard();
});


onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, so we can now safely call the function
        console.log("User is signed in. Fetching data...");
        listenToFirebaseData();
    } else {
        // User is signed out. Redirect to login page or display a message.
        console.log("User is signed out. Redirecting...");
        // Example: window.location.replace('/pages/login.html');
        // You can leave this out if your login page handles the unauthenticated state.
    }
});


//----------------------------------------KASALUKUYANG STATUS------------------------------- 

/**
 * Updates the current reading cards on the dashboard with the latest data.
 * @param {Object} sensorData - The full object of sensor readings from Firebase.
 */
function updateCurrentReadings(sensorData) {
    if (!sensorData) {
        console.log("No data available to update current readings.");
        return;
    }

    // --- 1. Get Data Values ---
    // Handle cases where keys might be lowercase or capitalized based on your previous file usage
    const temp = (sensorData.temperature > 0) ? sensorData.temperature : "--";
    const moisture = (sensorData.moisture > 0 || sensorData.soilMoisture > 0) ? (sensorData.moisture || sensorData.soilMoisture) : "--";
    const humidity = (sensorData.humidity > 0) ? sensorData.humidity : "--";
    const ph = (sensorData.ph > 0 || sensorData.pH > 0) ? (sensorData.ph || sensorData.pH) : "--";
    const light = sensorData.light || sensorData.light_status || 0;

    // --- 2. Update Numeric Values in HTML ---
    document.getElementById('current-temperature').textContent = temp === "--" ? "-- °C" : `${temp} °C`;
    document.getElementById('current-soil-moisture').textContent = moisture === "--" ? "-- %" : `${moisture}%`;
    document.getElementById('current-humidity').textContent = humidity === "--" ? "-- %" : `${humidity}%`;
    document.getElementById('current-ph-level').textContent = ph === "--" ? "-- pH" : `${ph} pH`;

    // --- 3. Update Text Status (The Logic) ---
    // We get the settings for the currently selected crop
    const currentCrop = allCropData[currentCropKey];

    if (currentCrop) {
        // Temperature Status
        updateStatusElement('status-temp-text', temp, currentCrop.temperature.min, currentCrop.temperature.max, "Celsius");
        // Humidity Status
        updateStatusElement('status-humidity-text', humidity, currentCrop.humidity.min, currentCrop.humidity.max, "%");
        // pH Status
        updateStatusElement('status-ph-text', ph, currentCrop.ph.min, currentCrop.ph.max, "pH");
        // Moisture Status (Reusing your specific logic or generic logic)
        updateStatusElement('status-moisture-text', moisture, currentCrop.moisture.min, currentCrop.moisture.max, "%");
    } else {
        // If no crop selected, just show "No Crop Selected"
        document.querySelectorAll('.status-message').forEach(el => {
            el.textContent = "Pumili ng Pananim";
            el.className = "status-message status-warning";
        });
    }
    // --- 4. Light Status Update ---
    // Assuming 1 = Bright/Light, 0 = Dark
    const lightText = (light == 1 || light === 'Light') ? "Maliwanag" : "Madilim";
    const lightClass = (light == 1 || light === 'Light') ? "status-good" : "status-warning";

    const lightEl = document.getElementById('light-status');
    const lightStatEl = document.getElementById('status-light-text');

    if (lightEl) lightEl.textContent = light === 1 ? "Light" : "Dark";
    if (lightStatEl) {
        lightStatEl.textContent = lightText;
        lightStatEl.className = `status-message ${lightClass}`;
    }
    // Run your existing soil status logic for the side-panel if needed
    updateSoilMoistureStatus(moisture);
}

// ---------------------Helper Function to Determine Status--------------------
function updateStatusElement(elementId, value, min, max, unit) {
    const element = document.getElementById(elementId);
    if (!element || value === "--") return;

    let text = "";
    let className = "status-message";

    const now = Date.now();

    if (value < min) {
        text = "Mababa";
        className += " status-warning";

        // 🔔 POPUP (Below Min)
        if (!lastPopupTime[elementId] || now - lastPopupTime[elementId] > POPUP_COOLDOWN) {
            showPopup(
                `⚠ <b>Babala!</b><br>
                 Ang kasalukuyang halaga (<b>${value}${unit}</b>) ay mas mababa kaysa sa itinakdang minimum (<b>${min}${unit}</b>).`
            );
            lastPopupTime[elementId] = now;
        }

    } else if (value > max) {
        text = "Mataas";
        className += " status-danger";

        // 🔔 POPUP (Above Max)
        if (!lastPopupTime[elementId] || now - lastPopupTime[elementId] > POPUP_COOLDOWN) {
            showPopup(
                `🚨 <b>Babala!</b><br>
                 Ang kasalukuyang halaga (<b>${value}${unit}</b>) ay mas mataas kaysa sa itinakdang maximum (<b>${max}${unit}</b>).`
            );
            lastPopupTime[elementId] = now;
        }

    } else {
        text = "Mainam";
        className += " status-good";
    }

    element.textContent = text;
    element.className = className;
}

//-------------------------------------Initialize Dashboard-----------------------------
function initDashboard() {
    updateCurrentDate();
    loadAllCropData(); // **MODIFIED**: Load crop data (including custom) from storage
    initializeEventListeners();
    updateSoilMoistureStatus(42);
    updateLightStatus(1); // Set initial status to Light (1)
    initializePumpControls(); // **MODIFIED**: Initializes pump state from storage
    listenToFirebaseData();
}
//--------------------------------Firebase Data------------------------------------------
function listenToFirebaseData() {
    const dataRef = ref(database, 'sensorData');
    const readingsQuery = query(dataRef, limitToLast(50));

    onValue(readingsQuery, (snapshot) => {
        console.log("Firebase Data Received:", snapshot.val());
        
        if (snapshot.exists()) {
            let historyDataArray = [];

            // 1. Maintain Firebase chronological order for history array
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                data.id = childSnapshot.key;
                historyDataArray.push(data);
            });

            // 2. Update Global Variables for the Graph
            // We save the array here so updateAllCharts() can access it
            latestHistoryData = historyDataArray;

            // 3. Update the Table (Reverse so newest data is at the top)
            const tableData = [...historyDataArray].reverse();
            updateHistoryTable(tableData);

            // 4. Update Charts (FIXED: calling correct function name)
            // This calls the function defined on line 666
            updateAllCharts();

            // 5. HEARTBEAT LOGIC (Real-time Status)
            const latestReading = historyDataArray[historyDataArray.length - 1];
            const currentTime = Date.now();
            
            // Handle both numeric timestamps and string formats
            const dataTime = typeof latestReading.timestamp === 'number' 
                             ? latestReading.timestamp 
                             : new Date(latestReading.timestamp).getTime();
            
            const fiveMinutes = 5 * 60 * 1000;

            if (currentTime - dataTime > fiveMinutes) {
                // Device hasn't sent data in 5 minutes
                showOfflineState();
            } else {
                // Device is active, update the UI cards
                updateCurrentReadings(latestReading);
            }
        } else {
            showOfflineState();
        }
    }, (error) => {
        console.error("Firebase History Data Listener Error: ", error);
    });
}

// Function to reset display when hardware is disconnected
function showOfflineState() {
    const ids = ['current-temperature', 'current-soil-moisture', 'current-humidity', 'current-ph-level'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "--";
    });

    // Update status text indicators
    document.querySelectorAll('.status-message').forEach(el => {
        el.textContent = "Offline";
        el.style.color = "#e74c3c"; // Red
    });
}
// Use the existing 'db' instance
// The listener that runs every time data changes
//DONT ERASE THIS MUNA
//const readingsRef = query(ref(db, 'sensorData'), limitToLast(20));
/*onValue(readingsRef, (snapshot) => {
    let historyDataArray = [];
    // ... rest of your snapshot.forEach and data processing ...

    snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        data.id = childSnapshot.key;
        historyDataArray.push(data);
    });

    historyDataArray.reverse();
    // ** NEW LINE: Save data to global variable for the graphs **
    latestHistoryData = historyDataArray;

    if (historyDataArray.length > 0) {
        const latestReading = historyDataArray[0];
        updateCurrentReadings(latestReading);
        //updateSoilMoistureStatus(latestReading.soilMoisture); 
    }
    updateHistoryTable(historyDataArray);

    // ** NEW BLOCK: Update graphs if they are visible **
    const graphContainer = document.getElementById('history-graph');
    if (graphContainer && !graphContainer.classList.contains('hidden')) {
        updateAllCharts();
    }

}, (error) => {
    console.error("Firebase History Data Listener Error: ", error);
});*/

//-------------------------------History Table Time-------------------------------
/**
 * Formats a Firebase timestamp (milliseconds) into a compact, readable date and time.
 * @param {number} timestamp - The timestamp in milliseconds.
 * @returns {string} The formatted date and time string (e.g., "11/27/2025, 7:46:54 PM").
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);

    // Use Intl.DateTimeFormat for a compact and precise output (Date and Time)
    const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true // Ensures AM/PM display
    });

    return formatter.format(date);
}

function updateHistoryTable(dataArray) {
    const tableBody = document.getElementById('history-data');
    if (!tableBody) {
        console.warn("Table body element with ID 'history-data' not found.");
        return;
    }

    tableBody.innerHTML = ''; // Clear previous data

    // If dataArray is empty, the table will simply be empty.
    dataArray.forEach(data => {
        // Use the 'timestamp' from Firebase (e.g., "2025-11-26 20:13:35")
        const rawTime = data.timestamp || data.id;

        // 💡 CRITICAL: If formatTimestamp is missing or buggy, the loop stops here!
        let timeString = formatTimestamp(rawTime);

        const row = document.createElement('tr');

        // Inserting data into the table row using the correct Firebase keys
        row.innerHTML = `
            <td>${timeString}</td>
            <td>${data.soilMoisture || 'N/A'}%</td>  
            <td>${data.humidity || 'N/A'}%</td>                       
            <td>${data.temperature || 'N/A'}°C</td>                   
            <td>${data.light || 'N/A'}</td>                         
            <td>${data.pH || 'N/A'} pH</td>              
        `;
        tableBody.appendChild(row);
    });
}


// --- NEW: Function to update the top cards with the latest reading ---
function updateCurrentStatusCards(latestData) {
    document.querySelector('.reading-card .temperature + .value').textContent = `${latestData.temperature || 'N/A'} °C`;
    document.querySelector('.reading-card .moisture + .value').textContent = `${latestData.moisture || latestData.soilMoisture || 'N/A'} %`;
    document.querySelector('.reading-card .ph + .value').textContent = `${latestData.ph || latestData.phLevel || 'N/A'} pH`;
    document.querySelector('.reading-card .humidity + .value').textContent = `${latestData.humidity || 'N/A'}%`;

    // Update Soil Moisture Status Text
    updateSoilMoistureStatus(latestData.moisture || latestData.soilMoisture || 0);

    // Update Light Status (Assuming 1 is Light, 0 is Dark)
    const lightVal = latestData.light === 1 || latestData.light === 'Light' ? 1 : 0;
    updateLightStatus(lightVal);
}

function updateLightStatus(status) {
    const lightValueElement = document.getElementById('light-status');
    const lightOptimalElement = document.getElementById('lightOptimal');

    // **CRITICAL FIX**: Check if the elements exist before attempting to set properties
    if (!lightValueElement) {
        console.warn("Element 'light-status' not found for light status update.");
        return; // Exit if the main element isn't there
    }

    if (status === 0) {
        lightValueElement.textContent = 'Dark';
    } else {
        lightValueElement.textContent = 'Light';
    }

    // Clear the optimal text since it's no longer needed
    if (lightOptimalElement) { // <-- This check prevents the error on line 294
        lightOptimalElement.textContent = ' ';
    }
}
function updateCurrentDate() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    document.getElementById('current-date').textContent =
        now.toLocaleDateString('en-US', options);
}
// **NEW FUNCTION** to load custom crops from localStorage
function loadAllCropData() {
    const customCropsJson = localStorage.getItem('customCrops');
    const customCrops = customCropsJson ? JSON.parse(customCropsJson) : {};

    // Merge predefined crops and custom crops
    allCropData = { ...PREDEFINED_CROP_DATA, ...customCrops };

    // Check if a crop was previously selected and is still valid
    const lastSelectedCropKey = localStorage.getItem('selectedCropKey');
    if (lastSelectedCropKey && allCropData[lastSelectedCropKey]) {
        setCrop(lastSelectedCropKey, allCropData[lastSelectedCropKey]);
    } else {
        // Fallback or initial state
        setCrop('none', {
            name: "No crop selected",
            temperature: { min: 0, max: 0 },
            moisture: { min: 0, max: 0 },
            ph: { min: 0, max: 0 },
            humidity: { min: 0, max: 0 },
        });
    }
}
// **NEW FUNCTION** to save custom crops to localStorage
function saveCustomCrops(customCrops) {
    localStorage.setItem('customCrops', JSON.stringify(customCrops));

    // Re-merge data to update the in-memory cache
    allCropData = { ...PREDEFINED_CROP_DATA, ...customCrops };
}
// **MODIFIED**: Set crop and update optimal ranges
function setCrop(cropKey, cropInfo) {
    currentCropKey = cropKey;
    localStorage.setItem('selectedCropKey', cropKey); // Save the selected crop key for persistence
    // Update crop display
    document.getElementById('currentCropName').textContent = cropInfo.name;
    document.getElementById('currentCropOptimal').textContent =
        `Optimal: Temp ${cropInfo.temperature.min}-${cropInfo.temperature.max}°C, ` +
        `Moisture ${cropInfo.moisture.min}-${cropInfo.moisture.max}%, ` +
        `pH ${cropInfo.ph.min}-${cropInfo.ph.max}`;
    // Update optimal ranges in cards
    document.getElementById('tempOptimal').textContent =
        `${cropInfo.temperature.min}-${cropInfo.temperature.max}°C`;
    document.getElementById('moistureOptimal').textContent =
        `${cropInfo.moisture.min}-${cropInfo.moisture.max}%`;
    document.getElementById('phOptimal').textContent =
        `${cropInfo.ph.min}-${cropInfo.ph.max}`;
    document.getElementById('humidityOptimal').textContent =
        `${cropInfo.humidity.min}-${cropInfo.humidity.max}%`;
}
function initializeEventListeners() {
    initializeModals();
    initializeTimeFilters();
    initializeGraphMode();
    initializeExportButton();
}

// Modal handling
function initializeModals() {

    // ---  Get all modal elements ---
    const selectCropModal = document.getElementById('selectCropModal');
    const addCropModal = document.getElementById('addCropModal');
    const editDeleteCropModal = document.getElementById('editDeleteCropModal'); // **NEW**

    // --- Get buttons that open modals ---
    const selectCropBtn = document.getElementById('selectCropBtn');
    const addCropBtn = document.getElementById('addCropBtn');
    const deleteCropBtn = document.getElementById('deleteCropBtn'); // **NEW**

    // ---  Get all close buttons ---
    const closeButtons = document.querySelectorAll('.close-modal');

    // ---  Open Modals ---
    // Check if the elements exist before adding listeners
    if (selectCropBtn && selectCropModal) {
        selectCropBtn.addEventListener('click', () => {
            renderCropOptions(); // **MODIFIED**: Render crops before opening
            selectCropModal.style.display = 'flex';
        });
    }

    if (addCropBtn && addCropModal) {
        addCropBtn.addEventListener('click', () => {
            addCropModal.style.display = 'flex';
        });
    }

    // ---  Close Modals (with 'x' buttons) ---
    closeButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            // Find the parent modal and hide it
            event.target.closest('.modal').style.display = 'none';
        });
    });
    // ---  Close Modals (by clicking outside) ---
    window.addEventListener('click', (event) => {
        if (event.target === selectCropModal) {
            selectCropModal.style.display = 'none';
        }
        if (event.target === addCropModal) {
            addCropModal.style.display = 'none';
        }
        if (event.target === editDeleteCropModal) { // **NEW**
            editDeleteCropModal.style.display = 'none';
        }
    });
    // ---  Confirm Crop Selection Button ---
    document.getElementById('confirmCropBtn').addEventListener('click', () => {
        // Find the currently selected crop (which now includes custom ones)
        const selectedOption = document.querySelector('#selectCropModal .crop-option.selected');
        if (selectedOption) {
            const selectedCropKey = selectedOption.getAttribute('data-crop');
            setCrop(selectedCropKey, allCropData[selectedCropKey]);
            selectCropModal.style.display = 'none'; // Hide modal
            document.querySelectorAll('#selectCropModal .crop-option').forEach(o => o.classList.remove('selected')); // Clear selection
        } else {
            alert('Please select a crop');
        }
    });
    // ---  Add Custom Crop Form ---
    document.getElementById('addCropForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const cropName = document.getElementById('customCropName').value;
        const tempMin = parseFloat(document.getElementById('tempMin').value);
        const tempMax = parseFloat(document.getElementById('tempMax').value);
        const moistureMin = parseFloat(document.getElementById('moistureMin').value);
        const moistureMax = parseFloat(document.getElementById('moistureMax').value);
        const phMin = parseFloat(document.getElementById('phMin').value);
        const phMax = parseFloat(document.getElementById('phMax').value);
        const humidityMin = parseFloat(document.getElementById('humidityMin').value);
        const humidityMax = parseFloat(document.getElementById('humidityMax').value);

        // Create custom crop object
        const customCrop = {
            name: cropName,
            temperature: { min: tempMin, max: tempMax },
            moisture: { min: moistureMin, max: moistureMax },
            ph: { min: phMin, max: phMax },
            humidity: { min: humidityMin, max: humidityMax },
            isCustom: true // Mark as custom
        };

        // **NEW LOGIC**: Generate a unique key and save the custom crop
        const customKey = 'custom_' + Date.now();

        const customCropsJson = localStorage.getItem('customCrops');
        let customCrops = customCropsJson ? JSON.parse(customCropsJson) : {};
        customCrops[customKey] = customCrop;

        // Set the new custom crop as the selected one
        setCrop(customKey, customCrop);

        alert(`Custom crop "${cropName}" added and selected!`);
        document.getElementById('addCropForm').reset();
        addCropModal.style.display = 'none'; // Hide modal
    });

    // --- **NEW** Edit Crop Form Submission ---
    document.getElementById('editCropForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const cropKey = document.getElementById('editCropKey').value;
        const cropName = document.getElementById('editCustomCropName').value;
        const tempMin = parseFloat(document.getElementById('editTempMin').value);
        const tempMax = parseFloat(document.getElementById('editTempMax').value);
        const moistureMin = parseFloat(document.getElementById('editMoistureMin').value);
        const moistureMax = parseFloat(document.getElementById('editMoistureMax').value);
        const phMin = parseFloat(document.getElementById('editPhMin').value);
        const phMax = parseFloat(document.getElementById('editPhMax').value);
        const humidityMin = parseFloat(document.getElementById('editHumidityMin').value);
        const humidityMax = parseFloat(document.getElementById('editHumidityMax').value);

        // Update the custom crop object
        const updatedCrop = {
            name: cropName,
            temperature: { min: tempMin, max: tempMax },
            moisture: { min: moistureMin, max: moistureMax },
            ph: { min: phMin, max: phMax },
            humidity: { min: humidityMin, max: humidityMax },
            isCustom: true
        };

        const customCropsJson = localStorage.getItem('customCrops');
        let customCrops = customCropsJson ? JSON.parse(customCropsJson) : {};
        customCrops[cropKey] = updatedCrop;

        if (currentCropKey === cropKey) {
            setCrop(cropKey, updatedCrop); // Re-set the crop to update the main UI
        }

        alert(`Crop "${cropName}" updated successfully!`);
        editDeleteCropModal.style.display = 'none';
        renderCropOptions(); // Re-render the select crop modal
    });

    // --- **NEW** Delete Crop Button Handler ---
    deleteCropBtn.addEventListener('click', () => {
        const cropKey = document.getElementById('editCropKey').value;
        const cropName = document.getElementById('editCustomCropName').value;

        if (confirm(`Are you sure you want to delete the custom crop "${cropName}"? This action cannot be undone.`)) {
            const customCropsJson = localStorage.getItem('customCrops');
            let customCrops = customCropsJson ? JSON.parse(customCropsJson) : {};

            delete customCrops[cropKey]; // Delete from the custom crops object

            // If the deleted crop was currently selected, reset the selection
            if (currentCropKey === cropKey) {
                // Fallback to initial state
                setCrop('none', {
                    name: "No crop selected",
                    temperature: { min: 0, max: 0 },
                    moisture: { min: 0, max: 0 },
                    ph: { min: 0, max: 0 },
                    humidity: { min: 0, max: 0 },
                });
            }

            alert(`Crop "${cropName}" deleted successfully.`);
            editDeleteCropModal.style.display = 'none';
            renderCropOptions(); // Re-render the select crop modal
        }
    });
}

// **NEW FUNCTION** to render all crop options in the modal
function renderCropOptions() {
    const cropGrid = document.querySelector('#selectCropModal .crop-grid');
    cropGrid.innerHTML = ''; // Clear existing content

    // Iterate over all crops (predefined and custom)
    Object.entries(allCropData).forEach(([key, crop]) => {
        // Skip the initial 'none' crop
        if (key === 'none') return;

        const isPredefined = !crop.isCustom;
        const optionDiv = document.createElement('div');
        optionDiv.className = `crop-option ${isPredefined ? '' : 'custom'}`;
        optionDiv.setAttribute('data-crop', key);

        // Add selected class if this crop is currently active
        if (currentCropKey === key) {
            optionDiv.classList.add('selected');
        }

        let innerHTML = `
            <i class="fas fa-seedling crop-icon-small"></i>
            <div class="crop-name-small">${crop.name}</div>
        `;

        // Add edit/delete button only for custom crops
        if (!isPredefined) {
            innerHTML += `
                <div class="crop-actions">
                    <button class="edit-btn" data-key="${key}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            `;
        }

        optionDiv.innerHTML = innerHTML;

        // Event listener for selecting the crop
        optionDiv.addEventListener('click', (e) => {
            // If click target is not an edit/delete button, select the crop
            if (!e.target.closest('.crop-actions button')) {
                document.querySelectorAll('#selectCropModal .crop-option').forEach(o => o.classList.remove('selected'));
                optionDiv.classList.add('selected');
            }
        });

        // Event listener for the Edit button
        if (!isPredefined) {
            const editBtn = optionDiv.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Stop click from propagating to the option div
                    openEditDeleteModal(key);
                });
            }
        }

        cropGrid.appendChild(optionDiv);
    });
}

// **NEW FUNCTION** to open the edit modal
function openEditDeleteModal(cropKey) {
    const crop = allCropData[cropKey];
    const editDeleteCropModal = document.getElementById('editDeleteCropModal');

    if (!crop || !crop.isCustom) return; // Should only open for custom crops

    // Set the hidden key
    document.getElementById('editCropKey').value = cropKey;

    // Set modal title
    document.getElementById('editDeleteCropTitle').textContent = `Edit Crop: ${crop.name}`;

    // Populate form fields
    document.getElementById('editCustomCropName').value = crop.name;
    document.getElementById('editTempMin').value = crop.temperature.min;
    document.getElementById('editTempMax').value = crop.temperature.max;
    document.getElementById('editMoistureMin').value = crop.moisture.min;
    document.getElementById('editMoistureMax').value = crop.moisture.max;
    document.getElementById('editPhMin').value = crop.ph.min;
    document.getElementById('editPhMax').value = crop.ph.max;
    document.getElementById('editHumidityMin').value = crop.humidity.min;
    document.getElementById('editHumidityMax').value = crop.humidity.max;

    // Show the modal
    editDeleteCropModal.style.display = 'flex';
}
//-------------------------------History Table Time Buttons-------------------------------
function initializeTimeFilters() {
    const timeFilters = document.querySelectorAll('.time-filter');
    timeFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            timeFilters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            const timeRange = filter.getAttribute('data-time');
            // loadHistoryData(timeRange);
        });
    });
}
//-------------------------------Export Data Functionality-------------------------------
function initializeExportListeners() {
    // We add a small delay to ensure the DOM has fully parsed the button element.
    // This is the most reliable way to fix the "null" error in complex initialization flows.
    setTimeout(() => {
        const exportButton = document.getElementById('export-button');

        if (exportButton) {
            exportButton.addEventListener('click', () => {
                console.log("Export button clicked.");

                // Get the currently active time range from the buttons
                // Assumes your time range buttons have the class 'time-range-btn'
                const activeButton = document.querySelector('.time-range-btn.active');

                // Default to '24h' if no button is active
                const range = activeButton ? activeButton.getAttribute('data-range') : '24h';

                // Call the function to fetch data and export it
                fetchAndExportData(range);
            });
        } else {
            console.error("ERROR: Export button with ID 'export-button' not found after loading delay.");
        }
    }, 100); // Wait for 100 milliseconds
}
// Make sure this function is called inside your main initialization/DOMContentLoaded block.

//-------------------------------Graph Mode Toggle-------------------------------
function initializeGraphMode() {
    const toggleBtn = document.getElementById('graph-mode-toggle');
    const tableView = document.getElementById('history-table');
    const graphView = document.getElementById('history-graph');

    toggleBtn.addEventListener('click', () => {
        if (tableView.classList.contains('hidden')) {
            // Show Table
            tableView.classList.remove('hidden');
            graphView.classList.add('hidden');
            toggleBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Graph Mode';
        } else {
            // Show Graph
            tableView.classList.add('hidden');
            graphView.classList.remove('hidden');
            toggleBtn.innerHTML = '<i class="fas fa-table"></i> Table Mode';

            // ** Load the charts with real data **
            updateAllCharts();
        }
    });
}
//-------------------------------Export Data Functionality-------------------------------
function initializeExportButton() {
    const exportButton = document.getElementById('export-button');

    // CRITICAL: Checks for null before attaching the listener
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            console.log("Export button successfully clicked.");

            const activeButton = document.querySelector('.time-range-btn.active');
            const range = activeButton ? activeButton.getAttribute('data-range') : '24h';

            // FIX: Use the correct function name: fetchAndExportData
            fetchAndExportData(range); // <--- THIS WAS THE ERROR
        });
    } else {
        console.error("Initialization Error: Export button with ID 'export-button' not found.");
    }
}

function initializePumpControls() {
    const pumpSwitch = document.getElementById('pump-switch');
    const savedStatus = localStorage.getItem('pumpStatus');
    const initialStatus = savedStatus === 'on' ? 'on' : 'off';


    setPumpStatus(initialStatus);


    pumpSwitch.addEventListener('change', function () {
        setPumpStatus(this.checked ? 'on' : 'off');
    });

}
/**
 * Fetches data for the specified time range and exports it as CSV.
 * @param {string} range - The time range ('1h', '6h', '24h', '7d').
 */
async function fetchAndExportData(range) {
    // 1. Calculate the start timestamp (unchanged from previous step)
    const now = Date.now();
    let startTime;
    let fileNameRange = range;

    switch (range) {
        case '1h': startTime = now - (60 * 60 * 1000); break;
        case '6h': startTime = now - (6 * 60 * 60 * 1000); break;
        case '24h':
        default:
            startTime = now - (24 * 60 * 60 * 1000);
            fileNameRange = '24h';
            break;
        case '7d': startTime = now - (7 * 24 * 60 * 60 * 1000); break;
    }

    // 2. Build the query (unchanged)
    const exportQuery = query(
        ref(db, dbPath),
        orderByChild('timestamp'), // REQUIRES your data nodes to have a 'timestamp' field
        startAt(startTime)
    );

    window.showPopup(`Naghahanda ng ${range} data para i-export...`);

    try {
        onValue(exportQuery, (snapshot) => {
            let dataToExport = [];
            snapshot.forEach((childSnapshot) => {
                dataToExport.push(childSnapshot.val());
            });

            if (dataToExport.length === 0) {
                window.showPopup("Walang natagpuang data sa loob ng napiling hanay ng oras.");
                return;
            }

            // 3. Process and export the fetched data
            exportDataToCSV(dataToExport, fileNameRange);

        }, { onlyOnce: true });
    } catch (error) {
        console.error("Error fetching data for export:", error);
        window.showPopup("May error sa pag-fetch ng data.");
    }
}
//------------------------------- Irrigation/Pump Control Functionality-------------------------------
function setPumpStatus(status) {
    const pumpSwitch = document.getElementById('pump-switch');
    // *** Save state to localStorage ***
    localStorage.setItem('pumpStatus', status);
    if (status === 'on') {
        pumpSwitch.checked = true;
    } else {
        pumpSwitch.checked = false;
    }

    const message = status === 'on' ? 'Water pump turned ON' : 'Water pump turned OFF';
    // Only show notification if the change came from an active element (user click)
    if (document.activeElement === pumpSwitch) {
        showNotification(message, status);
    }
}
function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'on' ? 'check-circle' : 'times-circle'}"></i>
        ${message}
    `;
    // Add styles for notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'on' ? '#27ae60' : '#e74c3c'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1001;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    document.body.appendChild(notification);
    // Remove notification after 2 seconds
    setTimeout(() => {
        notification.remove();
    }, 2000);
}


// ---------------------Chart Initialization-----------------------------
function updateAllCharts() {
    if (!latestHistoryData || latestHistoryData.length === 0) return;

    // FIX: Use .slice(-10) to get the 10 MOST RECENT entries.
    // Do NOT use .reverse() here so time flows left-to-right (oldest to newest).
    const dataToGraph = [...latestHistoryData].slice(-10);

    // Extract Labels (Time)
    const labels = dataToGraph.map(d => {
        const timeStr = formatTimestamp(d.timestamp || d.id);
        const parts = timeStr.split(' ');
        // Return only the time (e.g., "07:46:54 PM") to keep the graph clean
        if (parts.length >= 2) return parts.slice(1).join(' '); 
        return timeStr;
    });

    // Extract Data Values - ensuring compatibility with Firebase keys
    const moistureData = dataToGraph.map(d => d.soilMoisture || d.moisture || 0);
    const humidityData = dataToGraph.map(d => d.humidity || 0);
    const tempData = dataToGraph.map(d => d.temperature || 0);
    const phData = dataToGraph.map(d => d.pH || d.phLevel || 0);

    // Render each chart
    renderChart('soil-moisture-chart', 'Pagkabasa ng Lupa (%)', labels, moistureData, '#3498db', 0, 100, 10);
    renderChart('humidity-chart', 'Halumigmig (%)', labels, humidityData, '#2980b9', 0, 100, 10);
    renderChart('temperature-chart', 'Temperatura (°C)', labels, tempData, '#e74c3c', 0, 100, 10);
    renderChart('ph-level-chart', 'Antas ng pH', labels, phData, '#9b59b6', 0, 14, 2);
}
// NOTE: Added yMin, yMax, yStep to the function signature
function renderChart(canvasId, label, labels, data, color, yMin, yMax, yStep) {
    const ctxElement = document.getElementById(canvasId);
    if (!ctxElement) return;

    const ctx = ctxElement.getContext('2d');

    // CRITICAL: Destroy old chart instance if it exists
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    // Create new Chart instance
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: color + '80',
                borderColor: color,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    // APPLYING THE FIXED SCALE RANGES AND STEPS HERE:
                    min: yMin,      // Sets the Y-axis minimum (e.g., 0)
                    max: yMax,      // Sets the Y-axis maximum (e.g., 100 or 14)
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        stepSize: yStep, // Sets the interval between ticks (e.g., 10 or 2)
                        color: '#555',
                        font: { size: 11 }
                    },
                    title: {
                        display: true,
                        text: 'Value'
                    }
                },
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: {
                        color: '#555',
                        font: { size: 10 },
                        maxRotation: 45,
                        minRotation: 0
                    },
                    title: {
                        display: true,
                        text: 'Oras'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: label,
                    font: { size: 14, weight: 'bold' },
                    color: '#333',
                    padding: { bottom: 10 }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.parsed.y;
                        }
                    }
                }
            }
        }
    });
}



/**
 * Converts the provided data array into a CSV file and triggers download.
 * @param {Array<Object>} dataArray - The sensor data to export.
 * @param {string} range - The time range used for the filename.
 */
function exportDataToCSV(dataArray, range) {
    if (dataArray.length === 0) {
        alert('Walang data na mai-export.');
        return;
    }

    // Define the CSV header based on your table columns
    const headers = [
        "timestamp",
        "Pagkabasa ng Lupa (moisture)",
        "Halumigmig (humidity)",
        "Temperatura (temperature)",
        "Light Status (light)",
        "Antas ng pH (phLevel)"
    ];

    // Start CSV content with headers
    let csvContent = headers.join(',') + '\n';

    // Map the data array to CSV rows
    dataArray.forEach(row => {
        const formattedTimestamp = formatTimestamp(row.timestamp || row.id);
        // 1. Enclose the timestamp in double quotes (")
        const quotedTimestamp = `"${formattedTimestamp}"`;

        const rowData = [
            quotedTimestamp, // Use the quoted timestamp for CSV safety
            row.soilMoisture || row.moisture || '',
            row.humidity || '',
            row.temperature || '',
            row.lightStatus || row.light || '',
            row.phLevel || row.pH || ''
        ];
        csvContent += rowData.join(',') + '\n';
    });

    // Create and trigger the download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    // Use the fetched time range in the filename
    a.setAttribute('download', `agriknows-data-${range}-${new Date().toISOString().split('T')[0]}.csv`);

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    alert(`Tagumpay na na-export ang ${dataArray.length} entries (${range})!`);
}

function updateSoilMoistureStatus(moistureLevel) {
    const statusElement = document.getElementById('soil-moisture-status');
    let status, message, className;

    if (moistureLevel < 20) {
        status = 'Sobrang tuyo';
        message = 'Kailangan agad ng Patubig';
        className = 'status-dry';
    } else if (moistureLevel < 40) {
        status = 'Tuyot';
        message = 'Kailangan ng Patubig';
        className = 'status-moderate';
    } else if (moistureLevel < 60) {
        status = 'Mainam';
        message = 'Perpektong kondition ng pag kabasa ng lupa';
        className = 'status-optimal';
    } else if (moistureLevel < 80) {
        status = 'Basa';
        message = 'Sapat na kahalumigmigan';
        className = 'status-wet';
    } else {
        status = 'Sobra sa tubig';
        message = 'Bawasan ang Tubig';
        className = 'status-saturated';
    }

    statusElement.textContent = `${status}: ${message}`;
    statusElement.className = `status-message ${className}`;
}