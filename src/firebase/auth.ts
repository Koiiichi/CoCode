// CoCode Authentication Helpers

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User,
  AuthError,
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, rtdb, googleProvider, githubProvider } from './config';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  onboardingCompleted?: boolean;
  createdAt: number;
  lastLoginAt: number;
}

export interface AuthResult {
  user: User | null;
  error?: string;
}

// Email/Password Authentication
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await updateLastLogin(result.user.uid);
    return { user: result.user };
  } catch (error) {
    return { user: null, error: getAuthErrorMessage(error as AuthError) };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResult> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update user profile
    await updateProfile(result.user, { displayName });
    
    // Create user profile in database
    await createUserProfile(result.user, { displayName });
    
    return { user: result.user };
  } catch (error) {
    return { user: null, error: getAuthErrorMessage(error as AuthError) };
  }
}

// Social Authentication
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    
    // Check if user exists, create profile if not
    const profileExists = await checkUserProfile(result.user.uid);
    if (!profileExists) {
      await createUserProfile(result.user);
    } else {
      await updateLastLogin(result.user.uid);
    }
    
    return { user: result.user };
  } catch (error) {
    return { user: null, error: getAuthErrorMessage(error as AuthError) };
  }
}

export async function signInWithGithub(): Promise<AuthResult> {
  try {
    const result = await signInWithPopup(auth, githubProvider);
    
    // Check if user exists, create profile if not
    const profileExists = await checkUserProfile(result.user.uid);
    if (!profileExists) {
      await createUserProfile(result.user);
    } else {
      await updateLastLogin(result.user.uid);
    }
    
    return { user: result.user };
  } catch (error) {
    return { user: null, error: getAuthErrorMessage(error as AuthError) };
  }
}

// Sign Out
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

// Auth State Observer
export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// User Profile Management
async function createUserProfile(user: User, additionalData?: { displayName?: string }) {
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: additionalData?.displayName || user.displayName || 'Anonymous User',
    photoURL: user.photoURL || undefined,
    onboardingCompleted: false,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };

  await set(ref(rtdb, `users/${user.uid}/profile`), profile);
}

async function checkUserProfile(uid: string): Promise<boolean> {
  const snapshot = await get(ref(rtdb, `users/${uid}/profile`));
  return snapshot.exists();
}

async function updateLastLogin(uid: string): Promise<void> {
  await set(ref(rtdb, `users/${uid}/profile/lastLoginAt`), Date.now());
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snapshot = await get(ref(rtdb, `users/${uid}/profile`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    const profileRef = ref(rtdb, `users/${uid}/profile`);
    const snapshot = await get(profileRef);
    
    if (snapshot.exists()) {
      const currentProfile = snapshot.val();
      await set(profileRef, { ...currentProfile, ...updates });
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
  }
}

// Error handling
function getAuthErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return error.message || 'An error occurred during authentication.';
  }
}
