// fileIO.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import {
    getDatabase,
    ref,
    onValue,
    set,
    remove,
    update
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// Initialize
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
const db = getDatabase(app);

/**
 * Create a new project under the user's account.
 * @param {string} uid User ID of the current user
 * @param {string} projectId e.g. "proj_1234567"
 * @param {string} name Optional project name
 * @param {string} language e.g. "javascript"
 * @param {string} theme e.g. "vs-dark"
 */
export function createProject(uid, projectId, name, theme = "vs-dark") {
    const projectPath = `users/${uid}/projects/${projectId}`;
    set(ref(db, projectPath), {
        projectName: name || projectId,
        theme,
        shareList: [],
        files: {}
    }).catch(console.error);
}

/**
 * Delete the user's project entirely
 */
export async function deleteProject(uid, projectId) {
    const projectPath = `users/${uid}/projects/${projectId}`;
    await remove(ref(db, projectPath)).catch(console.error);
}

/**
 * Create a single file in a project (e.g. "main.c", "style.css")
 */
export function createFile(uid, projectId, fileName, initialContent = "") {
    // Encode the file name before using it as a key.
    const encodedFileName = encodeURIComponent(fileName);
    const fileRef = ref(db, `users/${uid}/projects/${projectId}/files/${encodedFileName}`);
    const ext = fileName.toLowerCase().split(".").pop();
    const fileType = inferLanguage(ext);
    return set(fileRef, {
        content: initialContent,
        type: fileType
    }).catch(console.error);
}

function inferLanguage(ext) {
    switch (ext) {
        case "js": return "javascript";
        case "c": return "c";
        case "cpp": return "cpp";
        case "html": return "html";
        case "css": return "css";
        default: return "plaintext";
    }
}

/**
 * Listen for all projects for a user
 */
export function onUserProjects(uid, callback) {
    const projectsRef = ref(db, `users/${uid}/projects`);
    onValue(projectsRef, (snapshot) => {
        callback(snapshot.val());
    });
}

/**
 * [PLACEHOLDER] Listen for projects that have "uid" in their shareList
 * For now, we do not have a real share listing. This shows how you'd do it later.
 */
export function onSharedProjects(uid, callback) {
    // In a more advanced implementation, you'd do a scan or store an index of shared projects.
    // For now, just pass an empty object to the callback.
    callback({});
}