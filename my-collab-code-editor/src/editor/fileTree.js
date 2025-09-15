/**
 * File Tree Manager - Handles folder/directory structure with nested tree UI and drag/drop
 */

import { ref, set, remove, onValue, push } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { encodeFirebaseKey, decodeFirebaseKey } from "../firebase/paths.js";

export class FileTreeManager {
  constructor(user, projectId, db) {
    this.user = user;
    this.projectId = projectId;
    this.db = db;
    this.treeData = {};
    this.expandedFolders = new Set();
    this.onFileSelect = null;
    this.onFileCreate = null;
    this.onFileDelete = null;
    this.draggedItem = null;
  }

  /**
   * Initialize the file tree manager
   */
  initialize(onFileSelect, onFileCreate, onFileDelete) {
    this.onFileSelect = onFileSelect;
    this.onFileCreate = onFileCreate;
    this.onFileDelete = onFileDelete;
    
    this.setupTreeStructure();
    this.loadTreeData();
    this.setupEventListeners();
  }

  /**
   * Setup the initial tree structure in Firebase if it doesn't exist
   */
  async setupTreeStructure() {
    const treeRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/tree`);
    
    // Check if tree structure exists
    onValue(treeRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Initialize with root folder
        const rootStructure = {
          type: 'folder',
          name: 'root',
          expanded: true,
          children: {}
        };
        set(treeRef, rootStructure);
      }
    }, { onlyOnce: true });
  }

  /**
   * Load tree data from Firebase
   */
  loadTreeData() {
    const treeRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/tree`);
    
    onValue(treeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        this.treeData = data;
        this.renderTree();
      }
    });
  }

  /**
   * Render the file tree UI
   */
  renderTree() {
    const fileList = document.getElementById('file-list');
    if (!fileList) return;

    fileList.innerHTML = '';
    
    // Add create folder button
    const createFolderBtn = document.createElement('button');
    createFolderBtn.className = 'tree-action-btn';
    createFolderBtn.innerHTML = '📁+ New Folder';
    createFolderBtn.onclick = () => this.createFolder();
    fileList.appendChild(createFolderBtn);

    // Add create file button
    const createFileBtn = document.createElement('button');
    createFileBtn.className = 'tree-action-btn';
    createFileBtn.innerHTML = '📄+ New File';
    createFileBtn.onclick = () => this.createFile();
    fileList.appendChild(createFileBtn);

    // Render tree structure
    if (this.treeData && this.treeData.children) {
      this.renderTreeNode(this.treeData.children, fileList, '');
    }
  }

  /**
   * Render a tree node (file or folder)
   */
  renderTreeNode(children, container, path) {
    Object.entries(children).forEach(([key, node]) => {
      const decodedKey = decodeFirebaseKey(key);
      const currentPath = path ? `${path}/${decodedKey}` : decodedKey;
      
      const item = document.createElement('div');
      item.className = `tree-item ${node.type}`;
      item.draggable = true;
      item.dataset.path = currentPath;
      item.dataset.type = node.type;

      if (node.type === 'folder') {
        const isExpanded = this.expandedFolders.has(currentPath);
        
        item.innerHTML = `
          <div class="tree-item-content">
            <span class="tree-toggle ${isExpanded ? 'expanded' : ''}">${isExpanded ? '▼' : '▶'}</span>
            <span class="tree-icon">📁</span>
            <span class="tree-name">${decodedKey}</span>
            <div class="tree-actions">
              <button class="tree-action-btn small" onclick="event.stopPropagation(); fileTreeManager.renameItem('${currentPath}')" title="Rename">✏️</button>
              <button class="tree-action-btn small" onclick="event.stopPropagation(); fileTreeManager.deleteItem('${currentPath}')" title="Delete">🗑️</button>
            </div>
          </div>
        `;

        // Add click handler for folder toggle
        const toggle = item.querySelector('.tree-toggle');
        const content = item.querySelector('.tree-item-content');
        content.onclick = (e) => {
          e.stopPropagation();
          this.toggleFolder(currentPath);
        };

        // Add children container
        const childrenContainer = document.createElement('div');
        childrenContainer.className = `tree-children ${isExpanded ? 'expanded' : 'collapsed'}`;
        
        if (isExpanded && node.children) {
          this.renderTreeNode(node.children, childrenContainer, currentPath);
        }
        
        item.appendChild(childrenContainer);
      } else {
        // File item
        item.innerHTML = `
          <div class="tree-item-content">
            <span class="tree-icon">${this.getFileIcon(decodedKey)}</span>
            <span class="tree-name">${decodedKey}</span>
            <div class="tree-actions">
              <button class="tree-action-btn small" onclick="event.stopPropagation(); fileTreeManager.renameItem('${currentPath}')" title="Rename">✏️</button>
              <button class="tree-action-btn small" onclick="event.stopPropagation(); fileTreeManager.deleteItem('${currentPath}')" title="Delete">🗑️</button>
            </div>
          </div>
        `;

        // Add click handler for file selection
        item.onclick = () => {
          if (this.onFileSelect) {
            this.onFileSelect(decodedKey, currentPath);
          }
        };
      }

      // Add drag and drop handlers
      this.setupDragAndDrop(item);
      
      container.appendChild(item);
    });
  }

  /**
   * Get appropriate icon for file type
   */
  getFileIcon(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap = {
      'js': '📜',
      'html': '🌐',
      'css': '🎨',
      'json': '📋',
      'md': '📝',
      'txt': '📄',
      'py': '🐍',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'php': '🐘',
      'rb': '💎',
      'go': '🐹',
      'rs': '🦀',
      'ts': '📘',
      'jsx': '⚛️',
      'tsx': '⚛️',
      'vue': '💚',
      'svelte': '🧡'
    };
    return iconMap[ext] || '📄';
  }

  /**
   * Toggle folder expanded/collapsed state
   */
  toggleFolder(path) {
    if (this.expandedFolders.has(path)) {
      this.expandedFolders.delete(path);
    } else {
      this.expandedFolders.add(path);
    }
    this.renderTree();
  }

  /**
   * Create a new folder
   */
  async createFolder(parentPath = '') {
    const folderName = prompt('Enter folder name:');
    if (!folderName || folderName.trim() === '') return;

    const encodedName = encodeFirebaseKey(folderName.trim());
    const folderPath = parentPath ? `${parentPath}/${encodedName}` : encodedName;
    
    try {
      const folderRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/tree/children/${this.getFirebasePath(folderPath)}`);
      await set(folderRef, {
        type: 'folder',
        name: folderName.trim(),
        children: {}
      });
      
      // Expand parent folder if it exists
      if (parentPath) {
        this.expandedFolders.add(parentPath);
      }
      
      this.showNotification(`Folder "${folderName}" created successfully`);
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder: ' + error.message);
    }
  }

  /**
   * Create a new file
   */
  async createFile(parentPath = '') {
    const fileName = prompt('Enter file name (e.g. main.js):');
    if (!fileName || fileName.trim() === '') return;

    const encodedName = encodeFirebaseKey(fileName.trim());
    const filePath = parentPath ? `${parentPath}/${encodedName}` : encodedName;
    
    try {
      // Add to tree structure
      const fileRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/tree/children/${this.getFirebasePath(filePath)}`);
      await set(fileRef, {
        type: 'file',
        name: fileName.trim()
      });

      // Create actual file content
      const contentRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/files/${encodedName}`);
      await set(contentRef, {
        content: '// New file',
        type: this.inferLanguageFromExtension(fileName)
      });

      // Expand parent folder if it exists
      if (parentPath) {
        this.expandedFolders.add(parentPath);
      }

      if (this.onFileCreate) {
        this.onFileCreate(fileName.trim(), filePath);
      }
      
      this.showNotification(`File "${fileName}" created successfully`);
    } catch (error) {
      console.error('Error creating file:', error);
      alert('Failed to create file: ' + error.message);
    }
  }

  /**
   * Rename an item (file or folder)
   */
  async renameItem(path) {
    const pathParts = path.split('/');
    const currentName = pathParts[pathParts.length - 1];
    const newName = prompt(`Rename "${currentName}" to:`, currentName);
    
    if (!newName || newName.trim() === '' || newName === currentName) return;

    try {
      const encodedNewName = encodeFirebaseKey(newName.trim());
      const newPath = pathParts.slice(0, -1).concat(encodedNewName).join('/');
      
      // Get current item data
      const currentRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/tree/children/${this.getFirebasePath(path)}`);
      onValue(currentRef, async (snapshot) => {
        const itemData = snapshot.val();
        if (itemData) {
          // Create new item with updated name
          const newRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/tree/children/${this.getFirebasePath(newPath)}`);
          await set(newRef, {
            ...itemData,
            name: newName.trim()
          });
          
          // Remove old item
          await remove(currentRef);
          
          // If it's a file, also rename in files collection
          if (itemData.type === 'file') {
            const oldFileRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/files/${encodeFirebaseKey(currentName)}`);
            const newFileRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/files/${encodedNewName}`);
            
            onValue(oldFileRef, async (fileSnapshot) => {
              const fileData = fileSnapshot.val();
              if (fileData) {
                await set(newFileRef, fileData);
                await remove(oldFileRef);
              }
            }, { onlyOnce: true });
          }
          
          this.showNotification(`"${currentName}" renamed to "${newName}"`);
        }
      }, { onlyOnce: true });
    } catch (error) {
      console.error('Error renaming item:', error);
      alert('Failed to rename item: ' + error.message);
    }
  }

  /**
   * Delete an item (file or folder)
   */
  async deleteItem(path) {
    const pathParts = path.split('/');
    const itemName = pathParts[pathParts.length - 1];
    
    if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return;

    try {
      const itemRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/tree/children/${this.getFirebasePath(path)}`);
      
      // Get item data to check if it's a file
      onValue(itemRef, async (snapshot) => {
        const itemData = snapshot.val();
        if (itemData) {
          // Remove from tree
          await remove(itemRef);
          
          // If it's a file, also remove from files collection
          if (itemData.type === 'file') {
            const fileRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/files/${encodeFirebaseKey(itemName)}`);
            await remove(fileRef);
            
            if (this.onFileDelete) {
              this.onFileDelete(itemName);
            }
          }
          
          this.showNotification(`"${itemName}" deleted successfully`);
        }
      }, { onlyOnce: true });
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item: ' + error.message);
    }
  }

  /**
   * Setup drag and drop functionality
   */
  setupDragAndDrop(item) {
    item.addEventListener('dragstart', (e) => {
      this.draggedItem = {
        path: item.dataset.path,
        type: item.dataset.type,
        element: item
      };
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      this.draggedItem = null;
    });

    item.addEventListener('dragover', (e) => {
      if (item.dataset.type === 'folder' && this.draggedItem && this.draggedItem.element !== item) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      }
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      
      if (item.dataset.type === 'folder' && this.draggedItem) {
        this.moveItem(this.draggedItem.path, item.dataset.path);
      }
    });
  }

  /**
   * Move an item to a new location
   */
  async moveItem(sourcePath, targetFolderPath) {
    if (sourcePath === targetFolderPath || sourcePath.startsWith(targetFolderPath + '/')) {
      alert('Cannot move item into itself or its subdirectory');
      return;
    }

    try {
      const sourcePathParts = sourcePath.split('/');
      const itemName = sourcePathParts[sourcePathParts.length - 1];
      const newPath = `${targetFolderPath}/${itemName}`;

      // Get source item data
      const sourceRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/tree/children/${this.getFirebasePath(sourcePath)}`);
      
      onValue(sourceRef, async (snapshot) => {
        const itemData = snapshot.val();
        if (itemData) {
          // Create item in new location
          const targetRef = ref(this.db, `users/${this.user.uid}/projects/${this.projectId}/tree/children/${this.getFirebasePath(newPath)}`);
          await set(targetRef, itemData);
          
          // Remove from old location
          await remove(sourceRef);
          
          // Expand target folder
          this.expandedFolders.add(targetFolderPath);
          
          this.showNotification(`"${itemName}" moved successfully`);
        }
      }, { onlyOnce: true });
    } catch (error) {
      console.error('Error moving item:', error);
      alert('Failed to move item: ' + error.message);
    }
  }

  /**
   * Convert path to Firebase-safe path
   */
  getFirebasePath(path) {
    return path.split('/').map(part => encodeFirebaseKey(part)).join('/children/');
  }

  /**
   * Infer language from file extension
   */
  inferLanguageFromExtension(fileName) {
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
      'rs': 'rust',
      'vue': 'vue',
      'svelte': 'svelte'
    };
    return langMap[ext] || 'plaintext';
  }

  /**
   * Show notification
   */
  showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'tree-notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * Get flat list of all files for compatibility with existing code
   */
  getAllFiles() {
    const files = [];
    
    const traverse = (children, path = '') => {
      if (!children) return;
      
      Object.entries(children).forEach(([key, node]) => {
        const decodedKey = decodeFirebaseKey(key);
        const currentPath = path ? `${path}/${decodedKey}` : decodedKey;
        
        if (node.type === 'file') {
          files.push({
            name: decodedKey,
            path: currentPath
          });
        } else if (node.type === 'folder' && node.children) {
          traverse(node.children, currentPath);
        }
      });
    };
    
    if (this.treeData && this.treeData.children) {
      traverse(this.treeData.children);
    }
    
    return files;
  }
}

// Make it globally available for event handlers
window.fileTreeManager = null;
