// /src/editor.js
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
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ------------------
// Firebase Init
// ------------------
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
const db = getDatabase(app);

// ------------------
// DOM References
// ------------------
const profileButton = document.querySelector(".profile-button");
const profileDropdown = document.querySelector(".profile-dropdown");
const profileMenu = document.querySelector(".profile-menu");
const logoutButton = document.getElementById("logout-button");
const homeButton = document.getElementById("home-button");

// Slide panels
const filesBtn = document.getElementById("files-btn");
const searchBtn = document.getElementById("search-btn");
const settingsBtn = document.getElementById("settings-btn");
const filesPanel = document.getElementById("files-panel");
const searchPanel = document.getElementById("search-panel");
const settingsPanel = document.getElementById("settings-panel");

// Tabs
const tabBar = document.getElementById("tab-bar");
const addFileTab = document.getElementById("add-file-tab");
let editor; // The Monaco editor instance

// State
let currentUser = null;
let currentProjectId = null;
let modelsByFile = {};       // { "filename.ext": monacoEditorModel }
let unsubscribesByFile = {}; // store onValue unsub functions if needed
let currentFileName = null;  // which file is open in the editor?

// ------------------
// Auth
// ------------------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  insertUserInfo(user);

  // Parse project=xxx from URL
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("project");
  if (!projectId) {
    alert("No project specified. Redirecting to home.");
    window.location.href = "home.html";
    return;
  }
  currentProjectId = projectId;

  initializeEditor(); // sets up Monaco
  loadFiles();        // fetches the project's files from DB
});

// Insert user info into the profile dropdown
function insertUserInfo(user) {
  if (profileDropdown) {
    profileDropdown.innerHTML = `
      <div class="profile-info">
        <div>${user.displayName || user.email}</div>
        <div style="font-size:0.85rem;color:#aaa;">${user.email}</div>
        <button id="logout-button" class="logout-btn">Logout</button>
      </div>
    `;
    // re-bind the logout
    document.getElementById("logout-button").addEventListener("click", () => {
      signOut(auth).then(() => {
        window.location.href = "login.html";
      });
    });
  }
}

// ------------------
// Buttons & Dropdown
// ------------------
if (profileButton && profileDropdown) {
  profileButton.addEventListener("click", (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle("show");
  });

  document.addEventListener("click", (evt) => {
    if (profileMenu && !profileMenu.contains(evt.target)) {
      profileDropdown.classList.remove("show");
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    signOut(auth).then(() => (window.location.href = "login.html"));
  });
}

if (homeButton) {
  homeButton.addEventListener("click", () => {
    window.location.href = "home.html";
  });
}

// ------------------
// Slide Panels
// ------------------
filesBtn?.addEventListener("click", () => {
  togglePanel(filesPanel);
});
searchBtn?.addEventListener("click", () => {
  togglePanel(searchPanel);
});
settingsBtn?.addEventListener("click", () => {
  togglePanel(settingsPanel);
});

function togglePanel(panel) {
  // Close all
  [filesPanel, searchPanel, settingsPanel].forEach((p) => {
    p.classList.remove("visible");
    p.classList.add("hidden");
  });

  if (panel.classList.contains("visible")) {
    panel.classList.remove("visible");
    panel.classList.add("hidden");
  } else {
    panel.classList.remove("hidden");
    panel.classList.add("visible");
  }
}

// ------------------
// Initialize Monaco
// ------------------
function initializeEditor() {
  require.config({
    paths: {
      vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs",
    },
  });

  require(["vs/editor/editor.main"], () => {
    editor = monaco.editor.create(document.getElementById("editor"), {
      value: "// Loading...",
      language: "javascript",
      theme: "vs-dark",
    });
  });
}

// ------------------
// File Sync
// ------------------
function loadFiles() {
  const fileListRef = ref(db, `users/${currentUser.uid}/projects/${currentProjectId}/files`);
  let hasAtLeastOneFile = false;
  // Listen for existing/new files
  onChildAdded(fileListRef, (snap) => {
    hasAtLeastOneFile = true;
    const fileName = snap.key;       // e.g. "main.c"
    const fileObj = snap.val() || {};
    const content = fileObj.content || "";
    const lang = fileObj.lang || inferLanguageFromExtension(fileName);
    createFileModel(fileName, content, lang);
    createTab(fileName);
    // If we have no open file yet, open this one
    if (!currentFileName) {
      switchFile(fileName);
    }
  });
  // Listen for updated content
  onChildChanged(fileListRef, (snap) => {
    const fileName = snap.key;
    const newContent = snap.val() || "";
    const model = modelsByFile[fileName];
    if (model && model.getValue() !== newContent) {
      model.setValue(newContent);
    }
  });

  onValue(fileListRef, (snapshot) => {
    if (!snapshot.exists()) {
      // No files exist -> create an untitled.js by default
      const fileRef = ref(db, `users/${currentUser.uid}/projects/${currentProjectId}/files/untitled.js`);
      set(fileRef, "// Your new file").catch(console.error);
    }
  });
  // Listen for removed files
  onChildRemoved(fileListRef, (snap) => {
    const fileName = snap.key;
    removeTab(fileName);
  });
}

// Create a Monaco model for a file
function createFileModel(fileName, content, lang) {
  if (modelsByFile[fileName]) return; // already exist

  const model = monaco.editor.createModel(content, lang);
  modelsByFile[fileName] = model;

  // Listen for local changes -> store to DB
  let isLocalChange = false;
  model.onDidChangeContent(() => {
    // If this file is not the "active" file, we still store changes
    // because user might have multiple files open, or do programmatic updates
    isLocalChange = true;
    const newVal = model.getValue();

    const fileRef = ref(db, `users/${currentUser.uid}/projects/${currentProjectId}/files/${fileName}`);
    update(fileRef, { content: newVal }).catch(console.error);
    // We'll reset after a small delay
    setTimeout(() => (isLocalChange = false), 100);
  });
}

// Switch the editor to the given file’s model
function switchFile(fileName) {
  currentFileName = fileName;
  const model = modelsByFile[fileName];
  if (model && editor) {
    editor.setModel(model);
  }

  // update tab active state
  document.querySelectorAll(".tab").forEach((tabEl) => {
    if (tabEl.dataset.filename === fileName) {
      tabEl.classList.add("active");
    } else {
      tabEl.classList.remove("active");
    }
  });
}

// Create a tab in the tab bar
function createTab(fileName) {
  // If it already exists, do not recreate
  if (document.querySelector(`.tab[data-filename="${fileName}"]`)) return;

  const tabEl = document.createElement("div");
  tabEl.className = "tab";
  tabEl.dataset.filename = fileName;
  tabEl.textContent = fileName;

  // On click, switch editor
  tabEl.addEventListener("click", () => {
    switchFile(fileName);
  });

  // Insert before the "add file" tab
  tabBar.insertBefore(tabEl, addFileTab);
}

// Remove tab if a file is deleted
function removeTab(fileName) {
  if (modelsByFile[fileName]) {
    modelsByFile[fileName].dispose();
    delete modelsByFile[fileName];
  }
  const tabEl = document.querySelector(`.tab[data-filename="${fileName}"]`);
  if (tabEl) tabEl.remove();
  if (currentFileName === fileName) {
    // Clear the editor or switch to another file
    currentFileName = null;
    const otherFiles = Object.keys(modelsByFile);
    if (otherFiles.length > 0) {
      switchFile(otherFiles[0]);
    } else {
      editor.setValue("// No files open");
    }
  }
}

// ------------------
// “Add File” in tab bar
// ------------------
addFileTab.addEventListener("click", () => {
  const fileName = prompt("Enter new file name (e.g. main.c):");
  if (!fileName) return;
  // Create empty file in DB
  const fileRef = ref(db, `users/${currentUser.uid}/projects/${currentProjectId}/files/${fileName}`);
  set(fileRef, "").catch(console.error);
});

// ------------------
// Infer language from extension
// ------------------
function inferLanguageFromExtension(fileName) {
  const ext = fileName.toLowerCase().split(".").pop();
  switch (ext) {
    case "js": return "javascript";
    case "jsx": return "javascript";
    case "ts": return "typescript";
    case "html": return "html";
    case "css": return "css";
    case "c": return "c";
    case "cpp":
    case "cc":
    case "cxx": return "cpp";
    case "h": return "cpp"; // or c? depends on your preference
    case "json": return "json";
    case "md": return "markdown";
    default:
      return "plaintext";
  }
}