// Firebase RTDB path helpers and encoders
export function encodeFirebaseKey(fileName) {
  return encodeURIComponent(fileName)
    .replace(/\./g, '%2E')
    .replace(/\#/g, '%23')
    .replace(/\$/g, '%24')
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D');
}

export function decodeFirebaseKey(encodedFileName) {
  return decodeURIComponent(encodedFileName);
}

// Centralized RTDB path generators
export const paths = {
  // User projects
  userProjects: (uid) => `users/${uid}/projects`,
  project: (uid, projectId) => `users/${uid}/projects/${projectId}`,
  projectFiles: (uid, projectId) => `users/${uid}/projects/${projectId}/files`,
  projectFile: (uid, projectId, encodedFileName) => `users/${uid}/projects/${projectId}/files/${encodedFileName}`,
  
  // Presence system
  presence: (projectId) => `presence/${projectId}`,
  userPresence: (projectId, uid) => `presence/${projectId}/${uid}`,
  
  // Live cursors
  cursors: (projectId, fileId) => `cursors/${projectId}/${fileId}`,
  userCursor: (projectId, fileId, uid) => `cursors/${projectId}/${fileId}/${uid}`,
  
  // Comments (for future implementation)
  comments: (projectId, fileId) => `comments/${projectId}/${fileId}`,
  comment: (projectId, fileId, commentId) => `comments/${projectId}/${fileId}/${commentId}`
};
