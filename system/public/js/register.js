import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    update,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

const firebaseConfig = {
        apiKey: "AIzaSyCq4lH4tj4AS9-cqvM29um--Nu4v2UdvZw",
        authDomain: "agriknows-data.firebaseapp.com",
        databaseURL: "https://agriknows-data-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "agriknows-data",
        storageBucket: "agriknows-data.firebasestorage.app",
        messagingSenderId: "922008629713",
        appId: "1:922008629713:web:5cf15ca9d47036b9a8f0f0"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

async function ensureUserProfileInDatabase(user, preferredName = null, isNew = false) {
    const userRef = ref(db, `users/${user.uid}`);
    const fallbackName = user.email ? user.email.split("@")[0] : "User";
    const username = preferredName || user.displayName || fallbackName;

    const baseData = {
        username,
        email: user.email || "",
        provider: user.providerData?.[0]?.providerId || "password",
    };


    if (isNew) {
        await set(userRef, {
            ...baseData,
            createdAt: new Date().toISOString(),
            user_id: user.uid,
        });

        // Save predefined crops for the new user
        // Import or redefine PREDEFINED_CROP_DATA here if not available
        const predefinedCrops = {
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
        // Save to /crop with user_id
        const db = getDatabase();
        const cropBasePath = ref(db, "crop");
        const updates = {};
        Object.entries(predefinedCrops).forEach(([key, crop]) => {
            // Generate a unique key for each crop
            const newCropRef = ref(db, `crop/${user.uid}_${key}`);
            updates[`${user.uid}_${key}`] = {
                ...crop,
                user_id: user.uid,
                createdAt: new Date().toISOString(),
                isPredefined: true,
            };
        });
        await update(cropBasePath, updates);
        return;
    }

    await update(userRef, {
        ...baseData,
        last_login_at: new Date().toISOString(),
    });
}

async function createLaravelSessionFromFirebaseUser(user) {
    const idToken = await user.getIdToken();
    const csrfToken = document.querySelector('input[name="_token"]')?.value;

    const response = await fetch("/auth/firebase-login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-TOKEN": csrfToken || "",
        },
        body: JSON.stringify({
            idToken,
            name: user.displayName || null,
        }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Server session signup failed.");
    }

    return payload;
}

document.addEventListener("DOMContentLoaded", () => {
    const togglePassword = document.getElementById("togglePassword");
    const password = document.getElementById("password");

    if (togglePassword && password) {
        togglePassword.addEventListener("click", () => {
            const isHidden = password.type === "password";
            password.type = isHidden ? "text" : "password";
            togglePassword.src = isHidden
                ? togglePassword.dataset.hide
                : togglePassword.dataset.show;
        });
    }

    const googleLoginBtn = document.getElementById("google-login-btn");
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener("click", async (event) => {
            event.preventDefault();

            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;
                await ensureUserProfileInDatabase(user, user.displayName || null, false);
                const payload = await createLaravelSessionFromFirebaseUser(user);

                window.location.href = payload.redirect || "/welcome";
            } catch (error) {
                console.error("Google Sign-In Error:", error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    const registerForm = document.querySelector('form[action="/register"]') || document.querySelector('form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = document.getElementById('username')?.value?.trim();
            const email = document.getElementById('email')?.value?.trim();
            const password = document.getElementById('password')?.value;

            if (!username || !email || !password) {
                alert('Please fill in all fields.');
                return;
            }

            if (password.length < 6) {
                alert('Password should be at least 6 characters.');
                return;
            }

            try {
                const credential = await createUserWithEmailAndPassword(auth, email, password);
                const user = credential.user;
                await updateProfile(user, { displayName: username });
                await ensureUserProfileInDatabase(user, username, true);
                const payload = await createLaravelSessionFromFirebaseUser(user);
                window.location.href = payload.redirect || '/welcome';
            } catch (error) {
                console.error('Signup error:', error);
                alert(error.message || 'Signup failed.');
            }
        });
    }
});