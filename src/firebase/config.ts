// CoCode Firebase Configuration

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

// Auth providers
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

// Configure providers
googleProvider.addScope('profile');
googleProvider.addScope('email');

githubProvider.addScope('user:email');

const googleClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
if (googleClientId) {
  googleProvider.setCustomParameters({
    prompt: 'select_account',
    client_id: googleClientId,
  });
}

const githubClientId = import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID;
if (githubClientId) {
  githubProvider.setCustomParameters({
    allow_signup: 'true',
    client_id: githubClientId,
  });
}
