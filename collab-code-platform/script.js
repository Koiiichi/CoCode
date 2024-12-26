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


const logoutButton = document.getElementById("logout-button");

logoutButton.addEventListener("click", () => {
    // This signs the user out
    signOut(auth).then(() => {
      console.log("User signed out.");
      // Show login forms again
      authSection.style.display = "block";
      editorSection.style.display = "none";
      logoutButton.style.display = "none";
    });
  });


// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUP9sxaLKvHSbhNWglj12O5Ow3fsEuZMQ",
  authDomain: "collab-code-editor-112d1.firebaseapp.com",
  databaseURL: "https://collab-code-editor-112d1-default-rtdb.firebaseio.com",
  projectId: "collab-code-editor-112d1",
  storageBucket: "collab-code-editor-112d1.appspot.com",
  messagingSenderId: "956558572045",
  appId: "1:956558572045:web:4ba93050012b55b4f1b344",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Selectors
const authSection = document.getElementById("auth-section");
const editorSection = document.getElementById("editor");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");

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

// Show Editor after Authentication
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

  // Configure Monaco Environment for *all* worker labels
  // so that they don't attempt relative fetch from a data URL.
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
      // Return a data URI that encodes an importScripts call to the *absolute* URL:
      const script = `importScripts("${location.origin}/${workerPath}")`;
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(script)}`;
    },
  };

  // Make sure Monaco knows where to look for its 'vs' files.
  // (This path should match where monaco-editor is actually served.)
  require.config({ paths: { vs: "monaco-editor/min/vs" } });

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
      // Only set editor content if it's different and we're sure it's from server
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
      // Show editor
      showEditor();
      // Show logout button as well
      logoutButton.style.display = "inline-block";
    } else {
      console.log("No user authenticated.");
      authSection.style.display = "block";
      editorSection.style.display = "none";
      // Hide logout button
      logoutButton.style.display = "none";
    }
});
