// Inline commenting system
import { getDatabase, ref, set, onValue, onChildAdded, onChildChanged, onChildRemoved, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { paths } from "../firebase/paths.js";

export class CommentsManager {
  constructor(currentUser, projectId) {
    this.currentUser = currentUser;
    this.projectId = projectId;
    this.db = getDatabase();
    this.currentFileId = null;
    this.editor = null;
    this.comments = new Map(); // commentId -> comment data
    this.decorations = new Map(); // commentId -> decoration ids
    this.isInitialized = false;
  }

  initialize(editor) {
    this.editor = editor;
    this.createCommentsUI();
    this.setupEventHandlers();
    this.isInitialized = true;
  }

  createCommentsUI() {
    // Create comments panel
    const editorWrapper = document.querySelector('.editor-wrapper');
    if (!editorWrapper) return;

    const commentsPanel = document.createElement('div');
    commentsPanel.id = 'comments-panel';
    commentsPanel.className = 'slide-panel hidden';
    commentsPanel.innerHTML = `
      <div class="panel-header">
        <h3>Comments</h3>
        <button id="close-comments-btn" class="close-btn">×</button>
      </div>
      <div class="comments-content">
        <div id="comments-list" class="comments-list">
          <div class="no-comments">No comments yet. Right-click on a line to add one.</div>
        </div>
      </div>
    `;

    editorWrapper.appendChild(commentsPanel);

    // Add comments button to sidebar
    this.addCommentsSidebarButton();

    // Create comment modal
    this.createCommentModal();
  }

  addCommentsSidebarButton() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    const commentsBtn = document.createElement('button');
    commentsBtn.className = 'sidebar-btn';
    commentsBtn.id = 'comments-btn';
    commentsBtn.title = 'Comments';
    commentsBtn.innerHTML = '💬';

    sidebar.appendChild(commentsBtn);

    commentsBtn.addEventListener('click', () => {
      this.toggleCommentsPanel();
    });
  }

  createCommentModal() {
    const modal = document.createElement('div');
    modal.id = 'comment-modal';
    modal.className = 'comment-modal hidden';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h4 id="comment-modal-title">Add Comment</h4>
          <button id="close-comment-modal" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="comment-context">
            <span class="line-info">Line <span id="comment-line-number"></span></span>
            <div class="code-preview" id="comment-code-preview"></div>
          </div>
          <textarea id="comment-text" placeholder="Write your comment..." rows="4"></textarea>
        </div>
        <div class="modal-footer">
          <button id="cancel-comment" class="secondary-btn">Cancel</button>
          <button id="save-comment" class="primary-btn">Save Comment</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  setupEventHandlers() {
    // Context menu for adding comments
    this.editor.onContextMenu((e) => {
      this.handleContextMenu(e);
    });

    // Modal event handlers
    document.getElementById('close-comment-modal')?.addEventListener('click', () => {
      this.hideCommentModal();
    });

    document.getElementById('cancel-comment')?.addEventListener('click', () => {
      this.hideCommentModal();
    });

    document.getElementById('save-comment')?.addEventListener('click', () => {
      this.saveComment();
    });

    document.getElementById('close-comments-btn')?.addEventListener('click', () => {
      this.toggleCommentsPanel();
    });

    // Click outside modal to close
    document.getElementById('comment-modal')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        this.hideCommentModal();
      }
    });

    // Gutter click for comments
    this.editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
        this.handleGutterClick(e);
      }
    });
  }

  handleContextMenu(e) {
    const position = e.target.position;
    if (!position) return;

    // Add custom context menu item
    setTimeout(() => {
      const contextMenu = document.querySelector('.monaco-menu');
      if (contextMenu) {
        const addCommentItem = document.createElement('div');
        addCommentItem.className = 'monaco-action-bar';
        addCommentItem.innerHTML = `
          <div class="action-item">
            <a class="action-label" role="menuitem">💬 Add Comment</a>
          </div>
        `;
        
        addCommentItem.addEventListener('click', () => {
          this.showAddCommentModal(position.lineNumber);
        });

        contextMenu.appendChild(addCommentItem);
      }
    }, 10);
  }

  handleGutterClick(e) {
    const lineNumber = e.target.position.lineNumber;
    const existingComments = this.getCommentsForLine(lineNumber);
    
    if (existingComments.length > 0) {
      this.showCommentsForLine(lineNumber);
    }
  }

  showAddCommentModal(lineNumber, commentId = null) {
    const modal = document.getElementById('comment-modal');
    const titleEl = document.getElementById('comment-modal-title');
    const lineNumberEl = document.getElementById('comment-line-number');
    const codePreviewEl = document.getElementById('comment-code-preview');
    const textArea = document.getElementById('comment-text');

    if (!modal || !this.editor) return;

    // Get line content for preview
    const model = this.editor.getModel();
    const lineContent = model.getLineContent(lineNumber);

    lineNumberEl.textContent = lineNumber;
    codePreviewEl.textContent = lineContent.trim() || '(empty line)';

    if (commentId) {
      const comment = this.comments.get(commentId);
      titleEl.textContent = 'Edit Comment';
      textArea.value = comment?.body || '';
    } else {
      titleEl.textContent = 'Add Comment';
      textArea.value = '';
    }

    // Store current context
    modal.dataset.lineNumber = lineNumber;
    modal.dataset.commentId = commentId || '';

    modal.classList.remove('hidden');
    textArea.focus();
  }

  hideCommentModal() {
    const modal = document.getElementById('comment-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  async saveComment() {
    const modal = document.getElementById('comment-modal');
    const textArea = document.getElementById('comment-text');
    
    if (!modal || !textArea) return;

    const lineNumber = parseInt(modal.dataset.lineNumber);
    const commentId = modal.dataset.commentId;
    const body = textArea.value.trim();

    if (!body) {
      alert('Please enter a comment');
      return;
    }

    try {
      if (commentId) {
        // Update existing comment
        await this.updateComment(commentId, body);
      } else {
        // Create new comment
        await this.createComment(lineNumber, body);
      }
      
      this.hideCommentModal();
    } catch (error) {
      console.error('Failed to save comment:', error);
      alert('Failed to save comment: ' + error.message);
    }
  }

  async createComment(lineNumber, body) {
    if (!this.currentFileId || !this.currentUser) return;

    const commentsRef = ref(this.db, paths.comments(this.projectId, this.currentFileId));
    const newCommentRef = push(commentsRef);

    const commentData = {
      line: lineNumber,
      body: body,
      author: this.currentUser.uid,
      authorName: this.currentUser.displayName || this.currentUser.email,
      createdAt: serverTimestamp(),
      status: 'open'
    };

    await set(newCommentRef, commentData);
  }

  async updateComment(commentId, body) {
    if (!this.currentFileId) return;

    const commentRef = ref(this.db, paths.comment(this.projectId, this.currentFileId, commentId));
    await set(commentRef, {
      ...this.comments.get(commentId),
      body: body,
      updatedAt: serverTimestamp()
    });
  }

  async resolveComment(commentId) {
    if (!this.currentFileId) return;

    const commentRef = ref(this.db, paths.comment(this.projectId, this.currentFileId, commentId));
    const comment = this.comments.get(commentId);
    
    if (comment) {
      await set(commentRef, {
        ...comment,
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        resolvedBy: this.currentUser.uid
      });
    }
  }

  async reopenComment(commentId) {
    if (!this.currentFileId) return;

    const commentRef = ref(this.db, paths.comment(this.projectId, this.currentFileId, commentId));
    const comment = this.comments.get(commentId);
    
    if (comment) {
      await set(commentRef, {
        ...comment,
        status: 'open',
        reopenedAt: serverTimestamp(),
        reopenedBy: this.currentUser.uid
      });
    }
  }

  switchFile(fileId) {
    this.currentFileId = fileId;
    this.clearDecorations();
    this.comments.clear();
    
    if (fileId) {
      this.loadComments();
    }
    
    this.updateCommentsPanel();
  }

  loadComments() {
    if (!this.currentFileId) return;

    const commentsRef = ref(this.db, paths.comments(this.projectId, this.currentFileId));
    
    // Listen for new comments
    onChildAdded(commentsRef, (snapshot) => {
      const commentId = snapshot.key;
      const commentData = snapshot.val();
      this.comments.set(commentId, { id: commentId, ...commentData });
      this.addCommentDecoration(commentId, commentData);
      this.updateCommentsPanel();
    });

    // Listen for comment changes
    onChildChanged(commentsRef, (snapshot) => {
      const commentId = snapshot.key;
      const commentData = snapshot.val();
      this.comments.set(commentId, { id: commentId, ...commentData });
      this.updateCommentDecoration(commentId, commentData);
      this.updateCommentsPanel();
    });

    // Listen for comment removal
    onChildRemoved(commentsRef, (snapshot) => {
      const commentId = snapshot.key;
      this.comments.delete(commentId);
      this.removeCommentDecoration(commentId);
      this.updateCommentsPanel();
    });
  }

  addCommentDecoration(commentId, comment) {
    if (!this.editor) return;

    const decorations = [{
      range: new monaco.Range(comment.line, 1, comment.line, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: comment.status === 'resolved' ? 'comment-glyph resolved' : 'comment-glyph open',
        glyphMarginHoverMessage: { value: `💬 ${comment.body}` },
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    }];

    const decorationIds = this.editor.deltaDecorations([], decorations);
    this.decorations.set(commentId, decorationIds);
  }

  updateCommentDecoration(commentId, comment) {
    this.removeCommentDecoration(commentId);
    this.addCommentDecoration(commentId, comment);
  }

  removeCommentDecoration(commentId) {
    const decorationIds = this.decorations.get(commentId);
    if (decorationIds && this.editor) {
      this.editor.deltaDecorations(decorationIds, []);
      this.decorations.delete(commentId);
    }
  }

  clearDecorations() {
    this.decorations.forEach((decorationIds) => {
      if (this.editor) {
        this.editor.deltaDecorations(decorationIds, []);
      }
    });
    this.decorations.clear();
  }

  getCommentsForLine(lineNumber) {
    return Array.from(this.comments.values()).filter(comment => comment.line === lineNumber);
  }

  showCommentsForLine(lineNumber) {
    this.showCommentsPanel();
    // Scroll to comments for this line
    const commentElements = document.querySelectorAll(`[data-line="${lineNumber}"]`);
    if (commentElements.length > 0) {
      commentElements[0].scrollIntoView({ behavior: 'smooth' });
    }
  }

  toggleCommentsPanel() {
    const panel = document.getElementById('comments-panel');
    if (panel) {
      panel.classList.toggle('hidden');
      panel.classList.toggle('visible');
    }
  }

  showCommentsPanel() {
    const panel = document.getElementById('comments-panel');
    if (panel) {
      panel.classList.remove('hidden');
      panel.classList.add('visible');
    }
  }

  updateCommentsPanel() {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;

    const comments = Array.from(this.comments.values()).sort((a, b) => a.line - b.line);

    if (comments.length === 0) {
      commentsList.innerHTML = '<div class="no-comments">No comments yet. Right-click on a line to add one.</div>';
      return;
    }

    commentsList.innerHTML = comments.map(comment => `
      <div class="comment-item ${comment.status}" data-line="${comment.line}">
        <div class="comment-header">
          <span class="comment-line">Line ${comment.line}</span>
          <span class="comment-status ${comment.status}">${comment.status}</span>
        </div>
        <div class="comment-body">${this.escapeHtml(comment.body)}</div>
        <div class="comment-meta">
          <span class="comment-author">${comment.authorName}</span>
          <span class="comment-time">${this.formatTime(comment.createdAt)}</span>
        </div>
        <div class="comment-actions">
          <button class="comment-action-btn" onclick="commentsManager.editComment('${comment.id}')">Edit</button>
          ${comment.status === 'open' 
            ? `<button class="comment-action-btn resolve" onclick="commentsManager.resolveComment('${comment.id}')">Resolve</button>`
            : `<button class="comment-action-btn reopen" onclick="commentsManager.reopenComment('${comment.id}')">Reopen</button>`
          }
          <button class="comment-action-btn goto" onclick="commentsManager.goToLine(${comment.line})">Go to Line</button>
        </div>
      </div>
    `).join('');

    // Make commentsManager globally accessible for onclick handlers
    window.commentsManager = this;
  }

  editComment(commentId) {
    const comment = this.comments.get(commentId);
    if (comment) {
      this.showAddCommentModal(comment.line, commentId);
    }
  }

  goToLine(lineNumber) {
    if (this.editor) {
      this.editor.setPosition({ lineNumber, column: 1 });
      this.editor.revealLineInCenter(lineNumber);
      this.editor.focus();
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
  }
}
