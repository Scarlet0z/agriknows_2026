import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";
    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
    import {
      getAuth,
      createUserWithEmailAndPassword,
      GoogleAuthProvider,
      signInWithPopup
    } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

    // Your web app's Firebase configuration
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
    const password = document.getElementById("password");

    togglePassword.addEventListener("click", () => {
      const isHidden = password.type === "password";

      // Toggle password input type
      password.type = isHidden ? "text" : "password";

      // Swap icon using data attributes
      togglePassword.src = isHidden
        ? togglePassword.dataset.hide   // when showing password
        : togglePassword.dataset.show;  // when hiding password
    });
  });


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'en' 
const provider = new GoogleAuthProvider();

const googleLogin = document.getElementById("google-login-btn");
googleLogin.addEventListener("click", function(){
  signInWithPopup(auth, provider)
  .then((result) => {
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const user = result.user;
    console.log(user);
    window.location.href = "/welcome";

  }).catch((error) => {

    const errorCode = error.code;
    const errorMessage = error.message;

  });
})

//submit button /  signup button
const submit = document.getElementById("submit");

submit.addEventListener("click", function (event) {
  event.preventDefault(); // Prevents page reload

  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  // Basic check before calling Firebase
  if (!email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log("User created:", userCredential.user);
      
      // Use a relative path to your welcome page
      // Change "welcome.html" to your actual filename
      window.location.href = "/welcome"; 
    })
    .catch((error) => {
      console.error("Signup Error:", error.code, error.message);
      
      // Provide user-friendly error messages
      if (error.code === 'auth/email-already-in-use') {
        alert("This email is already registered.");
      } else if (error.code === 'auth/weak-password') {
        alert("Password should be at least 6 characters.");
      } else {
        alert(error.message);
      }
    });
});