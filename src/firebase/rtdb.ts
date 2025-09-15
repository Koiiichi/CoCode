// CoCode Realtime Database Helpers

import { ref, set, get, update, remove, push, onValue, off } from 'firebase/database';
import { rtdb } from './config';

// Firebase key encoding for safe paths
export function encodeFirebaseKey(key: string): string {
  return key
    .replace(/\./g, '%2E')
    .replace(/\#/g, '%23')
    .replace(/\$/g, '%24')
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D');
}

export function decodeFirebaseKey(key: string): string {
  return key
    .replace(/%2E/g, '.')
    .replace(/%23/g, '#')
    .replace(/%24/g, '$')
    .replace(/%5B/g, '[')
    .replace(/%5D/g, ']');
}

// Database path helpers
export const dbPaths = {
  userProfile: (uid: string) => `users/${uid}/profile`,
  userProjects: (uid: string) => `projects/${uid}`,
  project: (uid: string, projectId: string) => `projects/${uid}/${projectId}`,
  projectFiles: (uid: string, projectId: string) => `files/${uid}/${projectId}`,
  projectFile: (uid: string, projectId: string, filePath: string) => 
    `files/${uid}/${projectId}/${encodeFirebaseKey(filePath)}`,
  presence: (projectId: string) => `presence/${projectId}`,
  userPresence: (projectId: string, uid: string) => `presence/${projectId}/${uid}`,
  cursors: (projectId: string, fileId: string) => `cursors/${projectId}/${fileId}`,
  userCursor: (projectId: string, fileId: string, uid: string) => 
    `cursors/${projectId}/${fileId}/${uid}`,
  comments: (projectId: string, fileId: string) => `comments/${projectId}/${fileId}`,
  comment: (projectId: string, fileId: string, commentId: string) => 
    `comments/${projectId}/${fileId}/${commentId}`,
};

// Generic database operations
export async function setValue(path: string, value: any): Promise<void> {
  await set(ref(rtdb, path), value);
}

export async function getValue(path: string): Promise<any> {
  const snapshot = await get(ref(rtdb, path));
  return snapshot.exists() ? snapshot.val() : null;
}

export async function updateValue(path: string, updates: any): Promise<void> {
  await update(ref(rtdb, path), updates);
}

export async function removeValue(path: string): Promise<void> {
  await remove(ref(rtdb, path));
}

export async function pushValue(path: string, value: any): Promise<string> {
  const newRef = push(ref(rtdb, path), value);
  return newRef.key!;
}

export function subscribeToValue(
  path: string, 
  callback: (data: any) => void,
  errorCallback?: (error: Error) => void
): () => void {
  const dbRef = ref(rtdb, path);
  
  const unsubscribe = () => off(dbRef, 'value', callback);
  
  onValue(dbRef, (snapshot) => {
    const data = snapshot.exists() ? snapshot.val() : null;
    callback(data);
  }, errorCallback);
  
  return unsubscribe;
}

// Project-specific helpers
export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
  collaborators?: string[];
}

export interface FileData {
  content: string;
  type: string;
  version?: number;
  updatedAt: number;
  updatedBy: string;
}

export async function createProject(uid: string, projectData: Omit<ProjectData, 'id' | 'ownerId'>): Promise<string> {
  const projectId = Date.now().toString();
  const project: ProjectData = {
    ...projectData,
    id: projectId,
    ownerId: uid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  await setValue(dbPaths.project(uid, projectId), project);
  return projectId;
}

export async function getProject(uid: string, projectId: string): Promise<ProjectData | null> {
  return await getValue(dbPaths.project(uid, projectId));
}

export async function updateProject(uid: string, projectId: string, updates: Partial<ProjectData>): Promise<void> {
  const updatedData = {
    ...updates,
    updatedAt: Date.now(),
  };
  await updateValue(dbPaths.project(uid, projectId), updatedData);
}

export async function deleteProject(uid: string, projectId: string): Promise<void> {
  // Remove project data
  await removeValue(dbPaths.project(uid, projectId));
  // Remove project files
  await removeValue(dbPaths.projectFiles(uid, projectId));
  // Remove presence data
  await removeValue(dbPaths.presence(projectId));
  // Remove cursors data
  await removeValue(`cursors/${projectId}`);
  // Remove comments data
  await removeValue(`comments/${projectId}`);
}

export async function getUserProjects(uid: string): Promise<ProjectData[]> {
  const projects = await getValue(dbPaths.userProjects(uid));
  return projects ? Object.values(projects) : [];
}

// File operations
export async function saveFile(
  uid: string, 
  projectId: string, 
  filePath: string, 
  content: string, 
  type: string
): Promise<void> {
  const fileData: FileData = {
    content,
    type,
    version: Date.now(),
    updatedAt: Date.now(),
    updatedBy: uid,
  };
  
  await setValue(dbPaths.projectFile(uid, projectId, filePath), fileData);
  
  // Update project timestamp
  await updateValue(dbPaths.project(uid, projectId), {
    updatedAt: Date.now(),
  });
}

export async function getFile(uid: string, projectId: string, filePath: string): Promise<FileData | null> {
  return await getValue(dbPaths.projectFile(uid, projectId, filePath));
}

export async function deleteFile(uid: string, projectId: string, filePath: string): Promise<void> {
  await removeValue(dbPaths.projectFile(uid, projectId, filePath));
}

export async function getProjectFiles(uid: string, projectId: string): Promise<Record<string, FileData>> {
  const files = await getValue(dbPaths.projectFiles(uid, projectId));
  return files || {};
}

export async function renameFile(
  uid: string, 
  projectId: string, 
  oldPath: string, 
  newPath: string
): Promise<void> {
  const oldKey = encodeFirebaseKey(oldPath);
  const newKey = encodeFirebaseKey(newPath);
  
  // Get the existing file data
  const snap = await get(ref(rtdb, dbPaths.projectFile(uid, projectId, oldPath)));
  if (!snap.exists()) {
    throw new Error("File not found");
  }
  
  // Multi-location update: add new file and remove old file atomically
  const updates: Record<string, any> = {};
  updates[`files/${uid}/${projectId}/${newKey}`] = snap.val();
  updates[`files/${uid}/${projectId}/${oldKey}`] = null;
  
  await update(ref(rtdb), updates);
  
  // Update project timestamp
  await updateValue(dbPaths.project(uid, projectId), {
    updatedAt: Date.now(),
  });
}

// Presence operations
export interface PresenceData {
  uid: string;
  displayName: string;
  photoURL?: string;
  currentFile?: string;
  lastSeen: number;
  color: string;
}

export async function setPresence(projectId: string, uid: string, data: PresenceData): Promise<void> {
  await setValue(dbPaths.userPresence(projectId, uid), {
    ...data,
    lastSeen: Date.now(),
  });
}

export async function removePresence(projectId: string, uid: string): Promise<void> {
  await removeValue(dbPaths.userPresence(projectId, uid));
}

export function subscribeToPresence(
  projectId: string,
  callback: (users: Record<string, PresenceData>) => void
): () => void {
  return subscribeToValue(dbPaths.presence(projectId), callback);
}
