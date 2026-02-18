import { getDatabase, ref, onValue, query, limitToLast, orderByChild, startAt, set, push} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

//latest agriknows 2026-07-03

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

// ==================== LOAD USER CROPS FOR MONITORING ====================
async function loadUserCropsForMonitoring() {
    console.log("📊 Loading user crops for monitoring...");
    
    // Check if user is logged in
    if (!auth.currentUser) {
        console.warn("⚠️ No user logged in");
        return;
    }
    
    const userId = auth.currentUser.uid;
    
    try {
        // Load custom crops from Firebase
        const userCropsRef = ref(db, `users/${userId}/customCrops`);
        
        onValue(userCropsRef, (snapshot) => {
            if (snapshot.exists()) {
                const customCrops = snapshot.val();
                console.log("✅ Loaded custom crops:", Object.keys(customCrops).length);
                
                // Merge with predefined crops
                allCropData = { ...PREDEFINED_CROP_DATA, ...customCrops };
                
                // Update the crop grid/selector if it exists
                if (typeof renderCropOptions === 'function') {
                    renderCropOptions();
                }
            } else {
                console.log("ℹ️ No custom crops found for user");
                // Just use predefined crops
                allCropData = { ...PREDEFINED_CROP_DATA };
            }
        }, (error) => {
            console.error("❌ Error loading user crops:", error);
            // Fallback to predefined crops
            allCropData = { ...PREDEFINED_CROP_DATA };
        });
        
    } catch (error) {
        console.error("❌ Error in loadUserCropsForMonitoring:", error);
        // Fallback to predefined crops
        allCropData = { ...PREDEFINED_CROP_DATA };
    }
}

setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log("✅ Persistence set to LOCAL");
    })
    .catch((error) => {
        console.error("❌ Persistence error:", error);
    });

// Also add this to check auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("✅ User is logged in:", user.uid);
        console.log("Email:", user.email);
    } else {
        console.log("❌ No user logged in");
    }
});


function preventBack() {
    window.history.forward();
}
// 1. Modern replacement for onunload
window.addEventListener('pagehide', (event) => {
    console.log("Cleaning up session view...");
});

// 2. The proper way to handle the "Back" button after logout
window.onload = function () {
    if (typeof window.history.pushState === "function") {
        window.history.pushState("jt656", null, null);
        window.onpopstate = function () {
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
// Global variables for data history
let currentTimeRange = '1h';
let isGraphMode = false;
let autoRefreshInterval = null;

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



//---------------------------user input crop selector-------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("saveBtn").addEventListener("click", saveData);
});


function saveData() {
    const user = auth.currentUser;
    
    // ===== CRITICAL DEBUG =====
    console.log("🔍 === SAVE CROP DEBUG ===");
    console.log("Is user logged in?", user ? "YES ✅" : "NO ❌");
    
    if (user) {
        console.log("User UID:", user.uid);
        console.log("User Email:", user.email);
        console.log("Database Path:", `users/${user.uid}/customCrops/`);
    } else {
        console.log("⚠️ NO USER LOGGED IN!");
        alert("Please login first!");
        return;
    }
    console.log("=========================");
    // ===== END DEBUG =====
    
    if (!user) {
        alert('Please login first.');
        return;
    }
    
    const cropName = document.getElementById('CropName').value.trim();
    
    if (!cropName) {
        showPopup('Mangyaring maglagay ng pangalan ng pananim.');
        return;
    }

    // Get all values
    const tempMin = Number(document.getElementById('tempMin').value);
    const tempMax = Number(document.getElementById('tempMax').value);
    const moistureMin = Number(document.getElementById('moistureMin').value);
    const moistureMax = Number(document.getElementById('moistureMax').value);
    const phMin = Number(document.getElementById('phMin').value);
    const phMax = Number(document.getElementById('phMax').value);
    const humidityMin = Number(document.getElementById('humidityMin').value);
    const humidityMax = Number(document.getElementById('humidityMax').value);

    // Validate ranges
    if (tempMin >= tempMax) {
        showPopup('Ang minimum temperatura ay dapat mas mababa sa maximum.');
        return;
    }
    if (moistureMin >= moistureMax) {
        showPopup('Ang minimum moisture ay dapat mas mababa sa maximum.');
        return;
    }
    if (phMin >= phMax) {
        showPopup('Ang minimum pH ay dapat mas mababa sa maximum.');
        return;
    }
    if (humidityMin >= humidityMax) {
        showPopup('Ang minimum humidity ay dapat mas mababa sa maximum.');
        return;
    }

    // IMPORTANT: Save to users/{user.uid}/customCrops/{cropName}
    // This ensures it's under the SAME UID as email/username
    const cropRef = ref(db, `users/${user.uid}/customCrops/${cropName}`);

    const cropData = {
        name: cropName,
        temp: { 
            min: tempMin, 
            max: tempMax 
        },
        moisture: { 
            min: moistureMin, 
            max: moistureMax 
        },
        ph: { 
            min: phMin, 
            max: phMax 
        },
        humidity: { 
            min: humidityMin, 
            max: humidityMax 
        },
        createdAt: new Date().toISOString()
    };

    set(cropRef, cropData)
        .then(() => {
            showPopup(`Tagumpay! Naka-save na ang ${cropName} sa iyong account.`);
            document.getElementById('addCropForm').reset();
            document.getElementById('addCropModal').style.display = 'none';
        })
        .catch((error) => {
            console.error("Firebase Error:", error);
            showPopup('Error saving: ' + error.message);
        });
}


//-------------------------- MONITOR SENSORS AND COMPARE TO RANGES------------------------
// Add this popup function

// ==================== CROP SELECTION MODAL - EXACT DESIGN ====================

// Function to open the modal
function openCropSelectionModal() {
    const modal = document.getElementById('cropSelectionModal');
    modal.classList.add('active');
    modal.style.display = 'flex';
    loadCropsInModal();
}

// Function to close the modal
function closeCropSelectionModal() {
    const modal = document.getElementById('cropSelectionModal');
    modal.classList.remove('active');
    modal.style.display = 'none';
}

// Close modal when clicking on dark overlay
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('cropSelectionModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeCropSelectionModal();
            }
        });
    }
});

// Function to load crops (predefined + custom from Firebase)
function loadCropsInModal() {
    const user = auth.currentUser;
    
    if (!user) {
        console.log("No user logged in");
        return;
    }

    console.log("Loading crops for selection...");

    // Get the grid container
    const grid = document.querySelector('#cropSelectionModal .crops-selection-grid');
    
    if (!grid) {
        console.error("Crops grid not found!");
        return;
    }

    // Reference to custom crops in Firebase
    const cropsRef = ref(db, `users/${user.uid}/customCrops`);
    
    // Listen for custom crops
    onValue(cropsRef, (snapshot) => {
        const customCrops = snapshot.val();
        
        // Remove existing custom cards
        const existingCustom = grid.querySelectorAll('.crop-selection-card[data-custom="true"]');
        existingCustom.forEach(card => card.remove());
        
        if (!customCrops) {
            console.log("No custom crops");
            return;
        }

        console.log(`Found ${Object.keys(customCrops).length} custom crops`);

        // Add each custom crop
        Object.keys(customCrops).forEach(cropKey => {
            const crop = customCrops[cropKey];
            
            const card = document.createElement('div');
            card.className = 'crop-selection-card';
            card.setAttribute('data-crop-key', cropKey);
            card.setAttribute('data-custom', 'true');
            
            card.innerHTML = `
                <div class="crop-selection-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                        <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.71-2.33c1.06.15 2.15.23 3.24.23 7.78 0 14-5.37 14-12 0-1.1-.9-2-2-2h-4.18C17.5 5.94 17 6.94 17 8z"/>
                    </svg>
                </div>
                <div class="crop-selection-name">${crop.name}</div>
            `;
            
            card.addEventListener('click', function() {
                selectCrop(this, cropKey, crop);
            });
            
            grid.appendChild(card);
        });
        
        console.log(`✅ Loaded custom crops`);
    });
}

// Function to select a crop
function selectCrop(cardElement, cropKey, cropData) {
    // Remove selected from all
    const allCards = document.querySelectorAll('#cropSelectionModal .crop-selection-card');
    allCards.forEach(card => card.classList.remove('selected'));
    
    // Add selected to clicked card
    cardElement.classList.add('selected');
    
    // Store crop data
    if (cropData) {
        // Custom crop
        window.selectedCropData = {
            name: cropData.name,
            temperature: cropData.temp,
            moisture: cropData.moisture,
            ph: cropData.ph,
            humidity: cropData.humidity,
            isCustom: true,
            cropKey: cropKey
        };
    } else {
        // Predefined crop
        const predefinedCrop = cardElement.getAttribute('data-crop');
        if (PREDEFINED_CROP_DATA && PREDEFINED_CROP_DATA[predefinedCrop]) {
            window.selectedCropData = {
                name: PREDEFINED_CROP_DATA[predefinedCrop].name,
                temperature: PREDEFINED_CROP_DATA[predefinedCrop].temperature,
                moisture: PREDEFINED_CROP_DATA[predefinedCrop].moisture,
                ph: PREDEFINED_CROP_DATA[predefinedCrop].ph,
                humidity: PREDEFINED_CROP_DATA[predefinedCrop].humidity,
                isCustom: false,
                cropKey: predefinedCrop
            };
        }
    }
    
    console.log("Selected:", window.selectedCropData);
}

// Add click handlers to predefined crops
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const predefinedCards = document.querySelectorAll('#cropSelectionModal .crop-selection-card[data-crop]');
        
        predefinedCards.forEach(card => {
            card.addEventListener('click', function() {
                selectCrop(this, null, null);
            });
        });
    }, 300);
});

// Handle confirm button
document.addEventListener('DOMContentLoaded', function() {
    const confirmBtn = document.getElementById('confirmCropSelectionBtn');
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            if (!window.selectedCropData) {
                showPopup("Pumili muna ng pananim!");
                return;
            }
            
            console.log("Confirmed:", window.selectedCropData.name);
            
            // Save as active crop
            const user = auth.currentUser;
            if (user) {
                set(ref(db, `users/${user.uid}/activeCrop`), {
                    name: window.selectedCropData.name,
                    temperature: window.selectedCropData.temperature,
                    moisture: window.selectedCropData.moisture,
                    ph: window.selectedCropData.ph,
                    humidity: window.selectedCropData.humidity,
                    isCustom: window.selectedCropData.isCustom,
                    updatedAt: new Date().toISOString()
                }).then(() => {
                    console.log("✅ Active crop saved");
                    showPopup(`Napili: ${window.selectedCropData.name}`);
                    closeCropSelectionModal();
                    
                    // Update monitoring (if you have this function)
                    if (typeof updateCropMonitoring === 'function') {
                        updateCropMonitoring(window.selectedCropData);
                    }
                });
            }
        });
    }
});

// Make functions global
window.openCropSelectionModal = openCropSelectionModal;
window.closeCropSelectionModal = closeCropSelectionModal;


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
    if (!sensorData) return;

    const currentTime = Date.now();
    const dataTime = sensorData.timestamp;
    if (currentTime - dataTime > 300000) { // 5 minutes
        showOfflineState();
        return;
    }

    // --- Get Data Values ---
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

    // --- Update Text Status (The Logic) ---
    // We get the settings for the currently selected crop
    const currentCrop = allCropData[currentCropKey];

    if (currentCrop) {
        // Temperature Status
        updateStatusElement('status-temp-text', temp, currentCrop.temperature.min, currentCrop.temperature.max, "Celsius");
        // Humidity Status
        updateStatusElement('status-humidity-text', humidity, currentCrop.humidity.min, currentCrop.humidity.max, "%");
        // pH Status
        updateStatusElement('status-ph-text', ph, currentCrop.ph.min, currentCrop.ph.max, "pH");
        // Moisture Status 
        updateStatusElement('status-moisture-text', moisture, currentCrop.moisture.min, currentCrop.moisture.max, "%");
    } else {
        // If no crop selected, just show "No Crop Selected"
        document.querySelectorAll('.status-message').forEach(el => {
            el.textContent = "Pumili ng Pananim";
            el.className = "status-message status-warning";
        });
    }
    // --- Light Status Update ---
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
function loadAllCropData() {
    const customCropsJson = localStorage.getItem('customCrops');
    const customCrops = customCropsJson ? JSON.parse(customCropsJson) : {};
    allCropData = { ...PREDEFINED_CROP_DATA, ...customCrops };
    
    const lastSelectedCropKey = localStorage.getItem('selectedCropKey');
    if (lastSelectedCropKey && allCropData[lastSelectedCropKey]) {
        setCrop(lastSelectedCropKey, allCropData[lastSelectedCropKey]);
    } else {
        setCrop('none', {
            name: "Walang napiling pananim",
            temperature: { min: 0, max: 0 },
            moisture: { min: 0, max: 0 },
            ph: { min: 0, max: 0 },
            humidity: { min: 0, max: 0 },
        });
    }
}
function setCrop(cropKey, cropInfo) {
    currentCropKey = cropKey;
    localStorage.setItem('selectedCropKey', cropKey);
    
    const cropNameEl = document.getElementById('currentCropName');
    const cropOptimalEl = document.getElementById('currentCropOptimal');
    
    if (cropNameEl) {
        cropNameEl.innerHTML = `<i class="fas fa-seedling"></i> ${cropInfo.name}`;
    }
    
    if (cropOptimalEl) {
        cropOptimalEl.textContent = cropInfo.name === "Walang napiling pananim" 
            ? "Pumili ng crop para bantayan"
            : `Optimal: Temp ${cropInfo.temperature.min}-${cropInfo.temperature.max}°C, Moisture ${cropInfo.moisture.min}-${cropInfo.moisture.max}%, pH ${cropInfo.ph.min}-${cropInfo.ph.max}`;
    }
    
    const tempOptimal = document.getElementById('tempOptimal');
    const moistureOptimal = document.getElementById('moistureOptimal');
    const phOptimal = document.getElementById('phOptimal');
    const humidityOptimal = document.getElementById('humidityOptimal');
    
    if (tempOptimal) tempOptimal.textContent = `Optimal: ${cropInfo.temperature.min}-${cropInfo.temperature.max}°C`;
    if (moistureOptimal) moistureOptimal.textContent = `Optimal: ${cropInfo.moisture.min}-${cropInfo.moisture.max}%`;
    if (phOptimal) phOptimal.textContent = `Optimal: ${cropInfo.ph.min}-${cropInfo.ph.max}`;
    if (humidityOptimal) humidityOptimal.textContent = `Optimal: ${cropInfo.humidity.min}-${cropInfo.humidity.max}%`;
}
function initializeEventListeners() {
    console.log("✅ Initializing event listeners...");
    initializeModals();
}function updateCurrentDate() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

function updateLightStatus(status) {
    const lightValueElement = document.getElementById('light-status');
    if (!lightValueElement) return;

    if (status === "--" || status === null || status === undefined) {
        lightValueElement.textContent = '--';
    } else if (status === 1 || status === 'Light' || status === 'Maliwanag') {
        lightValueElement.textContent = 'Light';
    } else {
        lightValueElement.textContent = 'Dark';
    }
}

function updateSoilMoistureStatus(moistureLevel) {
    const statusElement = document.getElementById('soil-moisture-status');
    if (!statusElement) return;
    
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

function initializePumpControls() {
    const pumpSwitch = document.getElementById('pump-switch');
    
    if (!pumpSwitch) {
        console.warn("⚠️ Pump switch element not found");
        return;
    }
    
    // Get saved status from localStorage
    const savedStatus = localStorage.getItem('pumpStatus');
    const initialStatus = savedStatus === 'on' ? 'on' : 'off';
    
    // Set initial state
    setPumpStatus(initialStatus);
    
    // Add change listener
    pumpSwitch.addEventListener('change', function () {
        const newStatus = this.checked ? 'on' : 'off';
        setPumpStatus(newStatus);
    });
    
    console.log("✅ Pump controls initialized:", initialStatus);
}

function setPumpStatus(status) {
    const pumpSwitch = document.getElementById('pump-switch');
    
    if (!pumpSwitch) return;
    
    // Save to localStorage
    localStorage.setItem('pumpStatus', status);
    
    // Update switch state
    pumpSwitch.checked = (status === 'on');
    
    // Show notification if user triggered it
    if (document.activeElement === pumpSwitch) {
        const message = status === 'on' ? ' Patubig: ON' : ' Patubig: OFF';
        showPumpNotification(message, status);
    }
}

function showPumpNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'on' ? 'check-circle' : 'times-circle'}"></i>
        ${message}
    `;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'on' ? '#27ae60' : '#e74c3c'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1001;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
function initDashboard() {
    updateCurrentDate();
    loadAllCropData(); // **MODIFIED**: Load crop data (including custom) from storage
    initializeEventListeners();
    updateSoilMoistureStatus(42);
    updateLightStatus("--");
    initializePumpControls(); // **MODIFIED**: Initializes pump state from storage
    listenToFirebaseData();

     setTimeout(() => {
        initializeDataHistory();
    }, 500);
}
// ==================== ENHANCED  ====================
function initializeDataHistory() {
    initializeTimeFilters();
    initializeGraphMode();
    initializeExportButton();
    initializeAutoRefresh();
     loadHistoryData('1h');
    
    // Load initial data
    loadHistoryData(currentTimeRange);
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
                showOfflineState();
            } else {
                // Device is active, update the UI cards
                updateCurrentReadings(latestReading); // This is your old function
                updateCurrentStatusCards(latestReading); // Add this line to call your NEW function
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
    // 1. Clear the big numbers/values
    const ids = ['current-temperature', 'current-soil-moisture', 'current-humidity', 'current-ph-level', 'light-status'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "--";
    });

    // 2. Clear the "Kasalukuyang Status" labels (Mainam, Mababa, etc.)
    // This targets the specific status IDs in your welcome.blade.php
    const statusIds = [
        'status-temp-text',      
        'status-moisture-text',  
        'status-humidity-text',
        'status-ph-text',
        'status-light-text'
    ];

    statusIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = "Offline";
            el.style.color = "#e74c3c"; // Change text to Red
        }
    });

    // 3. Clear the side-panel moisture status if it exists
    const sideStatus = document.getElementById('soil-moisture-status');
    if (sideStatus) sideStatus.textContent = "Offline";
}


//-------------------------------History Table Time-------------------------------
/**
 * Formats a Firebase timestamp (milliseconds) into a compact, readable date and time.
 * @param {number} timestamp - The timestamp in milliseconds.
 * @returns {string} The formatted date and time string (e.g., "11/27/2025, 7:46:54 PM").
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);

    // Format: Nov 28, 2025 11:26 AM
    const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',  // Nov, Dec, etc.
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
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
            // Remove active class from all filters
            timeFilters.forEach(f => f.classList.remove('active'));
            
            // Add active class to clicked filter
            filter.classList.add('active');
            
            // Get time range
            currentTimeRange = filter.getAttribute('data-time');
            
            // Show loading state
            showLoadingState();
            
            // Load data for selected time range
            loadHistoryData(currentTimeRange);
        });
    });
}
// ==================== LOADING STATE MANAGEMENT FOR HISTORY TABLE ====================
function showLoadingState() {
    const historyTable = document.getElementById('history-table');
    const table = historyTable.querySelector('table');
    const loadingDiv = historyTable.querySelector('.history-loading');
    
    if (table) table.style.display = 'none';
    if (loadingDiv) {
        loadingDiv.style.display = 'block';
    } else {
        historyTable.innerHTML = `
            <div class="history-loading">
                <i class="fas fa-spinner"></i>
                <p>Naglo-load ng data...</p>
            </div>
        `;
    }
}

function hideLoadingState() {
    const historyTable = document.getElementById('history-table');
    const table = historyTable.querySelector('table');
    const loadingDiv = historyTable.querySelector('.history-loading');
    
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (table) table.style.display = 'table';
}

function showEmptyState(range) {
    const historyTable = document.getElementById('history-table');
    const loadingDiv = historyTable.querySelector('.history-loading');
    
    if (loadingDiv) loadingDiv.style.display = 'none';
    
    // Dynamic message based on time range
    let timeMessage = '';
    switch(range) {
        case '1h':
            timeMessage = 'sa nakaraang 1 oras';
            break;
        case '6h':
            timeMessage = 'sa nakaraang 6 oras';
            break;
        case '24h':
            timeMessage = 'sa nakaraang 24 oras';
            break;
        case '7d':
            timeMessage = 'sa nakaraang 7 araw';
            break;
        case 'all':
            timeMessage = 'sa nakaraang buwan';
            break;
        default:
            timeMessage = 'sa napiling oras';
    }
    
    historyTable.innerHTML = `
        <div class="history-empty">
            <i class="fas fa-database"></i>
            <h3>Walang Nakuhang Data</h3>
            <p>Walang natagpuang sensor readings ${timeMessage}.</p>
        </div>
    `;
}
// ==================== ENHANCED DATA LOADING ====================
async function loadHistoryData(range) {
    const now = Date.now();
    let startTime;
    let limitCount = 100;
    
    if (range === 'all') {
    startTime = now - (30 * 24 * 60 * 60 * 1000);
    limitCount = 500;
    } else 
    switch (range) {
        case '1h':
            startTime = now - (60 * 60 * 1000);
            break;
        case '6h':
            startTime = now - (6 * 60 * 60 * 1000);
            break;
        case '24h':
            startTime = now - (24 * 60 * 60 * 1000);
            break;
        case '7d':
            startTime = now - (7 * 24 * 60 * 60 * 1000);
             limitCount = 200;
            break;
        default:
            startTime = now - (60 * 60 * 1000);
    }
    
    const historyQuery = query(
        ref(db, dbPath),
        orderByChild('timestamp'),
        startAt(startTime),
        limitToLast(limitCount) // Use the dynamic limit
    );
    
    try {
        onValue(historyQuery, (snapshot) => {
            let dataArray = [];
            snapshot.forEach((childSnapshot) => {
                dataArray.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by timestamp descending (newest first)
            dataArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            // Store for graph use
            latestHistoryData = dataArray;
            
            if (dataArray.length === 0) {
                showEmptyState(range);
            } else {
                hideLoadingState();
                populateHistoryTable(dataArray);
                
                // Update graphs if in graph mode
                if (isGraphMode) {
                    updateAllCharts();
                }
            }
        }, { onlyOnce: true });
    } catch (error) {
        console.error("Error loading history data:", error);
        showEmptyState(range);
    }
}
// ==================== IMPROVED TABLE POPULATION ====================
function populateHistoryTable(dataArray) {
    const tbody = document.getElementById('history-data');
    const table = document.querySelector('#history-table table');
    
    if (!tbody || !table) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Helper function to get color class for values
    function getColorClass(value, type) {
        if (!value || value === '--' || value === 'Offline') return '';
        
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '';
        
        switch(type) {
            case 'temperature':
                // Blue (Below): < 22°C, Green (Normal): 22°C - 28°C, Red (Above): > 28°C
                if (numValue < 22) return 'value-cold';
                if (numValue >= 22 && numValue <= 28) return 'value-normal';
                if (numValue > 28) return 'value-hot';
                break;
                
            case 'moisture':
                // Blue (Below): < 50%, Green (Normal): 50% - 80%, Red (Above): > 80%
                if (numValue < 50) return 'value-low';
                if (numValue >= 50 && numValue <= 80) return 'value-normal';
                if (numValue > 80) return 'value-high';
                break;
                
            case 'humidity':
                // Blue (Below): < 50%, Green (Normal): 50% - 80%, Red (Above): > 80%
                if (numValue < 50) return 'value-low';
                if (numValue >= 50 && numValue <= 80) return 'value-normal';
                if (numValue > 80) return 'value-high';
                break;
                
            case 'ph':
                // Orange (Below): < 5.5, Green (Normal): 5.5 - 6.5, Blue (Above): > 6.5
                if (numValue < 5.5) return 'value-acidic';
                if (numValue >= 5.5 && numValue <= 6.5) return 'value-normal';
                if (numValue > 6.5) return 'value-alkaline';
                break;
        }
        return '';
    }
    
    // Helper function to format value or show "Offline"
    function formatValue(value, unit = '') {
        if (!value || value === '--' || value === null || value === undefined) {
            return '<span class="offline-status">Offline</span>';
        }
        return value + unit;
    }
    
    // Populate with new data
    dataArray.forEach(row => {
        const tr = document.createElement('tr');
        
        const formattedTime = formatTimestamp(row.timestamp || row.id);
        
        const moistureValue = row.soilMoisture || row.moisture;
        const humidityValue = row.humidity;
        const temperatureValue = row.temperature;
        const phValue = row.phLevel || row.pH;
        const lightValue = row.lightStatus || row.light;
        
        tr.innerHTML = `
            <td>${formattedTime}</td>
            <td class="${getColorClass(moistureValue, 'moisture')}">${formatValue(moistureValue, '%')}</td>
            <td class="${getColorClass(humidityValue, 'humidity')}">${formatValue(humidityValue, '%')}</td>
            <td class="${getColorClass(temperatureValue, 'temperature')}">${formatValue(temperatureValue, '°C')}</td>
            <td>${lightValue || '<span class="offline-status">Offline</span>'}</td>
            <td class="${getColorClass(phValue, 'ph')}">${formatValue(phValue, '')}</td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Show the table
    table.style.display = 'table';
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
    
    console.log("🎨 Initializing Graph Mode...");
    console.log("  Toggle button:", toggleBtn ? "✅ Found" : "❌ Not found");
    console.log("  Table view:", tableView ? "✅ Found" : "❌ Not found");
    console.log("  Graph view:", graphView ? "✅ Found" : "❌ Not found");
    
    if (!toggleBtn) {
        console.error("❌ Graph toggle button not found!");
        return;
    }
    
    toggleBtn.addEventListener('click', () => {
        console.log("🖱️ Graph mode button clicked!");
        console.log("  Current isGraphMode:", isGraphMode);
        
        isGraphMode = !isGraphMode;
        console.log("  New isGraphMode:", isGraphMode);
        
       if (isGraphMode) {
    console.log("📊 Switching to GRAPH mode...");
       
    // Hide table
    if (tableView) {
        tableView.classList.add('hidden');
        tableView.style.display = 'none';
        console.log("  ✅ Table hidden");
    }
    
    // Show graph
    if (graphView) {
        graphView.classList.remove('hidden');
        graphView.style.display = 'grid';  // Force grid display
        
        // Force browser reflow
        void graphView.offsetHeight;
        
        console.log("  ✅ Graph shown");
        console.log("  📏 Graph dimensions:", graphView.offsetWidth, "x", graphView.offsetHeight);
    }

    toggleBtn.innerHTML = '<i class="fas fa-table"></i> Table Mode';
    
    // Update charts with delay
    console.log("  📊 Creating bar charts...");
    console.log("  Data available:", latestHistoryData ? latestHistoryData.length : 0, "entries");
    
    setTimeout(() => {
        // Force all canvases to be visible
        const canvases = graphView.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            canvas.style.display = 'block';
            canvas.style.visibility = 'visible';
        });
        
        // Force browser reflow again
        void graphView.offsetHeight;
        
        // Destroy old charts first
        Object.keys(chartInstances).forEach(key => {
            if (chartInstances[key]) {
                chartInstances[key].destroy();
                delete chartInstances[key];
            }
        });
        
        // Create new bar charts
        updateAllCharts();
        
        console.log("  ✅ Bar charts created!");
        console.log("  📊 Active charts:", Object.keys(chartInstances));
    }, 800);  // Increased delay for better rendering
} else { // Switch BACK to TABLE mode
    console.log("📋 Switching to TABLE mode...");
    
    // Hide graph
    if (graphView) {
        graphView.classList.add('hidden');
        graphView.style.display = 'none';
        console.log("  ✅ Graph hidden");
    }
    
    // Show table
    if (tableView) {
        tableView.classList.remove('hidden');
        tableView.style.display = 'block';
        console.log("  ✅ Table shown");
    }
    
    // Update button text back to Graph Mode
    toggleBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Graph Mode';
    
    console.log("  ✅ Switched back to table mode!");}
}); 
} 
//-------------------------------Export Data Functionality-------------------------------
function initializeExportButton() {
    const exportButton = document.getElementById('export-button');
    
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            if (latestHistoryData && latestHistoryData.length > 0) {
                exportDataToCSV(latestHistoryData, currentTimeRange);
            } else {
                alert('Walang data na mai-export. Subukang pumili ng ibang time range.');
            }
        });
    }
}

// Enhanced CSV export with better formatting
function exportDataToCSV(dataArray, range) {
    if (dataArray.length === 0) {
        alert('Walang data na mai-export.');
        return;
    }
    
    // Define CSV headers
    const headers = [
        "Date Time",
        "Soil Moisture (%)",
        "Humidity (%)",
        "Temperature (°C)",
        "Light Status",
        "pH Level"
    ];
    
    // Start CSV content
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    dataArray.forEach(row => {
        const formattedTimestamp = formatTimestamp(row.timestamp || row.id);
        const quotedTimestamp = `"${formattedTimestamp}"`;
        
        const rowData = [
            quotedTimestamp,
            row.soilMoisture || row.moisture || '',
            row.humidity || '',
            row.temperature || '',
            row.lightStatus || row.light || '',
            row.phLevel || row.pH || ''
        ];
        csvContent += rowData.join(',') + '\n';
    });
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    a.setAttribute('download', `agriknows-data-${range}-${dateStr}-${timeStr}.csv`);
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Show success notification
    showNotification(`Matagumpay na na-export ang ${dataArray.length} entries!`, 'on');
}

// ==================== CALL INITIALIZATION ON PAGE LOAD ====================
// Add this to your existing DOMContentLoaded or initialization code
document.addEventListener('DOMContentLoaded', () => {
    // ... your existing initialization code ...
    
    // Initialize enhanced data history
    initializeDataHistory();
});

//------------------------------- Irrigation/Pump Control Functionality-------------------------------







//------------------------------- Irrigation notifcation-------------------------------
function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'on' ? 'check-circle' : 'times-circle'}"></i>
        ${message}
    `;
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
    
    // Get last 15 data points for better visualization
    const dataToGraph = [...latestHistoryData].slice(-15).reverse();
    
    // Extract Labels (Time)
    const labels = dataToGraph.map(d => {
        const timeStr = formatTimestamp(d.timestamp || d.id);
        const parts = timeStr.split(' ');
        // Return only the time part
        if (parts.length >= 2) return parts.slice(1).join(' ');
        return timeStr;
    });
    
    // Extract Data Values
    const moistureData = dataToGraph.map(d => d.soilMoisture || d.moisture || 0);
    const humidityData = dataToGraph.map(d => d.humidity || 0);
    const tempData = dataToGraph.map(d => d.temperature || 0);
    const phData = dataToGraph.map(d => d.pH || d.phLevel || 0);
    
    // Render each chart with enhanced styling
    renderEnhancedChart('soil-moisture-chart', 'Pagkabasa ng Lupa (%)', labels, moistureData, '#3498db', 0, 100, 10);
    renderEnhancedChart('humidity-chart', 'Halumigmig (%)', labels, humidityData, '#2980b9', 0, 100, 10);
    renderEnhancedChart('temperature-chart', 'Temperatura (°C)', labels, tempData, '#e74c3c', 0, 50, 5);
    renderEnhancedChart('ph-level-chart', 'Antas ng pH', labels, phData, '#9b59b6', 0, 14, 2);
}
function renderEnhancedChart(canvasId, label, labels, data, color, yMin, yMax, yStep) {
    const ctxElement = document.getElementById(canvasId);
    if (!ctxElement) {
        console.warn("Canvas not found:", canvasId);
        return;
    }
    
    console.log("📊 Creating chart:", canvasId, "with", data.length, "data points");
    
    const ctx = ctxElement.getContext('2d');
    
    // Destroy old chart instance if it exists
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
        console.log("  🗑️ Old chart destroyed");
    }
    
    // Create new Chart instance with BAR TYPE
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',  // ← CHANGED FROM 'line' TO 'bar'
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: color + '99',  // Semi-transparent bars
                borderColor: color,
                borderWidth: 2,
                borderRadius: 6,  // Rounded corners on bars
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    min: yMin,
                    max: yMax,
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        stepSize: yStep,
                        color: '#6b7280',
                        font: { size: 12, weight: '500' },
                        padding: 8,
                        callback: function(value) {
                            return value + (label.includes('°C') ? '°C' : label.includes('pH') ? '' : '%');
                        }
                    },
                    title: {
                        display: true,
                        text: 'Value',
                        color: '#374151',
                        font: { size: 13, weight: '600' }
                    }
                },
                x: {
                    display: true,
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6b7280',
                        font: { size: 11, weight: '500' },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    title: {
                        display: true,
                        text: 'Oras',
                        color: '#374151',
                        font: { size: 13, weight: '600' }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false  // Hide legend for cleaner look
                },
                title: {
                    display: true,
                    text: label,
                    font: { size: 16, weight: 'bold' },
                    color: '#1f2937',
                    padding: { bottom: 15, top: 5 }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 13, weight: 'bold' },
                    bodyFont: { size: 12 },
                    bodySpacing: 4,
                    borderColor: color,
                    borderWidth: 2,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            let value = context.parsed.y;
                            let unit = '';
                            if (label.includes('°C')) unit = '°C';
                            else if (label.includes('pH')) unit = '';
                            else unit = '%';
                            return `${label}: ${value.toFixed(1)}${unit}`;
                        }
                    }
                }
            }
        }
    });
    
    console.log("  ✅ Bar chart created:", canvasId);
}
// ==================== AUTO-REFRESH FUNCTIONALITY ====================
function initializeAutoRefresh() {
    // Auto-refresh every 30 seconds
    autoRefreshInterval = setInterval(() => {
        if (!isGraphMode) {
            showRefreshIndicator();
            loadHistoryData(currentTimeRange);
            
            setTimeout(() => {
                hideRefreshIndicator();
            }, 1500);
        }
    }, 30000); // 30 seconds
}

function showRefreshIndicator() {
    const indicator = document.getElementById('refresh-indicator');
    if (indicator) {
        indicator.classList.add('active');
    }
}

function hideRefreshIndicator() {
    const indicator = document.getElementById('refresh-indicator');
    if (indicator) {
        indicator.classList.remove('active');
    }
}
