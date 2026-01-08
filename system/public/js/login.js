import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

//web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxTSnDc-z4wJ4fL9zf3kB3uuvZjcISNjQ",
  authDomain: "login-agriknows.firebaseapp.com",
  projectId: "login-agriknows",
  storageBucket: "login-agriknows.firebasestorage.app",
  messagingSenderId: "281355587751",
  appId: "1:281355587751:web:fb479b62b5036b44b68b82",
};



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


// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// --- ADD THIS: Google Sign-In Logic ---
const googleLoginBtn = document.getElementById("google-login-btn");
if (googleLoginBtn) {
const provider = new GoogleAuthProvider(); // Create a Google provider instance

googleLoginBtn.addEventListener("click", (event) => {
  event.preventDefault(); // Prevent default button behavior

  signInWithPopup(auth, provider)
      .then((result) => {
          // This gives you a Google Access Token.
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const token = credential.accessToken;
          // The signed-in user info.
          const user = result.user;

          console.log("Signed in with Google:", user);
          alert("Signed In Successfully with Google!");
          window.location.href = "/welcome"; // Or just "/" depending on your web.php
      })
      .catch((error) => {
          // Handle Errors here.
          const errorCode = error.code;
          const errorMessage = error.message;
          console.error("Google Sign-In Error:", errorMessage);
          alert(`Error: ${errorMessage}`);
      });
});
}
// ------------------------------------

const submit = document.getElementById("submit");
if (submit) { // Only add listener if the button exists
    submit.addEventListener("click", function (event) {
        event.preventDefault();
        //inputs
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed up
      const user = userCredential.user;
      alert("Signed In Successfully!");
      window.location.href = "/welcome";
      // ...
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      alert(errorMessage);
      // ..
    });
}
)};


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