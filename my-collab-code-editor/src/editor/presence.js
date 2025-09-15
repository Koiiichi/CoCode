// User presence and live cursors implementation
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { paths } from "../firebase/paths.js";

export class PresenceManager {
  constructor(auth, projectId) {
    this.auth = auth;
    this.projectId = projectId;
    this.db = getDatabase();
    this.currentUser = null;
    this.currentFileId = null;
    this.collaborators = new Map();
    this.cursorDecorations = new Map();
    this.editor = null;
    
    // Throttle cursor updates
    this.cursorUpdateThrottle = null;
    this.CURSOR_THROTTLE_MS = 100;
    
    // User colors for cursors (deterministic based on uid)
    this.userColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
  }

  initialize(user, editor) {
    this.currentUser = user;
    this.editor = editor;
    this.setupPresence();
    this.setupCursorTracking();
    this.listenToCollaborators();
  }

  setupPresence() {
    if (!this.currentUser) return;

    const presencePath = paths.userPresence(this.projectId, this.currentUser.uid);
    const presenceRef = ref(this.db, presencePath);
    
    // Set user as online
    const presenceData = {
      displayName: this.currentUser.displayName || this.currentUser.email,
      email: this.currentUser.email,
      avatarUrl: this.currentUser.photoURL || null,
      lastSeen: serverTimestamp(),
      fileId: this.currentFileId,
      color: this.getUserColor(this.currentUser.uid)
    };

    set(presenceRef, presenceData);

    // Remove presence on disconnect
    onDisconnect(presenceRef).remove();

    // Update presence when switching files
    this.updatePresenceFile = (fileId) => {
      this.currentFileId = fileId;
      set(presenceRef, { ...presenceData, fileId, lastSeen: serverTimestamp() });
    };
  }

  setupCursorTracking() {
    if (!this.editor || !this.currentUser) return;

    // Track cursor position changes
    this.editor.onDidChangeCursorPosition((e) => {
      this.throttledCursorUpdate(e.position, null);
    });

    // Track selection changes
    this.editor.onDidChangeCursorSelection((e) => {
      const selection = e.selection;
      if (!selection.isEmpty()) {
        this.throttledCursorUpdate(e.position, {
          startLineNumber: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn
        });
      } else {
        this.throttledCursorUpdate(e.position, null);
      }
    });
  }

  throttledCursorUpdate(position, selection) {
    if (this.cursorUpdateThrottle) {
      clearTimeout(this.cursorUpdateThrottle);
    }

    this.cursorUpdateThrottle = setTimeout(() => {
      this.updateCursor(position, selection);
    }, this.CURSOR_THROTTLE_MS);
  }

  updateCursor(position, selection) {
    if (!this.currentUser || !this.currentFileId) return;

    const cursorPath = paths.userCursor(this.projectId, this.currentFileId, this.currentUser.uid);
    const cursorRef = ref(this.db, cursorPath);

    const cursorData = {
      position: {
        lineNumber: position.lineNumber,
        column: position.column
      },
      selection: selection,
      color: this.getUserColor(this.currentUser.uid),
      timestamp: serverTimestamp()
    };

    set(cursorRef, cursorData);

    // Clean up cursor on disconnect
    onDisconnect(cursorRef).remove();
  }

  listenToCollaborators() {
    const presenceRef = ref(this.db, paths.presence(this.projectId));
    
    onValue(presenceRef, (snapshot) => {
      const presenceData = snapshot.val() || {};
      this.updateCollaboratorsList(presenceData);
    });
  }

  listenToCursors(fileId) {
    // Clean up previous cursor listeners
    this.clearCursorDecorations();
    
    if (!fileId) return;

    const cursorsRef = ref(this.db, paths.cursors(this.projectId, fileId));
    
    onValue(cursorsRef, (snapshot) => {
      const cursorsData = snapshot.val() || {};
      this.updateCursorDecorations(cursorsData);
    });
  }

  updateCollaboratorsList(presenceData) {
    this.collaborators.clear();
    
    Object.entries(presenceData).forEach(([uid, data]) => {
      if (uid !== this.currentUser?.uid) {
        this.collaborators.set(uid, data);
      }
    });

    this.renderCollaboratorsPill();
  }

  updateCursorDecorations(cursorsData) {
    if (!this.editor) return;

    // Clear existing decorations
    this.clearCursorDecorations();

    Object.entries(cursorsData).forEach(([uid, cursorData]) => {
      if (uid === this.currentUser?.uid) return; // Skip own cursor

      const decorations = [];
      const color = cursorData.color || this.getUserColor(uid);

      // Cursor position decoration
      if (cursorData.position) {
        decorations.push({
          range: new monaco.Range(
            cursorData.position.lineNumber,
            cursorData.position.column,
            cursorData.position.lineNumber,
            cursorData.position.column
          ),
          options: {
            className: 'remote-cursor',
            beforeContentClassName: 'remote-cursor-line',
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            zIndex: 1000
          }
        });
      }

      // Selection decoration
      if (cursorData.selection) {
        decorations.push({
          range: new monaco.Range(
            cursorData.selection.startLineNumber,
            cursorData.selection.startColumn,
            cursorData.selection.endLineNumber,
            cursorData.selection.endColumn
          ),
          options: {
            className: 'remote-selection',
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            zIndex: 999
          }
        });
      }

      if (decorations.length > 0) {
        const decorationIds = this.editor.deltaDecorations([], decorations);
        this.cursorDecorations.set(uid, { decorationIds, color });
      }
    });

    this.updateCursorStyles();
  }

  clearCursorDecorations() {
    this.cursorDecorations.forEach(({ decorationIds }) => {
      if (this.editor) {
        this.editor.deltaDecorations(decorationIds, []);
      }
    });
    this.cursorDecorations.clear();
  }

  updateCursorStyles() {
    // Inject dynamic styles for cursor colors
    let styleId = 'remote-cursor-styles';
    let existingStyle = document.getElementById(styleId);
    
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    
    let css = '';
    this.cursorDecorations.forEach(({ color }, uid) => {
      css += `
        .remote-cursor-${uid} .remote-cursor-line::before {
          content: '';
          position: absolute;
          width: 2px;
          height: 100%;
          background-color: ${color};
          left: -1px;
          z-index: 1000;
        }
        .remote-selection-${uid} {
          background-color: ${color}33 !important;
        }
      `;
    });

    style.textContent = css;
    document.head.appendChild(style);
  }

  renderCollaboratorsPill() {
    let collaboratorsContainer = document.getElementById('collaborators-pill');
    
    if (!collaboratorsContainer) {
      // Create collaborators container in the title bar
      const titleBar = document.querySelector('.title-bar .title-left');
      if (titleBar) {
        collaboratorsContainer = document.createElement('div');
        collaboratorsContainer.id = 'collaborators-pill';
        collaboratorsContainer.className = 'collaborators-pill';
        titleBar.appendChild(collaboratorsContainer);
      }
    }

    if (!collaboratorsContainer) return;

    const collaboratorCount = this.collaborators.size;
    
    if (collaboratorCount === 0) {
      collaboratorsContainer.innerHTML = '';
      collaboratorsContainer.style.display = 'none';
      return;
    }

    collaboratorsContainer.style.display = 'flex';
    
    let html = '<div class="collaborators-list">';
    
    // Show up to 3 avatars, then +N for more
    const visibleCollaborators = Array.from(this.collaborators.entries()).slice(0, 3);
    
    visibleCollaborators.forEach(([uid, data]) => {
      const initials = this.getInitials(data.displayName || data.email);
      const color = data.color || this.getUserColor(uid);
      
      html += `
        <div class="collaborator-avatar" style="background-color: ${color}" title="${data.displayName || data.email}">
          ${data.avatarUrl ? `<img src="${data.avatarUrl}" alt="${initials}">` : initials}
        </div>
      `;
    });

    if (collaboratorCount > 3) {
      html += `<div class="collaborator-count">+${collaboratorCount - 3}</div>`;
    }

    html += '</div>';
    collaboratorsContainer.innerHTML = html;
  }

  getUserColor(uid) {
    // Generate deterministic color based on uid
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = ((hash << 5) - hash + uid.charCodeAt(i)) & 0xffffffff;
    }
    return this.userColors[Math.abs(hash) % this.userColors.length];
  }

  getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
  }

  // Called when switching files
  switchFile(fileId) {
    this.currentFileId = fileId;
    if (this.updatePresenceFile) {
      this.updatePresenceFile(fileId);
    }
    this.listenToCursors(fileId);
  }

  cleanup() {
    if (this.cursorUpdateThrottle) {
      clearTimeout(this.cursorUpdateThrottle);
    }
    this.clearCursorDecorations();
  }
}
