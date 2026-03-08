import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail, 
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// Use pagehide instead of onunload to avoid the violation error
window.addEventListener('pagehide', (event) => {
    // This runs when the user leaves the page, without triggering the violation
});

// A more reliable "Back Button" trap
const backButtonTrap = () => {
    // Push a state so there is something to "pop"
    window.history.pushState(null, null, window.location.href);

    window.onpopstate = function() {
        // If they click back, push them forward again immediately
        window.history.go(1);
    };
};

// Initialize the trap
backButtonTrap();

// Your web app's Firebase configuration 
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
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || "";


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

// Get element references
const emailInput = document.getElementById('user-email');
const usernameInput = document.getElementById('user-username');
const saveUserInfoBtn = document.getElementById('save-user-info-btn'); 

const currentPassInput = document.getElementById('current-password');
const newPassInput = document.getElementById('new-password');
const confirmPassInput = document.getElementById('confirm-password');
const savePassBtn = document.getElementById('save-password-btn');

// --- NEW REFERENCES FOR PASSWORD TOGGLE ---
const passwordToggles = document.querySelectorAll('.password-toggle');

// Variable to hold the current user object
let currentUser = null;

async function syncLaravelSession(user, nameOverride = null) {
    const idToken = await user.getIdToken(true);

    const response = await fetch('/auth/firebase-login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({
            idToken,
            name: nameOverride || user.displayName || null,
        }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Failed to sync session.');
    }

    return payload;
}

async function loadSessionUser() {
    try {
        const response = await fetch('/get-user', {
            headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
            return;
        }

        const sessionUser = await response.json();
        if (sessionUser) {
            usernameInput.value = sessionUser.username || '';
            emailInput.value = sessionUser.email || '';
        }
    } catch (error) {
        console.error('Failed to load session user:', error);
    }
}

loadSessionUser();

// This checks if the user is logged in every time the page loads
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        return;
    }

    currentUser = user;
    if (!usernameInput.value) {
        usernameInput.value = user.displayName || '';
    }

    if (!emailInput.value) {
        emailInput.value = user.email || '';
    }
});

// --- NEW PASSWORD TOGGLE LOGIC ---
passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        // Get the ID of the input field associated with this toggle
        const targetId = toggle.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggle.textContent = '🙉'; // Change icon to closed eye (or your preferred closed eye symbol)
        } else {
            passwordInput.type = 'password';
            toggle.textContent = '🙈'; // Change icon back to open eye
        }
    });
});
// --- END NEW PASSWORD TOGGLE LOGIC ---


// --- USERNAME/EMAIL UPDATE LOGIC (No Change) ---
saveUserInfoBtn.addEventListener('click', async () => {
    if (!currentUser) {
        alert('Error: No user is currently logged in.');
        return;
    }

    const newUsername = usernameInput.value.trim();
    const newEmail = emailInput.value.trim();
    let updates = {};
    let changesMade = false;

    if (newUsername !== (currentUser.displayName || '')) {
        updates.displayName = newUsername;
        changesMade = true;
    }

    if (newEmail !== currentUser.email) {
        alert("To change your email address, you must first re-authenticate (e.g., provide your current password). Due to Firebase security protocols, the email update cannot be handled by the 'SAVE' button in this section.");
        emailInput.value = currentUser.email;
        return; 
    }

    if (!changesMade) {
        alert('No changes detected in username.');
        return;
    }

if (updates.displayName) {
    try {
        await updateProfile(currentUser, updates); 
        await syncLaravelSession(currentUser, newUsername);
        alert('Username updated successfully!');
        
        currentUser.displayName = newUsername; 
        
    } catch (error) {
        console.error('Username update error:', error);
        alert('Error updating username: ' + error.message);
    }
}
});


// --- PASSWORD UPDATE LOGIC---
savePassBtn.addEventListener('click', async () => {
    if (!currentUser) {
        alert('Error: No user is currently logged in.');
        return;
    }

    const currentPassword = currentPassInput.value;
    const newPassword = newPassInput.value;
    const confirmPassword = confirmPassInput.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Please fill in all password fields.');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('New password and confirm password do not match.');
        return;
    }
    
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);

    try {
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword);
        
        alert('Password updated successfully!');
        
        currentPassInput.value = '';
        newPassInput.value = '';
        confirmPassInput.value = '';

    } catch (error) {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
             alert('Error: Incorrect current password or user not found.');
        } else if (error.code === 'auth/weak-password') {
             alert('Error: The new password is too weak.');
        } else {
            console.error('Password update error:', error);
            alert('Error updating password: ' + error.message);
        }
    }
});


document.getElementById('logout-btn').addEventListener('click', () => {
  signOut(auth).then(() => {
    alert('You have been logged out successfully.');
        window.location.replace('/logout'); 
  }).catch((error) => {
    alert('Error logging out: ' + error.message);
  });
});