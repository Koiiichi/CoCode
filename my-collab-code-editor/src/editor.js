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
  update,
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


/**
 * Encode a filename so it can be used as a Firebase key
 * by replacing all forbidden characters (., #, $, [, ]).
 */
function encodeFirebaseKey(fileName) {
  return encodeURIComponent(fileName)
    .replace(/\./g, '%2E')
    .replace(/\#/g, '%23')
    .replace(/\$/g, '%24')
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D');
}

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

document.addEventListener("click", (e) => {
  // If click is outside of sidebar + panel area, close all
  if (!sidebarContains(e.target) && !anyPanelContains(e.target)) {
    [filesPanel, searchPanel, settingsPanel].forEach((p) => {
      p.classList.remove("visible");
      p.classList.add("hidden");
    });
  }
});

function sidebarContains(target) {
  return filesBtn.contains(target) || searchBtn.contains(target) ||
    settingsBtn.contains(target);
}
function anyPanelContains(target) {
  return filesPanel.contains(target) || searchPanel.contains(target) ||
    settingsPanel.contains(target);
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
  
  // Set up listener for existing files
  onChildAdded(fileListRef, (snap) => {
    hasAtLeastOneFile = true;
    const encodedFileName = snap.key;
    // Decode the file name to use the original value
    const fileName = decodeURIComponent(encodedFileName);
    const fileObj = snap.val() || {};
    const content = fileObj.content ?? "";
    const fileType = fileObj.type ?? inferLanguageFromExtension(fileName);
    createFileModel(fileName, content, fileType);
    createTab(fileName);
    if (!currentFileName) {
      switchFile(fileName);
    }
  });

  // Set up listener for file changes
  onChildChanged(fileListRef, (snap) => {
    const encodedFileName = snap.key;
    const fileName = decodeURIComponent(encodedFileName);
    const fileObj = snap.val() || {};
    const newContent = fileObj.content ?? "";
    const model = modelsByFile[fileName];
    if (model && model.getValue() !== newContent) {
      model.setValue(newContent);
    }
  });

  // Check if project is empty and create default file if needed
  // This runs once when the editor loads
  onValue(fileListRef, (snapshot) => {
    const filesData = snapshot.val();
    if (!snapshot.exists() || !filesData || Object.keys(filesData || {}).length === 0) {
      // Create default file with properly encoded name
      const defaultFileName = "untitled.js";
      const encodedFileName = encodeFirebaseKey(defaultFileName);
      
      console.log("Creating default file with encoded name:", encodedFileName);
      
      // Make sure the path is safe
      const fileRef = ref(db, `users/${currentUser.uid}/projects/${currentProjectId}/files/${encodedFileName}`);
      
      // Create the file
      set(fileRef, {
        content: "// New file - created as default",
        type: "javascript"
      }).catch(err => console.error("Error creating default file:", err));
    }
  }, { onlyOnce: true }); // Only run this check once
  
  // Listen for removed files
  onChildRemoved(fileListRef, (snap) => {
    const encodedFileName = snap.key;
    const fileName = decodeURIComponent(encodedFileName);
    removeTab(fileName);
  });
}

// Create a Monaco model for a file

function createFileModel(fileName, content, fileType) {
  if (modelsByFile[fileName]) return;

  const model = monaco.editor.createModel(content, fileType);
  modelsByFile[fileName] = model;

  let isLocalChange = false;
  model.onDidChangeContent(() => {
    isLocalChange = true;
    const newVal = model.getValue();
    // Encode the fileName for Firebase key usage.
    const encodedFileName = encodeFirebaseKey(fileName);
    const fileRef = ref(db, `users/${currentUser.uid}/projects/${currentProjectId}/files/${encodedFileName}`);
    
    onValue(fileRef, (snap) => {
      const existing = snap.val() || {};
      const oldType = existing.type ?? inferLanguageFromExtension(fileName);
      update(fileRef, {
        content: newVal,
        type: oldType
      }).catch(console.error);
    }, { onlyOnce: true });

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

// “Add File” in tab bar

addFileTab.addEventListener("click", () => {
  const fileName = prompt("Enter new file name (e.g. main.c):");
  if (!fileName || fileName.trim() === "") return;

  try {
    const encodedFileName = encodeFirebaseKey(fileName); // <-- Use new helper
    console.log("Creating file with encoded name:", encodedFileName);

    const fileRef = ref(db, `users/${currentUser.uid}/projects/${currentProjectId}/files/${encodedFileName}`);
    const inferredType = inferLanguageFromExtension(fileName);

    set(fileRef, {
      content: "// new file",
      type: inferredType
    }).catch(err => console.error("Error creating file:", err));
  } catch (err) {
    console.error("Error in file creation:", err);
    alert("Could not create file. Error: " + err.message);
  }
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