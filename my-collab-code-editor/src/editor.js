import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  onValue
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// Firebase config (via Vite)
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
const database = getDatabase(app);

// Handle auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is signed in:", user.email);
    initializeEditor();
  } else {
    console.log("Not signed in, redirecting...");
    window.location.href = "login.html";
  }
});

// Profile dropdown toggle
const profileButton = document.querySelector(".profile-button");
const profileDropdown = document.querySelector(".profile-dropdown");
const profileMenu = document.querySelector(".profile-menu");

if (profileButton && profileDropdown) {
  profileButton.addEventListener("click", (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle("show");
  });

  // Close dropdown if click happens elsewhere
  document.addEventListener("click", (event) => {
    if (profileMenu && !profileMenu.contains(event.target)) {
      profileDropdown.classList.remove("show");
    }
  });
}

// Logout button
const logoutButton = document.getElementById("logout-button");
if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    signOut(auth).then(() => {
      window.location.href = "login.html";
    });
  });
}

// Initialize Monaco
function initializeEditor() {
  require.config({
    paths: {
      vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs"
    }
  });

  require(["vs/editor/editor.main"], () => {
    const editor = monaco.editor.create(document.getElementById("editor"), {
      value: "// Start coding here...",
      language: "javascript",
      theme: "vs-dark"
    });

    const editorRef = ref(database, "editor-content");
    let isLocalChange = false;

    editor.onDidChangeModelContent(() => {
      const content = editor.getValue();
      isLocalChange = true;
      set(editorRef, content).catch((error) => {
        console.error("Failed to save:", error);
      });
    });

    onValue(editorRef, (snapshot) => {
      const content = snapshot.val();
      if (content !== null && content !== editor.getValue() && !isLocalChange) {
        editor.setValue(content);
      }
      isLocalChange = false;
    });
  });
}