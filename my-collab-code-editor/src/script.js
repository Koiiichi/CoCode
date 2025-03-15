import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
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
const editorSection = document.getElementById("editor");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");

// Logout functionality
logoutButton.addEventListener("click", () => {
  console.log("Logout button clicked");
  signOut(auth).then(() => {
    console.log("User signed out.");
    authSection.style.display = "block";
    editorSection.style.display = "none";
    logoutButton.style.display = "none";
  });
});

let editorInitialized = false;

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

// Show the editor after successful authentication
function showEditor() {
  console.log("showEditor called");
  authSection.style.display = "none";
  editorSection.style.display = "block";

  if (!editorInitialized) {
    initializeEditor();
    editorInitialized = true;
  }
}

// Initialize Monaco Editor
function initializeEditor() {
  console.log("Initializing Monaco Editor");

  self.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
      let workerPath = "monaco-editor/min/vs/base/worker/workerMain.js";
      if (label === "json") {
        workerPath = "monaco-editor/min/vs/language/json/jsonWorker.js";
      } else if (label === "css") {
        workerPath = "monaco-editor/min/vs/language/css/cssWorker.js";
      } else if (label === "html") {
        workerPath = "monaco-editor/min/vs/language/html/htmlWorker.js";
      } else if (label === "typescript" || label === "javascript") {
        workerPath = "monaco-editor/min/vs/language/typescript/tsWorker.js";
      }
      const script = `importScripts("${location.origin}/${workerPath}")`;
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(script)}`;
    },
  };

  require.config({ paths: { vs: "/monaco-editor/min/vs" } });

  require(["vs/editor/editor.main"], function () {
    console.log("Monaco Editor initialized!");
    const editor = monaco.editor.create(document.getElementById("editor"), {
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
    logoutButton.style.display = "inline-block";
  } else {
    console.log("No user authenticated.");
    authSection.style.display = "block";
    editorSection.style.display = "none";
    logoutButton.style.display = "none";
  }
});