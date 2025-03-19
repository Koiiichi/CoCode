import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  GithubAuthProvider,
  fetchSignInMethodsForEmail,
  linkWithCredential
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// Firebase configuration using environment variables from .env via Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log("Initializing Firebase with config:", firebaseConfig);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Select DOM elements
const logoutButton = document.getElementById("logout-button");
const authSection = document.getElementById("auth-section");
const editorContainer = document.getElementById("editor-container");
const editorElement = document.getElementById("editor");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");

let editor = null; // Monaco Editor instance
let editorInitialized = false;

// Logout functionality
logoutButton.addEventListener("click", () => {
  console.log("Logout button clicked");
  signOut(auth).then(() => {
    console.log("User signed out.");
    authSection.style.display = "block";
    editorContainer.style.display = "none";
    logoutButton.style.display = "none";
  });
});

// Login User
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  console.log("Login form submitted");
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log("Login successful:", userCredential.user);
      showEditor();
    })
    .catch((error) => {
      console.error("Login failed:", error.message);
      alert("Login failed: " + error.message);
    });
});

// Sign Up User
signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  console.log("Signup form submitted");
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log("Signup successful:", userCredential.user);
      showEditor();
    })
    .catch((error) => {
      console.error("Signup failed:", error.message);
      alert("Signup failed: " + error.message);
    });
});

// GitHub Authentication
const githubProvider = new GithubAuthProvider();
document.getElementById("github-login").addEventListener("click", () => {
  signInWithPopup(auth, githubProvider)
    .then((result) => {
      console.log("GitHub Login Success:", result.user);
      showEditor();
    })
    .catch(handleAuthError);
});

// Google Authentication
const googleProvider = new GoogleAuthProvider();
document.getElementById("google-login").addEventListener("click", () => {
  signInWithPopup(auth, googleProvider)
    .then((result) => {
      console.log("Google Login Success:", result.user);
      showEditor();
    })
    .catch(handleAuthError);
});

// Handle account-exists-with-different-credential errors
async function handleAuthError(error) {
  if (error.code === "auth/account-exists-with-different-credential") {
    const existingEmail = error.customData.email;
    console.log("Account exists for:", existingEmail);

    const methods = await fetchSignInMethodsForEmail(auth, existingEmail);
    if (methods.length > 0) {
      alert(`Please log in using ${methods[0]} first, then link accounts.`);
      
      let existingProvider = methods[0] === "github.com" ? new GithubAuthProvider() : new GoogleAuthProvider();
      const existingUserCredential = await signInWithPopup(auth, existingProvider);
      const credential = GithubAuthProvider.credentialFromError(error);

      await linkWithCredential(existingUserCredential.user, credential);
      console.log("Accounts linked successfully!");
      alert("Accounts successfully linked!");
      showEditor();
    }
  } else {
    console.error("Authentication failed:", error.message);
    alert("Authentication failed: " + error.message);
  }
}

// Show the editor after successful authentication
function showEditor() {
  console.log("showEditor called");
  authSection.style.display = "none";
  editorContainer.style.display = "block";
  logoutButton.style.display = "inline-block";

  if (!editorInitialized) {
    initializeEditor();
    editorInitialized = true;
  }
}

// Initialize Monaco Editor
function initializeEditor() {
  console.log("Initializing Monaco Editor");

  require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs" } });

  require(["vs/editor/editor.main"], function () {
    console.log("Monaco Editor initialized!");
    editor = monaco.editor.create(editorElement, {
      value: "// Start coding here...",
      language: "javascript",
      theme: "vs-dark",
    });

    const editorRef = ref(database, "editor-content");
    let isLocalChange = false;

    // Sync changes to Firebase
    editor.onDidChangeModelContent(() => {
      const content = editor.getValue();
      isLocalChange = true;
      set(editorRef, content).catch((error) =>
        console.error("Error saving to Firebase:", error)
      );
    });

    // Load changes from Firebase
    onValue(editorRef, (snapshot) => {
      const content = snapshot.val();
      if (content !== null && content !== editor.getValue() && !isLocalChange) {
        editor.setValue(content);
      }
      isLocalChange = false;
    });
  });
}

// Monitor Authentication State
onAuthStateChanged(auth, (user) => {
  console.log("onAuthStateChanged triggered");
  if (user) {
    console.log("User authenticated:", user.email);
    showEditor();
  } else {
    console.log("No user authenticated.");
    authSection.style.display = "block";
    editorContainer.style.display = "none";
    logoutButton.style.display = "none";
  }
});