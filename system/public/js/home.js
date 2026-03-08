import {
    getDatabase,
    ref,
    get,
    onValue,
    query,
    equalTo,
    limitToLast,
    orderByChild,
    startAt,
    set,
    update,
    remove,
    push,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";
import {
    initializeApp,
    getApps,
    getApp,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

//latest agriknows 2026-07-03

const firebaseConfig = {
    apiKey: "AIzaSyCq4lH4tj4AS9-cqvM29um--Nu4v2UdvZw",
    authDomain: "agriknows-data.firebaseapp.com",
    databaseURL:
        "https://agriknows-data-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "agriknows-data",
    storageBucket: "agriknows-data.firebasestorage.app",
    messagingSenderId: "922008629713",
    appId: "1:922008629713:web:5cf15ca9d47036b9a8f0f0",
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
const dbPath = "sensorData";
let cachedSessionUser = null;

async function getSessionUser() {
    if (cachedSessionUser) {
        return cachedSessionUser;
    }

    try {
        const response = await fetch("/get-user", {
            headers: { Accept: "application/json" },
        });

        if (!response.ok) {
            return null;
        }

        const sessionUser = await response.json();
        cachedSessionUser = sessionUser || null;
        return cachedSessionUser;
    } catch (error) {
        console.error("Failed to fetch session user:", error);
        return null;
    }
}

async function getResolvedUser() {
    if (auth.currentUser?.uid) {
        return {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email || null,
        };
    }

    const sessionUser = await getSessionUser();
    if (sessionUser?.id) {
        return {
            uid: sessionUser.id,
            email: sessionUser.email || null,
        };
    }

    return null;
}

function getUserCropsQuery(userId) {
    return query(ref(db, "crop"), orderByChild("user_id"), equalTo(userId));
}

function isRecordOwnedByUser(record, userId) {
    if (!record || !userId) {
        return false;
    }

    const ownerId = record.user_id || record.userId || record.uid || null;
    return String(ownerId || "") === String(userId);
}

function decodePushIdTimestamp(pushId) {
    const PUSH_CHARS = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

    if (!pushId || pushId.length < 8) {
        return 0;
    }

    let timestamp = 0;
    for (let i = 0; i < 8; i += 1) {
        const charIndex = PUSH_CHARS.indexOf(pushId.charAt(i));
        if (charIndex < 0) {
            return 0;
        }
        timestamp = timestamp * 64 + charIndex;
    }

    return timestamp;
}

function getRecordTimestamp(record, fallbackId = "") {
    if (!record) {
        return 0;
    }

    if (typeof record.timestamp === "number" && Number.isFinite(record.timestamp)) {
        return record.timestamp;
    }

    if (typeof record.timestamp === "string") {
        const parsed = Date.parse(record.timestamp);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    if (typeof record.createdAt === "string") {
        const parsedCreated = Date.parse(record.createdAt);
        if (Number.isFinite(parsedCreated)) {
            return parsedCreated;
        }
    }

    return decodePushIdTimestamp(fallbackId || record.id || "");
}

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
        // Load custom crops from Firebase top-level crop node
        const userCropsRef = getUserCropsQuery(userId);

        onValue(
            userCropsRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const customCrops = snapshot.val();
                    console.log(
                        "✅ Loaded custom crops:",
                        Object.keys(customCrops).length,
                    );

                    // Merge with predefined crops
                    allCropData = { ...PREDEFINED_CROP_DATA, ...customCrops };

                    // Update the crop grid/selector if it exists
                    if (typeof renderCropOptions === "function") {
                        renderCropOptions();
                    }
                } else {
                    console.log("ℹ️ No custom crops found for user");
                    // Just use predefined crops
                    allCropData = { ...PREDEFINED_CROP_DATA };
                }
            },
            (error) => {
                console.error("❌ Error loading user crops:", error);
                // Fallback to predefined crops
                allCropData = { ...PREDEFINED_CROP_DATA };
            },
        );
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
        loadHistoryData(currentTimeRange);
        currentNotificationUserId = user.uid;
        startNotificationListener();
    } else {
        console.log("❌ No user logged in");
    }
});

function preventBack() {
    window.history.forward();
}
// 1. Modern replacement for onunload
window.addEventListener("pagehide", (event) => {
    console.log("Cleaning up session view...");
});

// 2. The proper way to handle the "Back" button after logout
window.onload = function () {
    if (typeof window.history.pushState === "function") {
        window.history.pushState("jt656", null, null);
        window.onpopstate = function () {
            window.history.pushState("jt656", null, null);
            // Optional: Force a redirect to login if they try to go back
            window.location.href = "/login";
        };
    }
};

//-------------------------------------Global Variables let---------------------------

let devices = [];
let currentPumpStatus = "off";
let deviceIdCounter = 1;
// **NEW**: Global object to hold all crop data (predefined + custom)
let allCropData = {};
// **NEW**: Variable to track the currently selected crop key
let currentCropKey = null;
let latestHistoryData = []; // Store data for graphs
let chartInstances = {}; // Store Chart.js instances to manage updates
// Global variables for data history
let currentTimeRange = "1h";
let isGraphMode = false;
let autoRefreshInterval = null;
let sensorNotifications = [];
let unreadNotificationCount = 0;
let sensorAlertStates = {};
let notificationListenerStarted = false;
let currentNotificationUserId = null;
let lastPopupTime = {};
const POPUP_COOLDOWN = 60 * 1000;

const DEFAULT_SENSOR_THRESHOLDS = {
    temperature: { min: 18, max: 32 },
    moisture: { min: 40, max: 80 },
    humidity: { min: 40, max: 80 },
    ph: { min: 5.5, max: 7.5 },
};

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
    },
};

//---------------------------user input crop selector-------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("saveBtn").addEventListener("click", saveData);
});

async function saveData() {
    const user = await getResolvedUser();

    // ===== CRITICAL DEBUG =====
    console.log("🔍 === SAVE CROP DEBUG ===");
    console.log("Is user logged in?", user ? "YES ✅" : "NO ❌");

    if (user) {
        console.log("User UID:", user.uid);
        console.log("User Email:", user.email);
        console.log("Database Path:", `crop/ (filtered by user_id=${user.uid})`);
    } else {
        console.log("⚠️ NO USER LOGGED IN!");
        alert("Please login first!");
        return;
    }
    console.log("=========================");
    // ===== END DEBUG =====

    if (!user) {
        alert("Please login first.");
        return;
    }

    const cropName = document.getElementById("CropName").value.trim();

    if (!cropName) {
        showPopup("Mangyaring maglagay ng pangalan ng pananim.");
        return;
    }

    // Get all values
    const tempMin = Number(document.getElementById("tempMin").value);
    const tempMax = Number(document.getElementById("tempMax").value);
    const moistureMin = Number(document.getElementById("moistureMin").value);
    const moistureMax = Number(document.getElementById("moistureMax").value);
    const phMin = Number(document.getElementById("phMin").value);
    const phMax = Number(document.getElementById("phMax").value);
    const humidityMin = Number(document.getElementById("humidityMin").value);
    const humidityMax = Number(document.getElementById("humidityMax").value);

    // Validate ranges
    if (tempMin >= tempMax) {
        showPopup("Ang minimum temperatura ay dapat mas mababa sa maximum.");
        return;
    }
    if (moistureMin >= moistureMax) {
        showPopup("Ang minimum moisture ay dapat mas mababa sa maximum.");
        return;
    }
    if (phMin >= phMax) {
        showPopup("Ang minimum pH ay dapat mas mababa sa maximum.");
        return;
    }
    if (humidityMin >= humidityMax) {
        showPopup("Ang minimum humidity ay dapat mas mababa sa maximum.");
        return;
    }

    // Prevent duplicate crop names for the same user
    const customCropsRef = getUserCropsQuery(user.uid);

    try {
        const existingSnapshot = await get(customCropsRef);
        const existingCrops = existingSnapshot.val() || {};
        const normalizedCropName = cropName.trim().toLowerCase();

        const hasDuplicate = Object.values(existingCrops).some((crop) => {
            const existingName = (crop?.name || "").trim().toLowerCase();
            return existingName === normalizedCropName;
        });

        if (hasDuplicate) {
            showPopup("May kaparehong pangalan na ng pananim. Gumamit ng ibang pangalan.");
            return;
        }
    } catch (error) {
        console.error("Error checking existing crops:", error);
    }

    // Add as a NEW record under top-level crop
    const cropRef = push(ref(db, "crop"));
    const cropKey = cropRef.key;

    const cropData = {
        name: cropName,
        user_id: user.uid,
        temp: {
            min: tempMin,
            max: tempMax,
        },
        moisture: {
            min: moistureMin,
            max: moistureMax,
        },
        ph: {
            min: phMin,
            max: phMax,
        },
        humidity: {
            min: humidityMin,
            max: humidityMax,
        },
        createdAt: new Date().toISOString(),
    };

    set(cropRef, cropData)
        .then(async () => {
            console.log(
                `✅ Custom crop saved at crop/${cropKey}`,
            );

            showPopup(
                `Tagumpay! Naka-save na ang ${cropName} sa iyong account.`,
            );
            document.getElementById("addCropForm").reset();
            document.getElementById("addCropModal").style.display = "none";
        })
        .catch((error) => {
            console.error("Firebase Error (user path):", error);
            showPopup("Error saving user crop: " + error.message);
        });
}

//-------------------------- MONITOR SENSORS AND COMPARE TO RANGES------------------------
// Add this popup function

// ==================== CROP SELECTION MODAL - EXACT DESIGN ====================

// Function to open the modal
function openCropSelectionModal() {
    const modal = document.getElementById("cropSelectionModal");
    modal.classList.add("active");
    modal.style.display = "flex";
    loadCropsInModal();
}

// Function to close the modal
function closeCropSelectionModal() {
    const modal = document.getElementById("cropSelectionModal");
    modal.classList.remove("active");
    modal.style.display = "none";
}

// Close modal when clicking on dark overlay
document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("cropSelectionModal");
    if (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target === modal) {
                closeCropSelectionModal();
            }
        });
    }
});

// Function to load only user-created crops from Firebase
async function loadCropsInModal() {
    const user = await getResolvedUser();

    if (!user) {
        console.log("No user logged in");
        return;
    }

    console.log("Loading crops for selection...");

    // Get the grid container
    const grid = document.querySelector(
        "#cropSelectionModal .crops-selection-grid",
    );

    if (!grid) {
        console.error("Crops grid not found!");
        return;
    }

    // Show only user-created cards in this modal
    grid.querySelectorAll(".crop-selection-card").forEach((card) => card.remove());
    grid.querySelectorAll(".crop-selection-empty").forEach((node) => node.remove());

    try {
        const snapshot = await get(getUserCropsQuery(user.uid));
        const customCrops = snapshot.val() || {};
        const cropKeys = Object.keys(customCrops);

        if (cropKeys.length === 0) {
            const emptyMessage = document.createElement("div");
            emptyMessage.className = "crop-selection-empty";
            emptyMessage.style.padding = "12px";
            emptyMessage.style.textAlign = "center";
            emptyMessage.textContent =
                "Wala ka pang custom crop. Magdagdag muna ng pananim.";
            grid.appendChild(emptyMessage);
            return;
        }

        cropKeys.forEach((cropKey) => {
            const crop = customCrops[cropKey];

            const card = document.createElement("div");
            card.className = "crop-selection-card";
            card.setAttribute("data-crop-key", cropKey);
            card.setAttribute("data-custom", "true");

            card.innerHTML = `
                <div class="crop-selection-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                        <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.71-2.33c1.06.15 2.15.23 3.24.23 7.78 0 14-5.37 14-12 0-1.1-.9-2-2-2h-4.18C17.5 5.94 17 6.94 17 8z"/>
                    </svg>
                </div>
                <div class="crop-selection-name">${crop.name}</div>
            `;

            card.addEventListener("click", function () {
                selectCrop(this, cropKey, crop);
            });

            grid.appendChild(card);
        });

        console.log(`✅ Loaded ${cropKeys.length} user-created crops`);
    } catch (error) {
        console.error("❌ Error loading user-created crops:", error);
        showPopup("Hindi ma-load ang custom crops. I-check ang Firebase read rules para sa /crop.");
    }
}

// Function to select a crop
function selectCrop(cardElement, cropKey, cropData) {
    // Remove selected from all
    const allCards = document.querySelectorAll(
        "#cropSelectionModal .crop-selection-card",
    );
    allCards.forEach((card) => card.classList.remove("selected"));

    // Add selected to clicked card
    cardElement.classList.add("selected");

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
            cropKey: cropKey,
        };
    } else {
        // Predefined crop
        const predefinedCrop = cardElement.getAttribute("data-crop");
        if (PREDEFINED_CROP_DATA && PREDEFINED_CROP_DATA[predefinedCrop]) {
            window.selectedCropData = {
                name: PREDEFINED_CROP_DATA[predefinedCrop].name,
                temperature: PREDEFINED_CROP_DATA[predefinedCrop].temperature,
                moisture: PREDEFINED_CROP_DATA[predefinedCrop].moisture,
                ph: PREDEFINED_CROP_DATA[predefinedCrop].ph,
                humidity: PREDEFINED_CROP_DATA[predefinedCrop].humidity,
                isCustom: false,
                cropKey: predefinedCrop,
            };
        }
    }

    console.log("Selected:", window.selectedCropData);
}

// Add click handlers to predefined crops
document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
        const predefinedCards = document.querySelectorAll(
            "#cropSelectionModal .crop-selection-card[data-crop]",
        );

        predefinedCards.forEach((card) => {
            card.addEventListener("click", function () {
                selectCrop(this, null, null);
            });
        });
    }, 300);
});

// Handle confirm button
document.addEventListener("DOMContentLoaded", function () {
    const confirmBtn = document.getElementById("confirmCropSelectionBtn");

    if (confirmBtn) {
        confirmBtn.addEventListener("click", function () {
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
                    updatedAt: new Date().toISOString(),
                }).then(() => {
                    console.log("✅ Active crop saved");
                    showPopup(`Napili: ${window.selectedCropData.name}`);
                    closeCropSelectionModal();

                    // Update monitoring (if you have this function)
                    if (typeof updateCropMonitoring === "function") {
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
document.addEventListener("DOMContentLoaded", function () {
    initDashboard();
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is signed in.");
    } else {
        console.log("User is signed out.");
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
    if (currentTime - dataTime > 300000) {
        // 5 minutes
        showOfflineState();
        return;
    }

    // --- Get Data Values ---
    // Handle cases where keys might be lowercase or capitalized based on your previous file usage
    const temp = sensorData.temperature > 0 ? sensorData.temperature : "--";
    const moisture =
        sensorData.moisture > 0 || sensorData.soilMoisture > 0
            ? sensorData.moisture || sensorData.soilMoisture
            : "--";
    const humidity = sensorData.humidity > 0 ? sensorData.humidity : "--";
    const ph =
        sensorData.ph > 0 || sensorData.pH > 0
            ? sensorData.ph || sensorData.pH
            : "--";
    const light = sensorData.light || sensorData.light_status || 0;

    // --- 2. Update Numeric Values in HTML ---
    document.getElementById("current-temperature").textContent =
        temp === "--" ? "-- °C" : `${temp} °C`;
    document.getElementById("current-soil-moisture").textContent =
        moisture === "--" ? "-- %" : `${moisture}%`;
    document.getElementById("current-humidity").textContent =
        humidity === "--" ? "-- %" : `${humidity}%`;
    document.getElementById("current-ph-level").textContent =
        ph === "--" ? "-- pH" : `${ph} pH`;

    // --- Update Text Status (The Logic) ---
    // We get the settings for the currently selected crop
    const currentCrop = allCropData[currentCropKey];

    if (currentCrop) {
        // Temperature Status
        updateStatusElement(
            "status-temp-text",
            temp,
            currentCrop.temperature.min,
            currentCrop.temperature.max,
            "Celsius",
        );
        // Humidity Status
        updateStatusElement(
            "status-humidity-text",
            humidity,
            currentCrop.humidity.min,
            currentCrop.humidity.max,
            "%",
        );
        // pH Status
        updateStatusElement(
            "status-ph-text",
            ph,
            currentCrop.ph.min,
            currentCrop.ph.max,
            "pH",
        );
        // Moisture Status
        updateStatusElement(
            "status-moisture-text",
            moisture,
            currentCrop.moisture.min,
            currentCrop.moisture.max,
            "%",
        );
    } else {
        // If no crop selected, just show "No Crop Selected"
        document.querySelectorAll(".status-message").forEach((el) => {
            el.textContent = "Pumili ng Pananim";
            el.className = "status-message status-warning";
        });
    }
    // --- Light Status Update ---
    // Assuming 1 = Bright/Light, 0 = Dark
    const lightText = light == 1 || light === "Light" ? "Maliwanag" : "Madilim";
    const lightClass =
        light == 1 || light === "Light" ? "status-good" : "status-warning";

    const lightEl = document.getElementById("light-status");
    const lightStatEl = document.getElementById("status-light-text");

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
        if (
            !lastPopupTime[elementId] ||
            now - lastPopupTime[elementId] > POPUP_COOLDOWN
        ) {
            showPopup(
                `⚠ <b>Babala!</b><br>
                 Ang kasalukuyang halaga (<b>${value}${unit}</b>) ay mas mababa kaysa sa itinakdang minimum (<b>${min}${unit}</b>).`,
            );
            lastPopupTime[elementId] = now;
        }
    } else if (value > max) {
        text = "Mataas";
        className += " status-danger";

        // 🔔 POPUP (Above Max)
        if (
            !lastPopupTime[elementId] ||
            now - lastPopupTime[elementId] > POPUP_COOLDOWN
        ) {
            showPopup(
                `🚨 <b>Babala!</b><br>
                 Ang kasalukuyang halaga (<b>${value}${unit}</b>) ay mas mataas kaysa sa itinakdang maximum (<b>${max}${unit}</b>).`,
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
    const customCropsJson = localStorage.getItem("customCrops");
    const customCrops = customCropsJson ? JSON.parse(customCropsJson) : {};
    allCropData = { ...PREDEFINED_CROP_DATA, ...customCrops };

    const lastSelectedCropKey = localStorage.getItem("selectedCropKey");
    if (lastSelectedCropKey && allCropData[lastSelectedCropKey]) {
        setCrop(lastSelectedCropKey, allCropData[lastSelectedCropKey]);
    } else {
        setCrop("none", {
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
    localStorage.setItem("selectedCropKey", cropKey);

    const cropNameEl = document.getElementById("currentCropName");
    const cropOptimalEl = document.getElementById("currentCropOptimal");

    if (cropNameEl) {
        cropNameEl.innerHTML = `<i class="fas fa-seedling"></i> ${cropInfo.name}`;
    }

    if (cropOptimalEl) {
        cropOptimalEl.textContent =
            cropInfo.name === "Walang napiling pananim"
                ? "Pumili ng crop para bantayan"
                : `Optimal: Temp ${cropInfo.temperature.min}-${cropInfo.temperature.max}°C, Moisture ${cropInfo.moisture.min}-${cropInfo.moisture.max}%, pH ${cropInfo.ph.min}-${cropInfo.ph.max}`;
    }

    const tempOptimal = document.getElementById("tempOptimal");
    const moistureOptimal = document.getElementById("moistureOptimal");
    const phOptimal = document.getElementById("phOptimal");
    const humidityOptimal = document.getElementById("humidityOptimal");

    if (tempOptimal)
        tempOptimal.textContent = `Optimal: ${cropInfo.temperature.min}-${cropInfo.temperature.max}°C`;
    if (moistureOptimal)
        moistureOptimal.textContent = `Optimal: ${cropInfo.moisture.min}-${cropInfo.moisture.max}%`;
    if (phOptimal)
        phOptimal.textContent = `Optimal: ${cropInfo.ph.min}-${cropInfo.ph.max}`;
    if (humidityOptimal)
        humidityOptimal.textContent = `Optimal: ${cropInfo.humidity.min}-${cropInfo.humidity.max}%`;

    syncPumpControlForCurrentCrop();
}
function initializeEventListeners() {
    console.log("✅ Initializing event listeners...");
    initializeModals();
}
function updateCurrentDate() {
    const now = new Date();
    const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    };
    const dateElement = document.getElementById("current-date");
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString("en-US", options);
    }
}

function updateLightStatus(status) {
    const lightValueElement = document.getElementById("light-status");
    if (!lightValueElement) return;

    if (status === "--" || status === null || status === undefined) {
        lightValueElement.textContent = "--";
    } else if (status === 1 || status === "Light" || status === "Maliwanag") {
        lightValueElement.textContent = "Light";
    } else {
        lightValueElement.textContent = "Dark";
    }
}

function updateSoilMoistureStatus(moistureLevel) {
    const statusElement = document.getElementById("soil-moisture-status");
    if (!statusElement) return;

    let status, message, className;

    if (moistureLevel < 20) {
        status = "Sobrang tuyo";
        message = "Kailangan agad ng Patubig";
        className = "status-dry";
    } else if (moistureLevel < 40) {
        status = "Tuyot";
        message = "Kailangan ng Patubig";
        className = "status-moderate";
    } else if (moistureLevel < 60) {
        status = "Mainam";
        message = "Perpektong kondition ng pag kabasa ng lupa";
        className = "status-optimal";
    } else if (moistureLevel < 80) {
        status = "Basa";
        message = "Sapat na kahalumigmigan";
        className = "status-wet";
    } else {
        status = "Sobra sa tubig";
        message = "Bawasan ang Tubig";
        className = "status-saturated";
    }

    statusElement.className = `moisture-status ${className}`;
    statusElement.innerHTML = `
        <p>Pagkabasa ng lupa: <b>${status}</b></p>
        <small>${message}</small>
    `;
}

function getNoneCropData() {
    return {
        name: "Walang napiling pananim",
        temperature: { min: 0, max: 0 },
        moisture: { min: 0, max: 0 },
        ph: { min: 0, max: 0 },
        humidity: { min: 0, max: 0 },
    };
}

async function loadActiveCropSelection() {
    const user = await getResolvedUser();
    if (!user) {
        return;
    }

    try {
        const snapshot = await get(ref(db, `users/${user.uid}/activeCrop`));
        if (!snapshot.exists()) {
            return;
        }

        const activeCrop = snapshot.val();
        const cropKey = activeCrop.cropKey || `active_${user.uid}`;
        const normalizedCrop = {
            name: activeCrop.name || "Walang napiling pananim",
            temperature: activeCrop.temperature || activeCrop.temp || { min: 0, max: 0 },
            moisture: activeCrop.moisture || { min: 0, max: 0 },
            ph: activeCrop.ph || { min: 0, max: 0 },
            humidity: activeCrop.humidity || { min: 0, max: 0 },
            isCustom: activeCrop.isCustom === true,
            pump_status: activeCrop.pump_status || "off",
        };

        allCropData[cropKey] = normalizedCrop;
        setCrop(cropKey, normalizedCrop);
    } catch (error) {
        console.error("Error loading active crop:", error);
    }
}

function getSelectedCustomCropKey() {
    if (!currentCropKey || currentCropKey === "none") {
        return null;
    }

    const crop = allCropData[currentCropKey];
    if (!crop || crop.isCustom !== true) {
        return null;
    }

    return currentCropKey;
}

async function syncPumpControlForCurrentCrop() {
    const cropKey = getSelectedCustomCropKey();

    if (!cropKey) {
        setPumpStatus("off");
        return;
    }

    try {
        const snapshot = await get(ref(db, `crop/${cropKey}`));
        const cropData = snapshot.val() || {};
        const status = cropData.pump_status === "on" ? "on" : "off";
        setPumpStatus(status);
    } catch (error) {
        console.error("Error loading pump status for crop:", error);
        setPumpStatus("off");
    }
}

async function persistPumpStatusForCurrentCrop(status) {
    const user = await getResolvedUser();
    const cropKey = getSelectedCustomCropKey();

    if (!user || !cropKey) {
        return;
    }

    try {
        await update(ref(db, `crop/${cropKey}`), {
            pump_status: status,
            user_id: user.uid,
            updatedAt: new Date().toISOString(),
        });

        const cropInfo = allCropData[cropKey];
        if (cropInfo) {
            cropInfo.pump_status = status;
        }
    } catch (error) {
        console.error("Error saving pump status for crop:", error);
    }
}

function initializePumpControls() {
    const pumpSwitch = document.getElementById("pump-switch");
    if (!pumpSwitch) return;

    setPumpStatus("off");

    pumpSwitch.addEventListener("change", function () {
        const newStatus = this.checked ? "on" : "off";
        setPumpStatus(newStatus);
        persistPumpStatusForCurrentCrop(newStatus);
    });

    console.log("✅ Pump controls initialized");
}

function setPumpStatus(status) {
    const pumpSwitch = document.getElementById("pump-switch");

    if (!pumpSwitch) return;

    // Update switch state
    pumpSwitch.checked = status === "on";

    currentPumpStatus = status;

    // Show notification if user triggered it
    if (document.activeElement === pumpSwitch) {
        const message = status === "on" ? " Patubig: ON" : " Patubig: OFF";
        showPumpNotification(message, status);
    }
}

function showPumpNotification(message, type) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === "on" ? "check-circle" : "times-circle"}"></i>
        ${message}
    `;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === "on" ? "#27ae60" : "#e74c3c"};
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
        notification.style.animation = "slideOut 0.3s ease";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
function initDashboard() {
    updateCurrentDate();
    loadAllCropData(); // **MODIFIED**: Load crop data (including custom) from storage
    loadActiveCropSelection();
    initializeNotificationBell();
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
    loadHistoryData("1h");

    // Load initial data
    loadHistoryData(currentTimeRange);
}

function initializeNotificationBell() {
    const bell = document.getElementById("notificationBell");
    const dropdown = document.getElementById("notificationDropdown");

    if (!bell || !dropdown) {
        return;
    }

    if (bell.dataset.initialized === "true") {
        return;
    }

    bell.dataset.initialized = "true";

    bell.addEventListener("click", (event) => {
        event.stopPropagation();
        dropdown.classList.toggle("hidden");

        if (!dropdown.classList.contains("hidden")) {
            unreadNotificationCount = 0;
            updateNotificationBadge();
        }
    });

    document.addEventListener("click", (event) => {
        const clickedInsideBell = bell.contains(event.target);
        const clickedInsideDropdown = dropdown.contains(event.target);

        if (!clickedInsideBell && !clickedInsideDropdown) {
            dropdown.classList.add("hidden");
        }
    });

    renderNotifications();
    updateNotificationBadge();
    startNotificationListener();
}

async function startNotificationListener() {
    if (notificationListenerStarted) {
        return;
    }

    const user = await getResolvedUser();
    if (!user?.uid) {
        return;
    }

    currentNotificationUserId = user.uid;

    const notificationsQuery = query(
        ref(db, `users/${user.uid}/notifications`),
        limitToLast(50),
    );

    onValue(
        notificationsQuery,
        (snapshot) => {
            const loaded = [];

            snapshot.forEach((childSnapshot) => {
                const value = childSnapshot.val() || {};
                loaded.push({
                    id: childSnapshot.key,
                    title: value.title || "Sensor Alert",
                    message: value.message || "May bagong sensor alert.",
                    timestamp:
                        getRecordTimestamp(value, childSnapshot.key) ||
                        Date.now(),
                });
            });

            loaded.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            sensorNotifications = loaded.slice(0, 30);
            renderNotifications();
        },
        (error) => {
            console.error("Failed to load persisted notifications:", error);
        },
    );

    notificationListenerStarted = true;
}

async function persistNotification(item) {
    if (!currentNotificationUserId || !item) {
        return;
    }

    try {
        await push(ref(db, `users/${currentNotificationUserId}/notifications`), {
            title: item.title,
            message: item.message,
            timestamp: item.timestamp || Date.now(),
        });
    } catch (error) {
        console.error("Failed to persist notification:", error);
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById("notificationBadge");
    if (!badge) {
        return;
    }

    if (unreadNotificationCount > 0) {
        badge.textContent = unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount);
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

function renderNotifications() {
    const list = document.getElementById("notificationList");
    if (!list) {
        return;
    }

    list.innerHTML = "";

    if (sensorNotifications.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "notif-empty";
        emptyItem.textContent = "Wala pang notifications.";
        list.appendChild(emptyItem);
        return;
    }

    sensorNotifications.forEach((item) => {
        const li = document.createElement("li");
        li.className = "notif-item";

        const title = document.createElement("div");
        title.className = "notif-title";
        title.textContent = item.title;

        const message = document.createElement("div");
        message.className = "notif-meta";
        message.textContent = item.message;

        const time = document.createElement("div");
        time.className = "notif-meta";
        time.textContent = formatTimestamp(item.timestamp);

        li.appendChild(title);
        li.appendChild(message);
        li.appendChild(time);
        list.appendChild(li);
    });
}

function getAlertStatus(value, min, max) {
    if (!Number.isFinite(value)) {
        return "normal";
    }

    if (value < min) {
        return "low";
    }

    if (value > max) {
        return "high";
    }

    return "normal";
}

function getThresholdsForCurrentCrop() {
    const activeCrop = allCropData[currentCropKey];

    return {
        temperature:
            activeCrop?.temperature || DEFAULT_SENSOR_THRESHOLDS.temperature,
        moisture: activeCrop?.moisture || DEFAULT_SENSOR_THRESHOLDS.moisture,
        humidity: activeCrop?.humidity || DEFAULT_SENSOR_THRESHOLDS.humidity,
        ph: activeCrop?.ph || DEFAULT_SENSOR_THRESHOLDS.ph,
    };
}

function pushSensorAlert(metric, status, value, min, max) {
    const metricLabelMap = {
        ph: "pH Level",
        temperature: "Temperature",
        moisture: "Soil Moisture",
        humidity: "Humidity",
    };

    const directionText = status === "low" ? "mababa" : "mataas";
    const roundedValue = Number.isFinite(value) ? Number(value).toFixed(metric === "ph" ? 2 : 1) : "--";
    const unitMap = {
        ph: "",
        temperature: "°C",
        moisture: "%",
        humidity: "%",
    };

    const metricLabel = metricLabelMap[metric] || metric;
    const unit = unitMap[metric] || "";

    const item = {
        title: `${metricLabel} Alert`,
        message: `${metricLabel} ay ${directionText}: ${roundedValue}${unit} (target ${min}-${max}${unit})`,
        timestamp: Date.now(),
    };

    unreadNotificationCount += 1;
    updateNotificationBadge();

    if (!notificationListenerStarted) {
        sensorNotifications.unshift(item);
        if (sensorNotifications.length > 30) {
            sensorNotifications = sensorNotifications.slice(0, 30);
        }
        renderNotifications();
    }

    showNotification(item.message, "off");
    persistNotification(item);
}

function evaluateSensorAlerts(latestReading) {
    if (!latestReading) {
        return;
    }

    const thresholds = getThresholdsForCurrentCrop();

    const values = {
        ph: Number(latestReading.pH ?? latestReading.ph ?? latestReading.phLevel),
        temperature: Number(latestReading.temperature),
        moisture: Number(latestReading.soilMoisture ?? latestReading.moisture),
        humidity: Number(latestReading.humidity),
    };

    Object.entries(values).forEach(([metric, value]) => {
        const range = thresholds[metric] || DEFAULT_SENSOR_THRESHOLDS[metric];
        const status = getAlertStatus(value, range.min, range.max);
        const stateKey = `${currentCropKey || "none"}:${metric}`;
        const previousStatus = sensorAlertStates[stateKey] || "normal";

        if (status !== "normal" && status !== previousStatus) {
            pushSensorAlert(metric, status, value, range.min, range.max);
        }

        sensorAlertStates[stateKey] = status;
    });
}

async function addMockSensorData(overrides = {}) {
    const user = await getResolvedUser();
    if (!user?.uid) {
        throw new Error("No logged in user. Please login first.");
    }

    const payload = {
        temperature: 26.5,
        soilMoisture: 62,
        humidity: 68,
        pH: 6.2,
        light: "LIGHT",
        timestamp: Date.now(),
        user_id: user.uid,
        ...overrides,
    };

    const newDataRef = push(ref(db, dbPath));
    await set(newDataRef, payload);

    console.log("✅ Mock sensor data added:", newDataRef.key, payload);
    return { key: newDataRef.key, payload };
}

async function addMockNotificationTest(type = "ph-low") {
    const scenarios = {
        normal: {
            temperature: 26,
            soilMoisture: 65,
            humidity: 65,
            pH: 6.3,
            light: "LIGHT",
        },
        "ph-low": {
            pH: 4.6,
            light: "DARK",
        },
        "ph-high": {
            pH: 8.2,
            light: "LIGHT",
        },
        "temp-high": {
            temperature: 40.2,
        },
        "moisture-low": {
            soilMoisture: 20,
        },
        "humidity-high": {
            humidity: 93,
        },
    };

    const selected = scenarios[type] || scenarios["ph-low"];
    return addMockSensorData(selected);
}

async function addMockNotificationSequence() {
    await addMockNotificationTest("normal");
    setTimeout(() => {
        addMockNotificationTest("ph-low").catch((error) => {
            console.error("Failed to insert mock alert sequence:", error);
        });
    }, 1200);
}

window.addMockSensorData = addMockSensorData;
window.addMockNotificationTest = addMockNotificationTest;
window.addMockNotificationSequence = addMockNotificationSequence;
//--------------------------------Firebase Data------------------------------------------
async function listenToFirebaseData() {
    const user = await getResolvedUser();
    if (!user?.uid) {
        showOfflineState();
        return;
    }

    const dataRef = ref(database, "sensorData");
    const readingsQuery = query(dataRef, limitToLast(50));

    onValue(
        readingsQuery,
        (snapshot) => {
            console.log("Firebase Data Received:", snapshot.val());

            if (snapshot.exists()) {
                let historyDataArray = [];

                // 1. Maintain Firebase chronological order for history array
                snapshot.forEach((childSnapshot) => {
                    const data = childSnapshot.val();
                    data.id = childSnapshot.key;
                    data.timestamp = getRecordTimestamp(data, childSnapshot.key);
                    historyDataArray.push(data);
                });

                historyDataArray = historyDataArray.filter((row) =>
                    isRecordOwnedByUser(row, user.uid),
                );

                if (historyDataArray.length === 0) {
                    updateHistoryTable([]);
                    showOfflineState();
                    return;
                }

                // 2. Update Global Variables for the Graph
                // We save the array here so updateAllCharts() can access it
                latestHistoryData = historyDataArray;

                // 3. Update the Table (Reverse so newest data is at the top)
                const tableData = [...historyDataArray].reverse();
                updateHistoryTable(tableData);

                // 4. Update Charts only if graph mode is active
                if (isGraphMode) {
                    updateAllCharts();
                }

                // 5. HEARTBEAT LOGIC (Real-time Status)
                const latestReading =
                    historyDataArray[historyDataArray.length - 1];
                const currentTime = Date.now();

                // Handle both numeric timestamps and string formats
                const dataTime =
                    typeof latestReading.timestamp === "number"
                        ? latestReading.timestamp
                        : new Date(latestReading.timestamp).getTime();

                const fiveMinutes = 5 * 60 * 1000;

                if (currentTime - dataTime > fiveMinutes) {
                    showOfflineState();
                } else {
                    // Device is active, update the UI cards
                    updateCurrentReadings(latestReading); // This is your old function
                    updateCurrentStatusCards(latestReading); // Add this line to call your NEW function
                    evaluateSensorAlerts(latestReading);
                }
            } else {
                showOfflineState();
            }
        },
        (error) => {
            console.error("Firebase History Data Listener Error: ", error);
        },
    );
}

// Function to reset display when hardware is disconnected
function showOfflineState() {
    // 1. Clear the big numbers/values
    const ids = [
        "current-temperature",
        "current-soil-moisture",
        "current-humidity",
        "current-ph-level",
        "light-status",
    ];
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "--";
    });

    // 2. Clear the "Kasalukuyang Status" labels (Mainam, Mababa, etc.)
    // This targets the specific status IDs in your welcome.blade.php
    const statusIds = [
        "status-temp-text",
        "status-moisture-text",
        "status-humidity-text",
        "status-ph-text",
        "status-light-text",
    ];

    statusIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = "Offline";
            el.style.color = "#e74c3c"; // Change text to Red
        }
    });

    // 3. Clear the side-panel moisture status if it exists
    const sideStatus = document.getElementById("soil-moisture-status");
    if (sideStatus) sideStatus.textContent = "Offline";
}

//-------------------------------History Table Time-------------------------------
/**
 * Formats a Firebase timestamp (milliseconds) into a compact, readable date and time.
 * @param {number} timestamp - The timestamp in milliseconds.
 * @returns {string} The formatted date and time string (e.g., "11/27/2025, 7:46:54 PM").
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);

    // Format: Nov 28, 2025 11:26 AM
    const formatter = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short", // Nov, Dec, etc.
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    return formatter.format(date);
}

function updateHistoryTable(dataArray) {
    const tableBody = document.getElementById("history-data");
    if (!tableBody) {
        console.warn("Table body element with ID 'history-data' not found.");
        return;
    }

    tableBody.innerHTML = ""; // Clear previous data

    // If dataArray is empty, the table will simply be empty.
    dataArray.forEach((data) => {
        // Use the 'timestamp' from Firebase (e.g., "2025-11-26 20:13:35")
        const rawTime = data.timestamp || data.id;

        // 💡 CRITICAL: If formatTimestamp is missing or buggy, the loop stops here!
        let timeString = formatTimestamp(rawTime);

        const row = document.createElement("tr");

        // Inserting data into the table row using the correct Firebase keys
        row.innerHTML = `
            <td>${timeString}</td>
            <td>${data.soilMoisture || "N/A"}%</td>  
            <td>${data.humidity || "N/A"}%</td>                       
            <td>${data.temperature || "N/A"}°C</td>                   
            <td>${data.light || "N/A"}</td>                         
            <td>${data.pH || "N/A"} pH</td>              
        `;
        tableBody.appendChild(row);
    });
}
// --- NEW: Function to update the top cards with the latest reading ---
function updateCurrentStatusCards(latestData) {
    if (!latestData) {
        return;
    }

    const temperatureEl = document.getElementById("current-temperature");
    const moistureEl = document.getElementById("current-soil-moisture");
    const phEl = document.getElementById("current-ph-level");
    const humidityEl = document.getElementById("current-humidity");

    const temperature = latestData.temperature;
    const moisture = latestData.moisture ?? latestData.soilMoisture;
    const ph = latestData.ph ?? latestData.pH ?? latestData.phLevel;
    const humidity = latestData.humidity;

    if (temperatureEl) {
        temperatureEl.textContent =
            temperature === null || temperature === undefined
                ? "N/A °C"
                : `${temperature} °C`;
    }

    if (moistureEl) {
        moistureEl.textContent =
            moisture === null || moisture === undefined
                ? "N/A %"
                : `${moisture}%`;
    }

    if (phEl) {
        phEl.textContent =
            ph === null || ph === undefined ? "N/A pH" : `${ph} pH`;
    }

    if (humidityEl) {
        humidityEl.textContent =
            humidity === null || humidity === undefined
                ? "N/A %"
                : `${humidity}%`;
    }

    // Update Soil Moisture Status Text
    updateSoilMoistureStatus(
        latestData.moisture || latestData.soilMoisture || 0,
    );

    // Update Light Status (Assuming 1 is Light, 0 is Dark)
    const lightVal =
        latestData.light === 1 || latestData.light === "Light" ? 1 : 0;
    updateLightStatus(lightVal);
}

// Modal handling
function initializeModals() {
    // ---  Get all modal elements ---
    const selectCropModal = document.getElementById("selectCropModal");
    const addCropModal = document.getElementById("addCropModal");
    const editDeleteCropModal = document.getElementById("editDeleteCropModal"); // **NEW**

    // --- Get buttons that open modals ---
    const selectCropBtn = document.getElementById("selectCropBtn");
    const addCropBtn = document.getElementById("addCropBtn");
    const deleteCropBtn = document.getElementById("deleteCropBtn"); // **NEW**

    // ---  Get all close buttons ---
    const closeButtons = document.querySelectorAll(".close-modal");

    // ---  Open Modals ---
    // Check if the elements exist before adding listeners
    if (selectCropBtn && selectCropModal) {
        selectCropBtn.addEventListener("click", () => {
            renderCropOptions(); // **MODIFIED**: Render crops before opening
            selectCropModal.style.display = "flex";
        });
    }

    if (addCropBtn && addCropModal) {
        addCropBtn.addEventListener("click", () => {
            addCropModal.style.display = "flex";
        });
    }

    // ---  Close Modals (with 'x' buttons) ---
    closeButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
            // Find the parent modal and hide it
            event.target.closest(".modal").style.display = "none";
        });
    });
    // ---  Close Modals (by clicking outside) ---
    window.addEventListener("click", (event) => {
        if (event.target === selectCropModal) {
            selectCropModal.style.display = "none";
        }
        if (event.target === addCropModal) {
            addCropModal.style.display = "none";
        }
        if (event.target === editDeleteCropModal) {
            // **NEW**
            editDeleteCropModal.style.display = "none";
        }
    });
    // ---  Confirm Crop Selection Button ---
    document.getElementById("confirmCropBtn").addEventListener("click", async () => {
        // Find the currently selected crop (which now includes custom ones)
        const selectedOption = document.querySelector(
            "#selectCropModal .crop-option.selected",
        );
        if (selectedOption) {
            const selectedCropKey = selectedOption.getAttribute("data-crop");
            const selectedCropData = allCropData[selectedCropKey];
            setCrop(selectedCropKey, selectedCropData);

            const user = await getResolvedUser();
            if (user && selectedCropData) {
                try {
                    await set(ref(db, `users/${user.uid}/activeCrop`), {
                        cropKey: selectedCropKey,
                        name: selectedCropData.name,
                        temperature: selectedCropData.temperature,
                        moisture: selectedCropData.moisture,
                        ph: selectedCropData.ph,
                        humidity: selectedCropData.humidity,
                        pump_status:
                            selectedCropData.pump_status === "on" ? "on" : "off",
                        isCustom: selectedCropData.isCustom === true,
                        updatedAt: new Date().toISOString(),
                    });
                } catch (error) {
                    console.error("Error saving active crop:", error);
                }
            }

            selectCropModal.style.display = "none"; // Hide modal
            document
                .querySelectorAll("#selectCropModal .crop-option")
                .forEach((o) => o.classList.remove("selected")); // Clear selection
        } else {
            alert("Please select a crop");
        }
    });
    // ---  Add Custom Crop Form ---
    document.getElementById("addCropForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const cropName = document.getElementById("customCropName").value;
        const tempMin = parseFloat(document.getElementById("tempMin").value);
        const tempMax = parseFloat(document.getElementById("tempMax").value);
        const moistureMin = parseFloat(
            document.getElementById("moistureMin").value,
        );
        const moistureMax = parseFloat(
            document.getElementById("moistureMax").value,
        );
        const phMin = parseFloat(document.getElementById("phMin").value);
        const phMax = parseFloat(document.getElementById("phMax").value);
        const humidityMin = parseFloat(
            document.getElementById("humidityMin").value,
        );
        const humidityMax = parseFloat(
            document.getElementById("humidityMax").value,
        );

        // Create custom crop object
        const customCrop = {
            name: cropName,
            temperature: { min: tempMin, max: tempMax },
            moisture: { min: moistureMin, max: moistureMax },
            ph: { min: phMin, max: phMax },
            humidity: { min: humidityMin, max: humidityMax },
            isCustom: true, // Mark as custom
        };
    });

    // --- **NEW** Edit Crop Form Submission ---
    document
        .getElementById("editCropForm")
        .addEventListener("submit", async (e) => {
        e.preventDefault();
        const cropKey = document.getElementById("editCropKey").value;
        const cropName = document.getElementById("editCustomCropName").value;
        const tempMin = parseFloat(
            document.getElementById("editTempMin").value,
        );
        const tempMax = parseFloat(
            document.getElementById("editTempMax").value,
        );
        const moistureMin = parseFloat(
            document.getElementById("editMoistureMin").value,
        );
        const moistureMax = parseFloat(
            document.getElementById("editMoistureMax").value,
        );
        const phMin = parseFloat(document.getElementById("editPhMin").value);
        const phMax = parseFloat(document.getElementById("editPhMax").value);
        const humidityMin = parseFloat(
            document.getElementById("editHumidityMin").value,
        );
        const humidityMax = parseFloat(
            document.getElementById("editHumidityMax").value,
        );

        // Update the custom crop object
        const updatedCrop = {
            name: cropName,
            temperature: { min: tempMin, max: tempMax },
            moisture: { min: moistureMin, max: moistureMax },
            ph: { min: phMin, max: phMax },
            humidity: { min: humidityMin, max: humidityMax },
            isCustom: true,
        };

        const user = await getResolvedUser();
        if (!user) {
            showPopup("Mag-login muna bago mag-edit ng crop.");
            return;
        }

        try {
            await update(ref(db, `crop/${cropKey}`), {
                name: updatedCrop.name,
                user_id: user.uid,
                temp: updatedCrop.temperature,
                moisture: updatedCrop.moisture,
                ph: updatedCrop.ph,
                humidity: updatedCrop.humidity,
                updatedAt: new Date().toISOString(),
            });

            allCropData[cropKey] = {
                ...updatedCrop,
                user_id: user.uid,
            };

            if (currentCropKey === cropKey) {
                setCrop(cropKey, allCropData[cropKey]);
            }

            document.getElementById("editDeleteCropModal").style.display =
                "none";
            await renderCropOptions();
            showPopup("Tagumpay! Na-update ang crop.");
        } catch (error) {
            console.error("Error updating crop:", error);
            showPopup("Hindi ma-update ang crop: " + error.message);
        }
    });

    if (deleteCropBtn) {
        deleteCropBtn.addEventListener("click", async () => {
            const cropKey = document.getElementById("editCropKey").value;
            if (!cropKey) {
                showPopup("Walang napiling crop para burahin.");
                return;
            }

            const shouldDelete = window.confirm(
                "Sigurado ka bang gusto mong burahin ang crop na ito?",
            );
            if (!shouldDelete) {
                return;
            }

            const user = await getResolvedUser();
            if (!user) {
                showPopup("Mag-login muna bago magbura ng crop.");
                return;
            }

            try {
                await remove(ref(db, `crop/${cropKey}`));

                delete allCropData[cropKey];

                if (currentCropKey === cropKey) {
                    setCrop("none", {
                        name: "Walang napiling pananim",
                        temperature: { min: 0, max: 0 },
                        moisture: { min: 0, max: 0 },
                        ph: { min: 0, max: 0 },
                        humidity: { min: 0, max: 0 },
                    });
                }

                document.getElementById("editDeleteCropModal").style.display =
                    "none";
                await renderCropOptions();
                showPopup("Nabura na ang crop.");
            } catch (error) {
                console.error("Error deleting crop:", error);
                showPopup("Hindi mabura ang crop: " + error.message);
            }
        });
    }
}

// **NEW FUNCTION** to render all crop options in the modal
async function renderCropOptions() {
    const cropGrid = document.querySelector("#selectCropModal .crop-grid");
    if (!cropGrid) return;

    cropGrid.innerHTML = ""; // Clear existing content

    const user = await getResolvedUser();
    if (!user) {
        cropGrid.innerHTML = `<div class="crop-selection-empty" style="padding:12px;text-align:center;">Mag-login muna para makita ang iyong crops.</div>`;
        allCropData = {};
        return;
    }

    let customCrops = {};
    try {
        const snapshot = await get(getUserCropsQuery(user.uid));
        const rawCrops = snapshot.val() || {};

        Object.entries(rawCrops).forEach(([key, crop]) => {
            customCrops[key] = {
                name: crop.name,
                temperature: crop.temperature || crop.temp || { min: 0, max: 0 },
                moisture: crop.moisture || { min: 0, max: 0 },
                ph: crop.ph || { min: 0, max: 0 },
                humidity: crop.humidity || { min: 0, max: 0 },
                isCustom: true,
                user_id: crop.user_id || user.uid,
            };
        });
    } catch (error) {
        console.error("Error loading user crops for modal:", error);
        cropGrid.innerHTML = `<div class="crop-selection-empty" style="padding:12px;text-align:center;">Hindi ma-load ang iyong crops. I-check ang Firebase read rules para sa /crop.</div>`;
        allCropData = {};
        return;
    }

    allCropData = customCrops;

    if (Object.keys(allCropData).length === 0) {
        cropGrid.innerHTML = `<div class="crop-selection-empty" style="padding:12px;text-align:center;">Wala ka pang custom crop. Magdagdag muna ng pananim.</div>`;
        return;
    }

    // Iterate only user-created crops
    Object.entries(allCropData).forEach(([key, crop]) => {
        const optionDiv = document.createElement("div");
        optionDiv.className = "crop-option custom";
        optionDiv.setAttribute("data-crop", key);

        // Add selected class if this crop is currently active
        if (currentCropKey === key) {
            optionDiv.classList.add("selected");
        }

        let innerHTML = `
            <i class="fas fa-seedling crop-icon-small"></i>
            <div class="crop-name-small">${crop.name}</div>
        `;

        // Add edit button for user-created crops
        innerHTML += `
            <div class="crop-actions">
                <button class="edit-btn" data-key="${key}">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        `;

        optionDiv.innerHTML = innerHTML;

        // Event listener for selecting the crop
        optionDiv.addEventListener("click", (e) => {
            // If click target is not an edit/delete button, select the crop
            if (!e.target.closest(".crop-actions button")) {
                document
                    .querySelectorAll("#selectCropModal .crop-option")
                    .forEach((o) => o.classList.remove("selected"));
                optionDiv.classList.add("selected");
            }
        });

        // Event listener for the Edit button
        const editBtn = optionDiv.querySelector(".edit-btn");
        if (editBtn) {
            editBtn.addEventListener("click", (e) => {
                e.stopPropagation(); // Stop click from propagating to the option div
                openEditDeleteModal(key);
            });
        }

        cropGrid.appendChild(optionDiv);
    });
}

// **NEW FUNCTION** to open the edit modal
function openEditDeleteModal(cropKey) {
    const crop = allCropData[cropKey];
    const editDeleteCropModal = document.getElementById("editDeleteCropModal");

    if (!crop || !crop.isCustom) return; // Should only open for custom crops

    // Set the hidden key
    document.getElementById("editCropKey").value = cropKey;

    // Set modal title
    document.getElementById("editDeleteCropTitle").textContent =
        `Edit Crop: ${crop.name}`;

    // Populate form fields
    document.getElementById("editCustomCropName").value = crop.name;
    document.getElementById("editTempMin").value = crop.temperature.min;
    document.getElementById("editTempMax").value = crop.temperature.max;
    document.getElementById("editMoistureMin").value = crop.moisture.min;
    document.getElementById("editMoistureMax").value = crop.moisture.max;
    document.getElementById("editPhMin").value = crop.ph.min;
    document.getElementById("editPhMax").value = crop.ph.max;
    document.getElementById("editHumidityMin").value = crop.humidity.min;
    document.getElementById("editHumidityMax").value = crop.humidity.max;

    // Show the modal
    editDeleteCropModal.style.display = "flex";
}
//-------------------------------History Table Time Buttons-------------------------------
function initializeTimeFilters() {
    const timeFilters = document.querySelectorAll(".time-filter");

    timeFilters.forEach((filter) => {
        filter.addEventListener("click", () => {
            // Remove active class from all filters
            timeFilters.forEach((f) => f.classList.remove("active"));

            // Add active class to clicked filter
            filter.classList.add("active");

            // Get time range
            currentTimeRange = filter.getAttribute("data-time");

            // Show loading state
            showLoadingState();

            // Load data for selected time range
            loadHistoryData(currentTimeRange);
        });
    });
}
// ==================== LOADING STATE MANAGEMENT FOR HISTORY TABLE ====================
function showLoadingState() {
    const historyTable = document.getElementById("history-table");
    const table = historyTable.querySelector("table");
    const loadingDiv = historyTable.querySelector(".history-loading");

    if (table) table.style.display = "none";
    if (loadingDiv) {
        loadingDiv.style.display = "block";
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
    const historyTable = document.getElementById("history-table");
    const table = historyTable.querySelector("table");
    const loadingDiv = historyTable.querySelector(".history-loading");
    const emptyState = historyTable.querySelector(".history-empty");

    if (loadingDiv) loadingDiv.style.display = "none";
    if (emptyState) emptyState.remove();
    if (table) table.style.display = "table";
}

function showEmptyState(range) {
    const historyTable = document.getElementById("history-table");
    const loadingDiv = historyTable.querySelector(".history-loading");
    const table = historyTable.querySelector("table");

    if (loadingDiv) loadingDiv.style.display = "none";
    if (table) table.style.display = "none";

    // Dynamic message based on time range
    let timeMessage = "";
    switch (range) {
        case "1h":
            timeMessage = "sa nakaraang 1 oras";
            break;
        case "6h":
            timeMessage = "sa nakaraang 6 oras";
            break;
        case "24h":
            timeMessage = "sa nakaraang 24 oras";
            break;
        case "7d":
            timeMessage = "sa nakaraang 7 araw";
            break;
        case "all":
            timeMessage = "sa lahat ng panahon";
            break;
        default:
            timeMessage = "sa napiling oras";
    }

    let emptyState = historyTable.querySelector(".history-empty");
    if (!emptyState) {
        emptyState = document.createElement("div");
        emptyState.className = "history-empty";
        historyTable.appendChild(emptyState);
    }

    emptyState.innerHTML = `
        <i class="fas fa-database"></i>
        <h3>Walang Nakuhang Data</h3>
        <p>Walang natagpuang sensor readings ${timeMessage}.</p>
    `;
}
// ==================== ENHANCED DATA LOADING ====================
async function loadHistoryData(range) {
    const user = await getResolvedUser();
    if (!user?.uid) {
        showEmptyState(range);
        return;
    }

    const now = Date.now();
    let startTime;
    let limitCount = 100;

    if (range === "all") {
        startTime = 0;
        limitCount = 5000;
    } else
        switch (range) {
            case "1h":
                startTime = now - 60 * 60 * 1000;
                break;
            case "6h":
                startTime = now - 6 * 60 * 60 * 1000;
                break;
            case "24h":
                startTime = now - 24 * 60 * 60 * 1000;
                break;
            case "7d":
                startTime = now - 7 * 24 * 60 * 60 * 1000;
                limitCount = 200;
                break;
            default:
                startTime = now - 60 * 60 * 1000;
        }

    const historyQuery = query(ref(db, dbPath), limitToLast(limitCount));

    try {
        onValue(
            historyQuery,
            (snapshot) => {
                let dataArray = [];
                snapshot.forEach((childSnapshot) => {
                    const raw = childSnapshot.val() || {};
                    dataArray.push({
                        id: childSnapshot.key,
                        ...raw,
                        timestamp: getRecordTimestamp(raw, childSnapshot.key),
                    });
                });

                dataArray = dataArray.filter((row) =>
                    isRecordOwnedByUser(row, user.uid),
                );

                dataArray = dataArray.filter(
                    (row) => (row.timestamp || 0) >= startTime,
                );

                // Sort by timestamp descending (newest first)
                dataArray.sort(
                    (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
                );

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
            },
            { onlyOnce: true },
        );
    } catch (error) {
        console.error("Error loading history data:", error);
        showEmptyState(range);
    }
}
// ==================== IMPROVED TABLE POPULATION ====================
function populateHistoryTable(dataArray) {
    const tbody = document.getElementById("history-data");
    const table = document.querySelector("#history-table table");

    if (!tbody || !table) return;

    // Clear existing rows
    tbody.innerHTML = "";

    // Helper function to get color class for values
    function getColorClass(value, type) {
        if (!value || value === "--" || value === "Offline") return "";

        const numValue = parseFloat(value);
        if (isNaN(numValue)) return "";

        switch (type) {
            case "temperature":
                // Blue (Below): < 22°C, Green (Normal): 22°C - 28°C, Red (Above): > 28°C
                if (numValue < 22) return "value-cold";
                if (numValue >= 22 && numValue <= 28) return "value-normal";
                if (numValue > 28) return "value-hot";
                break;

            case "moisture":
                // Blue (Below): < 50%, Green (Normal): 50% - 80%, Red (Above): > 80%
                if (numValue < 50) return "value-low";
                if (numValue >= 50 && numValue <= 80) return "value-normal";
                if (numValue > 80) return "value-high";
                break;

            case "humidity":
                // Blue (Below): < 50%, Green (Normal): 50% - 80%, Red (Above): > 80%
                if (numValue < 50) return "value-low";
                if (numValue >= 50 && numValue <= 80) return "value-normal";
                if (numValue > 80) return "value-high";
                break;

            case "ph":
                // Orange (Below): < 5.5, Green (Normal): 5.5 - 6.5, Blue (Above): > 6.5
                if (numValue < 5.5) return "value-acidic";
                if (numValue >= 5.5 && numValue <= 6.5) return "value-normal";
                if (numValue > 6.5) return "value-alkaline";
                break;
        }
        return "";
    }

    // Helper function to format value or show "Offline"
    function formatValue(value, unit = "") {
        if (!value || value === "--" || value === null || value === undefined) {
            return '<span class="offline-status">Offline</span>';
        }
        return value + unit;
    }

    // Populate with new data
    dataArray.forEach((row) => {
        const tr = document.createElement("tr");

        const formattedTime = formatTimestamp(row.timestamp || row.id);

        const moistureValue = row.soilMoisture || row.moisture;
        const humidityValue = row.humidity;
        const temperatureValue = row.temperature;
        const phValue = row.phLevel || row.pH;
        const lightValue = row.lightStatus || row.light;

        tr.innerHTML = `
            <td>${formattedTime}</td>
            <td class="${getColorClass(moistureValue, "moisture")}">${formatValue(moistureValue, "%")}</td>
            <td class="${getColorClass(humidityValue, "humidity")}">${formatValue(humidityValue, "%")}</td>
            <td class="${getColorClass(temperatureValue, "temperature")}">${formatValue(temperatureValue, "°C")}</td>
            <td>${lightValue || '<span class="offline-status">Offline</span>'}</td>
            <td class="${getColorClass(phValue, "ph")}">${formatValue(phValue, "")}</td>
        `;

        tbody.appendChild(tr);
    });

    // Show the table
    table.style.display = "table";
}
//-------------------------------Export Data Functionality-------------------------------
function initializeExportListeners() {
    // We add a small delay to ensure the DOM has fully parsed the button element.
    // This is the most reliable way to fix the "null" error in complex initialization flows.
    setTimeout(() => {
        const exportButton = document.getElementById("export-button");

        if (exportButton) {
            exportButton.addEventListener("click", () => {
                console.log("Export button clicked.");

                // Get the currently active time range from the buttons
                // Assumes your time range buttons have the class 'time-range-btn'
                const activeButton = document.querySelector(
                    ".time-range-btn.active",
                );

                // Default to '24h' if no button is active
                const range = activeButton
                    ? activeButton.getAttribute("data-range")
                    : "24h";

                // Call the function to fetch data and export it
                fetchAndExportData(range);
            });
        } else {
            console.error(
                "ERROR: Export button with ID 'export-button' not found after loading delay.",
            );
        }
    }, 100); // Wait for 100 milliseconds
}
// Make sure this function is called inside your main initialization/DOMContentLoaded block.

//-------------------------------Graph Mode Toggle-------------------------------
function initializeGraphMode() {
    const toggleBtn = document.getElementById("graph-mode-toggle");
    const tableView = document.getElementById("history-table");
    const graphView = document.getElementById("history-graph");

    console.log("🎨 Initializing Graph Mode...");
    console.log("  Toggle button:", toggleBtn ? "✅ Found" : "❌ Not found");
    console.log("  Table view:", tableView ? "✅ Found" : "❌ Not found");
    console.log("  Graph view:", graphView ? "✅ Found" : "❌ Not found");

    if (!toggleBtn) {
        console.error("❌ Graph toggle button not found!");
        return;
    }

    // Prevent duplicate listeners if called more than once
    if (toggleBtn.dataset.graphModeInitialized) return;
    toggleBtn.dataset.graphModeInitialized = "true";

    toggleBtn.addEventListener("click", () => {
        console.log("🖱️ Graph mode button clicked!");
        console.log("  Current isGraphMode:", isGraphMode);

        isGraphMode = !isGraphMode;
        console.log("  New isGraphMode:", isGraphMode);

        if (isGraphMode) {
            console.log("📊 Switching to GRAPH mode...");

            // Hide table
            if (tableView) {
                tableView.classList.add("hidden");
                tableView.style.display = "none";
                console.log("  ✅ Table hidden");
            }

            // Show graph
            if (graphView) {
                graphView.classList.remove("hidden");
                graphView.style.display = "grid"; // Force grid display

                // Force browser reflow
                void graphView.offsetHeight;

                console.log("  ✅ Graph shown");
                console.log(
                    "  📏 Graph dimensions:",
                    graphView.offsetWidth,
                    "x",
                    graphView.offsetHeight,
                );
            }

            toggleBtn.innerHTML = '<i class="fas fa-table"></i> Table Mode';

            // Update charts with delay
            console.log("  📊 Creating bar charts...");
            console.log(
                "  Data available:",
                latestHistoryData ? latestHistoryData.length : 0,
                "entries",
            );

            setTimeout(() => {
                // Force all canvases to be visible
                const canvases = graphView.querySelectorAll("canvas");
                canvases.forEach((canvas) => {
                    canvas.style.display = "block";
                    canvas.style.visibility = "visible";
                });

                // Force browser reflow again
                void graphView.offsetHeight;

                // Destroy old charts first
                Object.keys(chartInstances).forEach((key) => {
                    if (chartInstances[key]) {
                        chartInstances[key].destroy();
                        delete chartInstances[key];
                    }
                });

                // Create new bar charts
                updateAllCharts();

                console.log("  ✅ Bar charts created!");
                console.log("  📊 Active charts:", Object.keys(chartInstances));
            }, 700); // Increased delay for better rendering
        } else {
            // Switch BACK to TABLE mode
            console.log("📋 Switching to TABLE mode...");

            // Hide graph
            if (graphView) {
                graphView.classList.add("hidden");
                graphView.style.display = "none";
                console.log("  ✅ Graph hidden");
            }

            // Show table
            if (tableView) {
                tableView.classList.remove("hidden");
                tableView.style.display = "block";
                console.log("  ✅ Table shown");
            }

            // Update button text back to Graph Mode
            toggleBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Graph Mode';

            console.log("  ✅ Switched back to table mode!");
        }
    });
}
//-------------------------------Export Data Functionality-------------------------------
function initializeExportButton() {
    const exportButton = document.getElementById("export-button");

    if (exportButton) {
        exportButton.addEventListener("click", () => {
            if (latestHistoryData && latestHistoryData.length > 0) {
                exportDataToCSV(latestHistoryData, currentTimeRange);
            } else {
                alert(
                    "Walang data na mai-export. Subukang pumili ng ibang time range.",
                );
            }
        });
    }
}

// Enhanced CSV export with better formatting
function exportDataToCSV(dataArray, range) {
    if (dataArray.length === 0) {
        alert("Walang data na mai-export.");
        return;
    }

    // Define CSV headers
    const headers = [
        "Date Time",
        "Soil Moisture (%)",
        "Humidity (%)",
        "Temperature (°C)",
        "Light Status",
        "pH Level",
    ];

    // Start CSV content
    let csvContent = headers.join(",") + "\n";

    // Add data rows
    dataArray.forEach((row) => {
        const formattedTimestamp = formatTimestamp(row.timestamp || row.id);
        const quotedTimestamp = `"${formattedTimestamp}"`;

        const rowData = [
            quotedTimestamp,
            row.soilMoisture || row.moisture || "",
            row.humidity || "",
            row.temperature || "",
            row.lightStatus || row.light || "",
            row.phLevel || row.pH || "",
        ];
        csvContent += rowData.join(",") + "\n";
    });

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);

    const dateStr = new Date().toISOString().split("T")[0];
    const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
    a.setAttribute(
        "download",
        `agriknows-data-${range}-${dateStr}-${timeStr}.csv`,
    );

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Show success notification
    showNotification(
        `Matagumpay na na-export ang ${dataArray.length} entries!`,
        "on",
    );
}

// ==================== CALL INITIALIZATION ON PAGE LOAD ====================
// initializeDataHistory() is already called inside initDashboard() — no duplicate needed here.

//------------------------------- Irrigation/Pump Control Functionality-------------------------------

//------------------------------- Irrigation notifcation-------------------------------
function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === "on" ? "check-circle" : "times-circle"}"></i>
        ${message}
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === "on" ? "#27ae60" : "#e74c3c"};
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
    const labels = dataToGraph.map((d) => {
        const timeStr = formatTimestamp(d.timestamp || d.id);
        const parts = timeStr.split(" ");
        // Return only the time part
        if (parts.length >= 2) return parts.slice(1).join(" ");
        return timeStr;
    });

    // Extract Data Values
    const moistureData = dataToGraph.map(
        (d) => d.soilMoisture || d.moisture || 0,
    );
    const humidityData = dataToGraph.map((d) => d.humidity || 0);
    const tempData = dataToGraph.map((d) => d.temperature || 0);
    const phData = dataToGraph.map((d) => d.pH || d.phLevel || 0);

    // Render each chart with enhanced styling
    renderEnhancedChart(
        "soil-moisture-chart",
        "Pagkabasa ng Lupa (%)",
        labels,
        moistureData,
        "#3498db",
        0,
        100,
        10,
    );
    renderEnhancedChart(
        "humidity-chart",
        "Halumigmig (%)",
        labels,
        humidityData,
        "#2980b9",
        0,
        100,
        10,
    );
    renderEnhancedChart(
        "temperature-chart",
        "Temperatura (°C)",
        labels,
        tempData,
        "#e74c3c",
        0,
        50,
        5,
    );
    renderEnhancedChart(
        "ph-level-chart",
        "Antas ng pH",
        labels,
        phData,
        "#9b59b6",
        0,
        14,
        2,
    );
}
function renderEnhancedChart(
    canvasId,
    label,
    labels,
    data,
    color,
    yMin,
    yMax,
    yStep,
) {
    const ctxElement = document.getElementById(canvasId);
    if (!ctxElement) {
        console.warn("Canvas not found:", canvasId);
        return;
    }

    console.log(
        "📊 Creating chart:",
        canvasId,
        "with",
        data.length,
        "data points",
    );

    const ctx = ctxElement.getContext("2d");

    // Destroy old chart instance if it exists
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
        console.log("  🗑️ Old chart destroyed");
    }

    // Create new Chart instance with BAR TYPE
    chartInstances[canvasId] = new Chart(ctx, {
        type: "bar", // ← CHANGED FROM 'line' TO 'bar'
        data: {
            labels: labels,
            datasets: [
                {
                    label: label,
                    data: data,
                    backgroundColor: color + "99", // Semi-transparent bars
                    borderColor: color,
                    borderWidth: 2,
                    borderRadius: 6, // Rounded corners on bars
                    borderSkipped: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index",
            },
            scales: {
                y: {
                    min: yMin,
                    max: yMax,
                    beginAtZero: true,
                    grid: {
                        color: "rgba(0,0,0,0.05)",
                        drawBorder: false,
                    },
                    ticks: {
                        stepSize: yStep,
                        color: "#6b7280",
                        font: { size: 12, weight: "500" },
                        padding: 8,
                        callback: function (value) {
                            return (
                                value +
                                (label.includes("°C")
                                    ? "°C"
                                    : label.includes("pH")
                                      ? ""
                                      : "%")
                            );
                        },
                    },
                    title: {
                        display: true,
                        text: "Value",
                        color: "#374151",
                        font: { size: 13, weight: "600" },
                    },
                },
                x: {
                    display: true,
                    grid: {
                        display: false,
                        drawBorder: false,
                    },
                    ticks: {
                        color: "#6b7280",
                        font: { size: 11, weight: "500" },
                        maxRotation: 45,
                        minRotation: 45,
                    },
                    title: {
                        display: true,
                        text: "Oras",
                        color: "#374151",
                        font: { size: 13, weight: "600" },
                    },
                },
            },
            plugins: {
                legend: {
                    display: false, // Hide legend for cleaner look
                },
                title: {
                    display: true,
                    text: label,
                    font: { size: 16, weight: "bold" },
                    color: "#1f2937",
                    padding: { bottom: 15, top: 5 },
                },
                tooltip: {
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    padding: 12,
                    titleFont: { size: 13, weight: "bold" },
                    bodyFont: { size: 12 },
                    bodySpacing: 4,
                    borderColor: color,
                    borderWidth: 2,
                    displayColors: true,
                    callbacks: {
                        label: function (context) {
                            let value = context.parsed.y;
                            let unit = "";
                            if (label.includes("°C")) unit = "°C";
                            else if (label.includes("pH")) unit = "";
                            else unit = "%";
                            return `${label}: ${value.toFixed(1)}${unit}`;
                        },
                    },
                },
            },
        },
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
    const indicator = document.getElementById("refresh-indicator");
    if (indicator) {
        indicator.classList.add("active");
    }
}

function hideRefreshIndicator() {
    const indicator = document.getElementById("refresh-indicator");
    if (indicator) {
        indicator.classList.remove("active");
    }
}

