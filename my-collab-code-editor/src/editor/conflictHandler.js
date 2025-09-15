/**
 * Conflict Handler - Manages version control and merge conflicts for collaborative editing
 */

import { ref, set, get, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { encodeFirebaseKey } from "../firebase/paths.js";

export class ConflictHandler {
  constructor(user, projectId, db) {
    this.user = user;
    this.projectId = projectId;
    this.db = db;
    this.fileVersions = new Map(); // Track local file versions
    this.conflictQueue = new Map(); // Queue of pending conflicts
    this.isResolvingConflict = false;
    this.diffEditor = null;
    this.onConflictResolved = null;
  }

  /**
   * Initialize conflict handler
   */
  initialize(onConflictResolved) {
    this.onConflictResolved = onConflictResolved;
    this.setupConflictModal();
  }

  /**
   * Setup conflict resolution modal
   */
  setupConflictModal() {
    // Create conflict modal if it doesn't exist
    if (!document.getElementById('conflict-modal')) {
      const modal = document.createElement('div');
      modal.id = 'conflict-modal';
      modal.className = 'conflict-modal hidden';
      modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="conflict-modal-content">
          <div class="conflict-header">
            <h3>Merge Conflict Detected</h3>
            <div class="conflict-info">
              <span id="conflict-file-name">filename.js</span>
              <span class="conflict-users">Modified by multiple users</span>
            </div>
          </div>
          <div class="conflict-body">
            <div class="conflict-controls">
              <button id="accept-current" class="conflict-btn current">Accept Current</button>
              <button id="accept-incoming" class="conflict-btn incoming">Accept Incoming</button>
              <button id="accept-both" class="conflict-btn both">Accept Both</button>
              <button id="manual-merge" class="conflict-btn manual">Manual Merge</button>
            </div>
            <div id="diff-editor-container"></div>
          </div>
          <div class="conflict-footer">
            <button id="cancel-merge" class="secondary-btn">Cancel</button>
            <button id="resolve-conflict" class="primary-btn">Resolve Conflict</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Setup event listeners
      this.setupConflictEventListeners();
    }
  }

  /**
   * Setup event listeners for conflict resolution
   */
  setupConflictEventListeners() {
    const modal = document.getElementById('conflict-modal');
    
    // Close modal handlers
    document.getElementById('cancel-merge')?.addEventListener('click', () => {
      this.closeConflictModal();
    });

    modal.querySelector('.modal-backdrop')?.addEventListener('click', () => {
      this.closeConflictModal();
    });

    // Conflict resolution buttons
    document.getElementById('accept-current')?.addEventListener('click', () => {
      this.resolveConflict('current');
    });

    document.getElementById('accept-incoming')?.addEventListener('click', () => {
      this.resolveConflict('incoming');
    });

    document.getElementById('accept-both')?.addEventListener('click', () => {
      this.resolveConflict('both');
    });

    document.getElementById('manual-merge')?.addEventListener('click', () => {
      this.enableManualMerge();
    });

    document.getElementById('resolve-conflict')?.addEventListener('click', () => {
      this.finalizeConflictResolution();
    });
  }

  /**
   * Register a file for conflict detection
   */
  registerFile(fileName, initialVersion = 1) {
    const encodedFileName = encodeFirebaseKey(fileName);
    const versionRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/versions/${encodedFileName}`);
    
    // Initialize version if it doesn't exist
    get(versionRef).then((snapshot) => {
      if (!snapshot.exists()) {
        set(versionRef, {
          version: initialVersion,
          lastModified: serverTimestamp(),
          lastModifiedBy: this.user.uid
        });
      }
      this.fileVersions.set(fileName, snapshot.val()?.version || initialVersion);
    });

    // Listen for version changes
    onValue(versionRef, (snapshot) => {
      const versionData = snapshot.val();
      if (versionData) {
        const remoteVersion = versionData.version;
        const localVersion = this.fileVersions.get(fileName);
        
        if (remoteVersion > localVersion && versionData.lastModifiedBy !== this.user.uid) {
          // Potential conflict detected
          this.handlePotentialConflict(fileName, localVersion, remoteVersion, versionData);
        }
      }
    });
  }

  /**
   * Handle potential conflict when versions diverge
   */
  async handlePotentialConflict(fileName, localVersion, remoteVersion, remoteVersionData) {
    if (this.isResolvingConflict) return;

    const encodedFileName = encodeFirebaseKey(fileName);
    
    // Get current file content
    const fileRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/files/${encodedFileName}/content`);
    const currentSnapshot = await get(fileRef);
    const currentContent = currentSnapshot.val() || '';

    // Get the content from when the conflict started
    const baseRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/versions/${encodedFileName}/baseContent`);
    const baseSnapshot = await get(baseRef);
    const baseContent = baseSnapshot.val() || '';

    // Check if there's actually a conflict (different content)
    if (currentContent !== baseContent) {
      this.showConflictModal(fileName, currentContent, baseContent, remoteVersionData);
    } else {
      // No actual conflict, just update version
      this.fileVersions.set(fileName, remoteVersion);
    }
  }

  /**
   * Show conflict resolution modal
   */
  showConflictModal(fileName, currentContent, incomingContent, remoteVersionData) {
    this.isResolvingConflict = true;
    
    const modal = document.getElementById('conflict-modal');
    const fileNameEl = document.getElementById('conflict-file-name');
    const diffContainer = document.getElementById('diff-editor-container');

    if (fileNameEl) fileNameEl.textContent = fileName;
    
    // Store conflict data
    this.currentConflict = {
      fileName,
      currentContent,
      incomingContent,
      remoteVersionData
    };

    // Initialize Monaco Diff Editor
    require(['vs/editor/editor.main'], () => {
      if (this.diffEditor) {
        this.diffEditor.dispose();
      }

      this.diffEditor = monaco.editor.createDiffEditor(diffContainer, {
        theme: 'vs-dark',
        readOnly: false,
        renderSideBySide: true,
        ignoreTrimWhitespace: false,
        renderIndicators: true,
        originalEditable: false,
        modifiedEditable: true
      });

      const originalModel = monaco.editor.createModel(currentContent, this.getLanguageFromFileName(fileName));
      const modifiedModel = monaco.editor.createModel(incomingContent, this.getLanguageFromFileName(fileName));

      this.diffEditor.setModel({
        original: originalModel,
        modified: modifiedModel
      });
    });

    modal.classList.remove('hidden');
  }

  /**
   * Resolve conflict with selected strategy
   */
  resolveConflict(strategy) {
    if (!this.currentConflict) return;

    const { currentContent, incomingContent } = this.currentConflict;
    let resolvedContent = '';

    switch (strategy) {
      case 'current':
        resolvedContent = currentContent;
        break;
      case 'incoming':
        resolvedContent = incomingContent;
        break;
      case 'both':
        resolvedContent = this.mergeBothVersions(currentContent, incomingContent);
        break;
      case 'manual':
        // Manual merge is handled separately
        return;
    }

    this.applyResolvedContent(resolvedContent);
  }

  /**
   * Enable manual merge mode
   */
  enableManualMerge() {
    if (!this.diffEditor) return;

    // Make the modified editor editable
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    modifiedEditor.updateOptions({ readOnly: false });

    // Add merge conflict markers
    const { currentContent, incomingContent } = this.currentConflict;
    const mergeContent = this.createMergeConflictMarkers(currentContent, incomingContent);
    
    const modifiedModel = modifiedEditor.getModel();
    modifiedModel.setValue(mergeContent);

    // Show instructions
    this.showMergeInstructions();
  }

  /**
   * Create merge conflict markers
   */
  createMergeConflictMarkers(current, incoming) {
    return `<<<<<<< Current (Your changes)
${current}
=======
${incoming}
>>>>>>> Incoming (Other user's changes)`;
  }

  /**
   * Show merge instructions
   */
  showMergeInstructions() {
    const instructions = document.createElement('div');
    instructions.className = 'merge-instructions';
    instructions.innerHTML = `
      <div class="instruction-header">Manual Merge Instructions:</div>
      <ul>
        <li>Edit the code in the right panel to resolve conflicts</li>
        <li>Remove conflict markers (&lt;&lt;&lt;&lt;&lt;&lt;&lt;, =======, &gt;&gt;&gt;&gt;&gt;&gt;&gt;)</li>
        <li>Keep the changes you want from both versions</li>
        <li>Click "Resolve Conflict" when done</li>
      </ul>
    `;
    
    const diffContainer = document.getElementById('diff-editor-container');
    diffContainer.insertBefore(instructions, diffContainer.firstChild);
  }

  /**
   * Merge both versions with clear separation
   */
  mergeBothVersions(current, incoming) {
    return `${current}

// ===== Merged from other user =====
${incoming}`;
  }

  /**
   * Finalize conflict resolution
   */
  async finalizeConflictResolution() {
    if (!this.diffEditor || !this.currentConflict) return;

    const modifiedEditor = this.diffEditor.getModifiedEditor();
    const resolvedContent = modifiedEditor.getModel().getValue();

    // Check if manual merge still has conflict markers
    if (resolvedContent.includes('<<<<<<<') || resolvedContent.includes('>>>>>>>')) {
      alert('Please resolve all conflict markers before finalizing.');
      return;
    }

    await this.applyResolvedContent(resolvedContent);
  }

  /**
   * Apply resolved content and update version
   */
  async applyResolvedContent(resolvedContent) {
    if (!this.currentConflict) return;

    const { fileName, remoteVersionData } = this.currentConflict;
    const encodedFileName = encodeFirebaseKey(fileName);

    try {
      // Update file content
      const fileRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/files/${encodedFileName}/content`);
      await set(fileRef, resolvedContent);

      // Update version
      const newVersion = (remoteVersionData.version || 1) + 1;
      const versionRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/versions/${encodedFileName}`);
      await set(versionRef, {
        version: newVersion,
        lastModified: serverTimestamp(),
        lastModifiedBy: this.user.uid,
        baseContent: resolvedContent
      });

      // Update local version tracking
      this.fileVersions.set(fileName, newVersion);

      // Notify that conflict was resolved
      if (this.onConflictResolved) {
        this.onConflictResolved(fileName, resolvedContent);
      }

      this.showConflictNotification(`Conflict resolved for ${fileName}`);
      this.closeConflictModal();

    } catch (error) {
      console.error('Error resolving conflict:', error);
      alert('Failed to resolve conflict: ' + error.message);
    }
  }

  /**
   * Close conflict modal
   */
  closeConflictModal() {
    const modal = document.getElementById('conflict-modal');
    modal.classList.add('hidden');

    // Clean up diff editor
    if (this.diffEditor) {
      this.diffEditor.dispose();
      this.diffEditor = null;
    }

    // Clear conflict data
    this.currentConflict = null;
    this.isResolvingConflict = false;

    // Remove merge instructions if present
    const instructions = document.querySelector('.merge-instructions');
    if (instructions) {
      instructions.remove();
    }
  }

  /**
   * Prepare file for save (version check)
   */
  async prepareSave(fileName, content) {
    const encodedFileName = encodeFirebaseKey(fileName);
    const versionRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/versions/${encodedFileName}`);
    
    try {
      const snapshot = await get(versionRef);
      const remoteVersion = snapshot.val()?.version || 1;
      const localVersion = this.fileVersions.get(fileName) || 1;

      if (remoteVersion > localVersion) {
        // Version conflict - need to merge
        return false;
      }

      // Safe to save - increment version
      const newVersion = remoteVersion + 1;
      await set(versionRef, {
        version: newVersion,
        lastModified: serverTimestamp(),
        lastModifiedBy: this.user.uid,
        baseContent: content
      });

      this.fileVersions.set(fileName, newVersion);
      return true;

    } catch (error) {
      console.error('Error checking version:', error);
      return false;
    }
  }

  /**
   * Get language from file name
   */
  getLanguageFromFileName(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const langMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust'
    };
    return langMap[ext] || 'plaintext';
  }

  /**
   * Show conflict notification
   */
  showConflictNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'conflict-notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }

  /**
   * Check if file has pending conflicts
   */
  hasConflicts(fileName) {
    return this.conflictQueue.has(fileName);
  }

  /**
   * Get conflict status for file
   */
  getConflictStatus(fileName) {
    const localVersion = this.fileVersions.get(fileName) || 1;
    return {
      localVersion,
      hasConflicts: this.hasConflicts(fileName),
      isResolving: this.isResolvingConflict && this.currentConflict?.fileName === fileName
    };
  }
}
