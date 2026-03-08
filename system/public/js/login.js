import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getDatabase,
  ref,
  update,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

//web app's Firebase configuration
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
const db = getDatabase(app);

async function ensureUserProfileInDatabase(user) {
  const userRef = ref(db, `users/${user.uid}`);
  const fallbackName = user.email ? user.email.split("@")[0] : "User";

  await update(userRef, {
    username: user.displayName || fallbackName,
    email: user.email || "",
    provider: user.providerData?.[0]?.providerId || "password",
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
    throw new Error(payload.message || "Server session login failed.");
  }

  return payload;
}


//show pass
document.addEventListener("DOMContentLoaded", () => {
  const togglePassword = document.getElementById("togglePassword");
  if (togglePassword){
    togglePassword.addEventListener("click", () => {
        const password = document.getElementById("password");

        const isHidden = password.type === "password";

        // Toggle password input type
        password.type = isHidden ? "text" : "password";

        // Swap icon using data attributes
        togglePassword.src = isHidden
          ? togglePassword.dataset.hide   // when showing password
          : togglePassword.dataset.show;  // when hiding password
    });
  }
});




// --- ADD THIS: Google Sign-In Logic ---
const googleLoginBtn = document.getElementById("google-login-btn");
if (googleLoginBtn) {
const provider = new GoogleAuthProvider(); // Create a Google provider instance

googleLoginBtn.addEventListener("click", async (event) => {
  event.preventDefault(); // Prevent default button behavior

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    await ensureUserProfileInDatabase(user);
    const payload = await createLaravelSessionFromFirebaseUser(user);

    window.location.href = payload.redirect || "/welcome";
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    alert(`Error: ${error.message}`);
  }
});
}
// ------------------------------------

const loginForm = document.querySelector("form.login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email")?.value?.trim();
    const password = document.getElementById("password")?.value;

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await ensureUserProfileInDatabase(credential.user);
      const payload = await createLaravelSessionFromFirebaseUser(credential.user);
      window.location.href = payload.redirect || "/welcome";
    } catch (error) {
      console.error("Email login error:", error);
      alert(error.message || "Login failed.");
    }
  });
}

//reset 
const reset = document.getElementById("reset");
if (reset) {
reset.addEventListener('click', function(event){
event.preventDefault()

const email = document.getElementById("email").value;
sendPasswordResetEmail(auth, email)
  .then(() => {
    alert("email sent!") 
    
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    alert(errorMessage)
  });
})
}