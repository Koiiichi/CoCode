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
import { PresenceManager } from "./editor/presence.js";
import { ImportExportManager } from "./editor/importExport.js";
import { CodeRunner } from "./editor/runner.js";
import { CommentsManager } from "./editor/comments.js";
import { FileTreeManager } from "./editor/fileTree.js";
import { ConflictHandler } from "./editor/conflictHandler.js";
import { DevLogsManager } from "./editor/devLogs.js";
import { TelemetryManager } from "./editor/telemetry.js";
import { OnboardingManager } from "./onboarding/onboardingManager.js";
import { themeManager } from "./theme/themeManager.js";
import { encodeFirebaseKey } from "./firebase/paths.js";

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
const themeToggle = document.getElementById("theme-toggle");
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
let presenceManager = null;  // presence and cursor tracking
let importExportManager = null;  // file import/export functionality
let codeRunner = null;  // code execution and preview
let commentsManager = null;  // inline commenting system
let fileTreeManager = null;  // folder/directory structure
let conflictHandler = null;  // conflict detection and resolution
let devLogs = null;  // development logs panel
let telemetry = null;  // usage analytics and metrics

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

  // Initialize presence manager
  presenceManager = new PresenceManager(auth, projectId);
  
  // Initialize import/export manager
  importExportManager = new ImportExportManager(currentUser, projectId);
  codeRunner = new CodeRunner();
  commentsManager = new CommentsManager(db, auth, editor, projectId);
  fileTreeManager = new FileTreeManager(db, auth, projectId, loadFile);
  conflictHandler = new ConflictHandler(db, auth, editor, projectId);
  devLogs = new DevLogsManager();
  telemetryManager = new TelemetryManager();
  onboardingManager = new OnboardingManager();

  // Ensure editor layout is correct after all managers are initialized
  setTimeout(() => {
    editor.layout();
    // Ensure editor container is properly positioned
    const editorWrapper = document.querySelector('.editor-wrapper');
    if (editorWrapper) {
      editorWrapper.style.position = 'relative';
      editorWrapper.style.overflow = 'hidden';
    }
  }, 200);

  window.devLogs = devLogs; // Make globally available
  window.telemetryManager = telemetryManager; // Make globally available

  // Track session start
  telemetryManager.trackSession(currentUser.uid, projectId);
  
  // Check if user needs onboarding
  checkAndShowOnboarding(currentUser);

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
    document.getElementById("logout-button").addEventListener("click", handleLogout);
  }
}

// Event Listeners
logoutButton?.addEventListener("click", handleLogout);
document.getElementById("home-button")?.addEventListener("click", () => {
  window.location.href = "/home.html";
});

// Theme toggle event listener
themeToggle?.addEventListener("click", () => {
  themeManager.toggle();
});

// Update theme icons based on current theme
window.addEventListener('themechange', (e) => {
  const { effectiveTheme } = e.detail;
  const darkIcon = themeToggle?.querySelector('.theme-icon-dark');
  const lightIcon = themeToggle?.querySelector('.theme-icon-light');
  
  if (effectiveTheme === 'dark') {
    darkIcon.style.display = 'block';
    lightIcon.style.display = 'none';
  } else {
    darkIcon.style.display = 'none';
    lightIcon.style.display = 'block';
  }
});

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
  require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs" } });
  require(["vs/editor/editor.main"], function () {
    const editorContainer = document.getElementById("editor");
    
    // Ensure editor container has proper dimensions
    editorContainer.style.height = '100%';
    editorContainer.style.width = '100%';
    editorContainer.style.position = 'relative';
    editorContainer.style.zIndex = '1';
    
    editor = monaco.editor.create(editorContainer, {
      value: "",
      language: "javascript",
      theme: themeManager.getEffectiveCurrentTheme() === 'dark' ? "vs-dark" : "vs",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: "on",
      renderWhitespace: "selection",
      scrollBeyondLastLine: false,
      wordWrap: "on",
      // Critical: ensure editor is focusable and interactive
      readOnly: false,
      domReadOnly: false,
    });
    
    // Force layout after creation
    setTimeout(() => {
      editor.layout();
      editor.focus();
    }, 100);
    
    // Update Monaco theme when app theme changes
    window.addEventListener('themechange', (e) => {
      const { effectiveTheme } = e.detail;
      monaco.editor.setTheme(effectiveTheme === 'dark' ? 'vs-dark' : 'vs');
    });

    // Initialize presence after editor is ready
    if (presenceManager && currentUser) {
      presenceManager.initialize(currentUser, editor);
    }
    
    // Add code runner toggle to UI
    if (codeRunner) {
      codeRunner.addRunnerToggle();
      // Make modelsByFile available globally for runner
      window.modelsByFile = modelsByFile;
    }
    
    // Initialize comments manager
    if (commentsManager) {
      commentsManager.initialize(editor);
    }
    
    // Initialize file tree manager
    if (fileTreeManager) {
      fileTreeManager.initialize(
        (fileName, filePath) => switchToFile(fileName), // onFileSelect
        (fileName, filePath) => {
          // onFileCreate - refresh file list and switch to new file
          loadFiles();
          setTimeout(() => switchToFile(fileName), 100);
        },
        (fileName) => {
          // onFileDelete - close tab if it's open
          const tab = document.querySelector(`[data-filename="${fileName}"]`);
          if (tab) {
            tab.remove();
            delete modelsByFile[fileName];
            if (currentFileName === fileName) {
              // Switch to first available file
              const remainingFiles = Object.keys(modelsByFile);
              if (remainingFiles.length > 0) {
                switchToFile(remainingFiles[0]);
              } else {
                currentFileName = null;
                if (editor) editor.setModel(null);
              }
            }
          }
        }
      );
    }
    
    // Initialize conflict handler
    if (conflictHandler) {
      conflictHandler.initialize((fileName, resolvedContent) => {
        // onConflictResolved - update the model with resolved content
        const model = modelsByFile[fileName];
        if (model && model.getValue() !== resolvedContent) {
          model.setValue(resolvedContent);
        }
        // Update tab styling to remove conflict indicator
        updateTabConflictStatus(fileName, false);
      });
    }
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
  model.onDidChangeContent(async () => {
    isLocalChange = true;
    const newVal = model.getValue();
    
    // Check for conflicts before saving
    if (conflictHandler) {
      const canSave = await conflictHandler.prepareSave(fileName, newVal);
      if (!canSave) {
        // Conflict detected, handler will show resolution UI
        updateTabConflictStatus(fileName, true);
        return;
      }
    }
    
    // Encode the fileName for Firebase key usage
    const encodedFileName = encodeFirebaseKey(fileName);
    onValue(ref(db, `users/${currentUser.uid}/projects/${currentProjectId}/files/${encodedFileName}`), (snap) => {
      const existing = snap.val() || {};
      const oldType = existing.type ?? inferLanguageFromExtension(fileName);
      update(ref(db, `users/${currentUser.uid}/projects/${currentProjectId}/files/${encodedFileName}`), {
        content: newVal,
        type: oldType
      }).catch(console.error);
    }, { onlyOnce: true });

    setTimeout(() => (isLocalChange = false), 100);
  });
  
  // Register file with conflict handler
  if (conflictHandler) {
    conflictHandler.registerFile(fileName);
  }
}

// Switch the editor to the given file’s model
function switchFile(fileName) {
  currentFileName = fileName;
  const model = modelsByFile[fileName];
  if (model && editor) {
    editor.setModel(model);
  }

  // Update presence manager with current file
  if (presenceManager) {
    presenceManager.switchFile(fileName);
  }
  
  // Update comments manager with current file
  if (commentsManager) {
    commentsManager.switchFile(fileName);
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
      currentFileName = null;
      if (editor) editor.setModel(null);
    }
  }
}

// ------------------
// Import/Export Event Handlers
// ------------------

// Import files button
document.getElementById("import-files-btn")?.addEventListener("click", async () => {
  if (!importExportManager) return;
  
  try {
    const importedFiles = await importExportManager.importFiles();
    if (importedFiles.length > 0) {
      importExportManager.showImportProgress(importedFiles);
    }
  } catch (error) {
    console.error("Import failed:", error);
    alert("Failed to import files: " + error.message);
  }
});

// Export current file button
document.getElementById("export-file-btn")?.addEventListener("click", () => {
  if (!importExportManager || !currentFileName) {
    alert("No file is currently open");
    return;
  }
  
  const model = modelsByFile[currentFileName];
  if (!model) {
    alert("No content to export");
    return;
  }
  
  const content = model.getValue();
  importExportManager.exportFile(currentFileName, content);
  importExportManager.showExportProgress('file', currentFileName);
});

// Export project button
document.getElementById("export-project-btn")?.addEventListener("click", async () => {
  if (!importExportManager) return;
  
  try {
    // Get current project data
    const projectRef = ref(db, `users/${currentUser.uid}/projects/${currentProjectId}`);
    onValue(projectRef, async (snapshot) => {
      const projectData = snapshot.val();
      if (projectData) {
        const projectName = projectData.projectName || currentProjectId;
        await importExportManager.exportProject(projectData, projectName);
        importExportManager.showExportProgress('project', `${projectName}.zip`);
      } else {
        alert("No project data found");
      }
    }, { onlyOnce: true });
  } catch (error) {
    console.error("Export failed:", error);
    alert("Failed to export project: " + error.message);
  }
});

// Comments toggle button
document.getElementById("commentsToggle")?.addEventListener("click", () => {
  if (commentsManager) {
    commentsManager.togglePanel();
  }
});

// Dev logs toggle button
document.getElementById("devLogsToggle")?.addEventListener("click", () => {
  if (devLogs) {
    devLogs.toggle();
    telemetry?.trackFeatureUsage('dev_logs', 'toggle');
  }
});

// “Add File” in tab bar - delegate to file tree manager if available
addFileTab.addEventListener("click", () => {
  if (fileTreeManager) {
    fileTreeManager.createFile();
  } else {
    // Fallback to original behavior
    const fileName = prompt("Enter new file name (e.g. main.c):");
    if (!fileName || fileName.trim() === "") return;

    try {
      const encodedFileName = encodeFirebaseKey(fileName);
      console.log("Creating file with encoded name:", encodedFileName);

      const fileRef = ref(db, `users/${currentUser.uid}/projects/${currentProjectId}/files/${encodedFileName}`);
      const inferredType = inferLanguageFromExtension(fileName);

      set(fileRef, {
        content: "// new file",
        type: inferredType
      }).catch(err => console.error("Error creating file:", err));
    } catch (error) {
      console.error("Error with file creation:", error);
      alert("Failed to create file. Please try again.");
    }
  }
});

// ------------------
// Infer language from extension
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

// Update tab conflict status indicator
function updateTabConflictStatus(fileName, hasConflict) {
  const tab = document.querySelector(`[data-filename="${fileName}"]`);
  if (tab) {
    if (hasConflict) {
      tab.classList.add('has-conflict');
    } else {
      tab.classList.remove('has-conflict');
    }
  }
}