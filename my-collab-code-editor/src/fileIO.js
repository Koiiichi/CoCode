import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onVale, set } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// assuming user has read/write priviliges with the given project
function makeProject(userName, shareList, projectId, lang, thm) {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const reference = ref(db, "projects/" + projectId);
    set(reference, {
        creator: userName,
        language: lang,
        theme: thm,
        shareList: JSON.parse('[]') // empty list
    });
}

function addUser(userId, projectId) {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const reference = ref(db, "projects/" + projectId);
    reference.shareList.push(userId);
}

function removeUser(userId, projectId) {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const reference = ref(db, "projects/" + projectId);
    const index = reference.shareList.indexOf(userId);
    // index < 0 means userid was not found, which is not impossible, but shouldn't happen
    //   so it's just in case and so the program doesn't crash
    if(index > -1) {
        reference.shareList.splice(index, 1);
    }
}

// this ones iffy and probably doesn't work
function deleteProject(projectId) {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const reference = ref(db, "projects/" + projectId);
    reference = null;
}