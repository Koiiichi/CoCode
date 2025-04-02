// home.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

import {
  createProject,
  deleteProject,
  onUserProjects,
  onSharedProjects,
  createFile
} from "/src/fileIO.js";

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

// DOM Elements
const profileButton = document.querySelector(".profile-button");
const profileDropdown = document.querySelector(".profile-dropdown");
const profileMenu = document.querySelector(".profile-menu");
const logoutButton = document.getElementById("logout-button");

const myProjectsBtn = document.getElementById("my-projects-btn");
const sharedWithMeBtn = document.getElementById("shared-with-me-btn");
const folderTitle = document.getElementById("folder-title");
const createProjectBtn = document.getElementById("create-project-btn");
const projectListEl = document.getElementById("project-list");

// Modal for creating new files
const fileModal = document.getElementById("file-modal");
const newFileNameInput = document.getElementById("new-file-name");
const confirmCreateFileBtn = document.getElementById("confirm-create-file");
const cancelCreateFileBtn = document.getElementById("cancel-create-file");

let currentUser = null;
let currentFolder = "my-projects"; // or "shared"
let projectsData = {};
let selectedProjectId = null; // which project user is creating a file in

// Toggle profile dropdown
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

// Logout
if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    signOut(auth).then(() => {
      window.location.href = "login.html";
    });
  });
}

// Auth check
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  // Insert user info in the dropdown
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

  // Default load: My Projects
  loadMyProjects();
});

// Switch between “My Projects” and “Shared with Me”
myProjectsBtn.addEventListener("click", () => {
  currentFolder = "my-projects";
  folderTitle.textContent = "My Projects";
  myProjectsBtn.classList.add("active");
  sharedWithMeBtn.classList.remove("active");
  loadMyProjects();
});
sharedWithMeBtn.addEventListener("click", () => {
  currentFolder = "shared-with-me";
  folderTitle.textContent = "Shared with Me";
  myProjectsBtn.classList.remove("active");
  sharedWithMeBtn.classList.add("active");
  loadSharedProjects();
});

// Create a new project
createProjectBtn.addEventListener("click", () => {
  if (!currentUser) return;
  const newProjectId = "proj_" + Date.now();
  const projectName = prompt("Enter project name:", "Untitled");
  if (projectName !== null) {
    createProject(currentUser.uid, newProjectId, projectName);
  }
});

// Load "My Projects"
function loadMyProjects() {
  if (!currentUser) return;
  onUserProjects(currentUser.uid, (data) => {
    projectsData = data || {};
    renderProjects(Object.entries(projectsData));
  });
}

// Load "Shared with Me" (placeholder)
function loadSharedProjects() {
  if (!currentUser) return;
  onSharedProjects(currentUser.uid, (data) => {
    // data might be an object of projects the user can access.
    // For now, it’s just empty or mock data.
    renderProjects(Object.entries(data || {}));
  });
}

// Render project list
function renderProjects(projectArray) {
  if (!projectArray.length) {
    projectListEl.innerHTML = "<p>No projects found.</p>";
    return;
  }
  projectListEl.innerHTML = "";

  projectArray.forEach(([pid, proj]) => {
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <div class="project-title">${proj.projectName || pid}</div>
      <div class="project-btns">
        <button class="sec-btn open-proj" data-pid="${pid}">Open</button>
        <button class="del-btn" data-pid="${pid}">Delete</button>
      </div>
    `;
    projectListEl.appendChild(card);

    const openProjBtn = card.querySelector(".open-proj");
    openProjBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const pId = e.target.dataset.pid;
      // redirect to editor with ?project= param
      window.location.href = `editor.html?project=${pId}`;
    });
    
    const deleteBtn = card.querySelector(".del-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const pId = e.target.dataset.pid;
      if (confirm(`Delete project "${pId}"? This cannot be undone.`)) {
        deleteProject(currentUser.uid, pId);
      }
    });    
  });
}

// Open the modal to create a new file
function openFileModal() {
  fileModal.style.display = "block";
}

// Close the modal
function closeFileModal() {
  fileModal.style.display = "none";
  newFileNameInput.value = "";
  selectedProjectId = null;
}

confirmCreateFileBtn.addEventListener("click", () => {
  if (!selectedProjectId || !currentUser) return;
  const fileName = newFileNameInput.value.trim();
  if (!fileName) {
    alert("Please enter a file name.");
    return;
  }
  createFile(currentUser.uid, selectedProjectId, fileName, "// new file");
  closeFileModal();
});

cancelCreateFileBtn.addEventListener("click", () => {
  closeFileModal();
});