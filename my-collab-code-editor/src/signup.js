import {
    initializeApp
  } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
  import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    GithubAuthProvider,
    fetchSignInMethodsForEmail,
    linkWithCredential,
    onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
  
  // Firebase config
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  
  // Email/Password Sign Up
  document.getElementById("signup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
  
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        window.location.href = "editor.html";
      })
      .catch((error) => {
        alert("Signup failed: " + error.message);
      });
  });
  
  // Social Providers
  const googleProvider = new GoogleAuthProvider();
  const githubProvider = new GithubAuthProvider();
  
  // Google Sign Up
  document.getElementById("google-login").addEventListener("click", () => {
    signInWithPopup(auth, googleProvider)
      .then(() => {
        window.location.href = "editor.html";
      })
      .catch(handleAuthError);
  });
  
  // GitHub Sign Up
  document.getElementById("github-login").addEventListener("click", () => {
    signInWithPopup(auth, githubProvider)
      .then(() => {
        window.location.href = "editor.html";
      })
      .catch(handleAuthError);
  });
  
  // Handle account linking errors
  async function handleAuthError(error) {
    if (error.code === "auth/account-exists-with-different-credential") {
      const email = error.customData.email;
      const methods = await fetchSignInMethodsForEmail(auth, email);
      const provider =
        methods[0] === "google.com"
          ? googleProvider
          : methods[0] === "github.com"
          ? githubProvider
          : null;
  
      if (!provider) return;
  
      const existingUser = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromError(error) ||
                         GithubAuthProvider.credentialFromError(error);
  
      await linkWithCredential(existingUser.user, credential);
      alert("Accounts linked!");
      window.location.href = "editor.html";
    } else {
      alert("Auth error: " + error.message);
    }
  }
  
  // Auto-redirect if already signed in
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "editor.html";
    }
  });  