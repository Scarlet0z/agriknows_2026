import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// Firebase configuration - agriknows-data project
const firebaseConfig = {
    apiKey: "AIzaSyCq4lH4tj4AS9-cqvM29um--Nu4v2UdvZw",
    authDomain: "agriknows-data.firebaseapp.com",
    databaseURL: "https://agriknows-data-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "agriknows-data",
    storageBucket: "agriknows-data.firebasestorage.app",
    messagingSenderId: "922008629713",
    appId: "1:922008629713:web:5cf15ca9d47036b9a8f0f0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log("✅ Auth persistence set to LOCAL");
    })
    .catch((error) => {
        console.error("❌ Persistence error:", error);
    });

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("✅ User logged in:", user.uid);
        console.log("Email:", user.email);
    } else {
        console.log("❌ No user logged in");
    }
});

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
    
    // Show/Hide Password Toggle
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

    // Google Login
    const googleLogin = document.getElementById("google-login-btn");
    if (googleLogin) {
        googleLogin.addEventListener("click", function(event) {
            event.preventDefault();
            
            console.log("🔍 Google login clicked");
            
            signInWithPopup(auth, provider)
                .then((result) => {
                    const user = result.user;
                    console.log("✅ Google login successful");
                    console.log("UID:", user.uid);
                    console.log("Email:", user.email);
                    console.log("Saving to path:", `users/${user.uid}`);
                    
                    // Save to database
                    return set(ref(db, `users/${user.uid}`), {
                        username: user.displayName || user.email.split('@')[0],
                        email: user.email,
                        createdAt: new Date().toISOString()
                    });
                })
                .then(() => {
                    console.log("✅ User data saved to database");
                    alert("Google login successful! ✅");
                    window.location.href = "/welcome";
                })
                .catch((error) => {
                    console.error("❌ Google login error:", error.code, error.message);
                    
                    if (error.code === 'auth/popup-blocked') {
                        alert("Popup was blocked. Please allow popups for this site.");
                    } else if (error.code === 'auth/popup-closed-by-user') {
                        alert("Login cancelled.");
                    } else {
                        alert("Login failed: " + error.message);
                    }
                });
        });
    }

    // Email/Password Signup
    const submit = document.getElementById("submit");
    if (submit) {
        submit.addEventListener("click", function(event) {
            event.preventDefault();

            const username = document.getElementById("username").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;

            console.log("🔍 === SIGNUP DEBUG ===");
            console.log("Username:", username);
            console.log("Email:", email);
            console.log("Password length:", password.length);

            // Validation
            if (!username || !email || !password) {
                alert("Please fill in all fields.");
                return;
            }

            if (password.length < 6) {
                alert("Password should be at least 6 characters.");
                return;
            }

            console.log("✅ Validation passed, creating user...");

            // Create user
            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    
                    console.log("✅ User created in Firebase Auth");
                    console.log("UID:", user.uid);
                    console.log("Email:", user.email);
                    console.log("Saving to database path:", `users/${user.uid}`);

                    // Save user profile to Realtime Database
                    return set(ref(db, `users/${user.uid}`), {
                        username: username,
                        email: email,
                        createdAt: new Date().toISOString()
                    });
                })
                .then(() => {
                    console.log("✅ User data saved to database successfully!");
                    console.log("======================");
                    
                    alert("Account created successfully ✅");
                    window.location.href = "/welcome";
                })
                .catch((error) => {
                    console.error("❌ Signup Error:", error.code, error.message);
                    console.log("======================");
                    
                    // User-friendly error messages
                    if (error.code === 'auth/email-already-in-use') {
                        alert("This email is already registered. Please login instead.");
                    } else if (error.code === 'auth/weak-password') {
                        alert("Password should be at least 6 characters.");
                    } else if (error.code === 'auth/invalid-email') {
                        alert("Please enter a valid email address.");
                    } else {
                        alert("Signup failed: " + error.message);
                    }
                });
        });
    }
});