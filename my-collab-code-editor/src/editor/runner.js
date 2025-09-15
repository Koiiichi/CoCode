// Code execution and preview functionality
export class CodeRunner {
  constructor() {
    this.isEnabled = this.getFeatureFlag('FEATURE_RUNNER', true);
    this.previewFrame = null;
    this.consoleOutput = [];
    this.isRunning = false;
    
    if (this.isEnabled) {
      this.initializeRunner();
    }
  }

  getFeatureFlag(flag, defaultValue = false) {
    // Check localStorage first, then environment, then default
    const stored = localStorage.getItem(flag);
    if (stored !== null) {
      return stored === 'true';
    }
    return defaultValue;
  }

  initializeRunner() {
    this.createRunnerUI();
    this.setupMessageHandling();
  }

  createRunnerUI() {
    // Create split panel layout
    const editorWrapper = document.querySelector('.editor-wrapper');
    if (!editorWrapper) return;

    // Create runner panel container
    const runnerPanel = document.createElement('div');
    runnerPanel.id = 'runner-panel';
    runnerPanel.className = 'runner-panel hidden';
    
    runnerPanel.innerHTML = `
      <div class="runner-header">
        <div class="runner-tabs">
          <button class="runner-tab active" data-tab="preview">Preview</button>
          <button class="runner-tab" data-tab="console">Console</button>
        </div>
        <div class="runner-controls">
          <button id="run-code-btn" class="run-btn" title="Run Code (Ctrl+Enter)">
            ▶️ Run
          </button>
          <button id="stop-code-btn" class="stop-btn hidden" title="Stop">
            ⏹️ Stop
          </button>
          <button id="clear-console-btn" class="clear-btn" title="Clear Console">
            🗑️ Clear
          </button>
          <button id="toggle-runner-btn" class="toggle-btn" title="Toggle Runner">
            ❌
          </button>
        </div>
      </div>
      <div class="runner-content">
        <div id="preview-pane" class="runner-pane active">
          <iframe id="preview-frame" sandbox="allow-scripts allow-same-origin" title="Code Preview"></iframe>
        </div>
        <div id="console-pane" class="runner-pane">
          <div id="console-output" class="console-output"></div>
        </div>
      </div>
    `;

    editorWrapper.appendChild(runnerPanel);
    this.previewFrame = document.getElementById('preview-frame');
    
    this.setupRunnerEvents();
  }

  setupRunnerEvents() {
    // Run button
    document.getElementById('run-code-btn')?.addEventListener('click', () => {
      this.runCode();
    });

    // Stop button
    document.getElementById('stop-code-btn')?.addEventListener('click', () => {
      this.stopCode();
    });

    // Clear console
    document.getElementById('clear-console-btn')?.addEventListener('click', () => {
      this.clearConsole();
    });

    // Toggle runner
    document.getElementById('toggle-runner-btn')?.addEventListener('click', () => {
      this.toggleRunner();
    });

    // Tab switching
    document.querySelectorAll('.runner-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Keyboard shortcut for run (Ctrl+Enter)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.runCode();
      }
    });
  }

  setupMessageHandling() {
    // Listen for messages from the iframe
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'console') {
        this.addConsoleMessage(event.data.method, event.data.args);
      } else if (event.data && event.data.type === 'error') {
        this.addConsoleMessage('error', [event.data.message]);
      }
    });
  }

  showRunner() {
    const runnerPanel = document.getElementById('runner-panel');
    const editorWrapper = document.querySelector('.editor-wrapper');
    
    if (runnerPanel && editorWrapper) {
      runnerPanel.classList.remove('hidden');
      editorWrapper.classList.add('split-view');
    }
  }

  hideRunner() {
    const runnerPanel = document.getElementById('runner-panel');
    const editorWrapper = document.querySelector('.editor-wrapper');
    
    if (runnerPanel && editorWrapper) {
      runnerPanel.classList.add('hidden');
      editorWrapper.classList.remove('split-view');
    }
  }

  toggleRunner() {
    const runnerPanel = document.getElementById('runner-panel');
    if (runnerPanel.classList.contains('hidden')) {
      this.showRunner();
    } else {
      this.hideRunner();
    }
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.runner-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update panes
    document.querySelectorAll('.runner-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `${tabName}-pane`);
    });
  }

  async runCode() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.updateRunButton(true);
    this.clearConsole();
    this.showRunner();
    this.switchTab('preview');

    try {
      const htmlContent = this.buildHTMLContent();
      this.loadPreview(htmlContent);
    } catch (error) {
      this.addConsoleMessage('error', [`Build Error: ${error.message}`]);
    }

    this.isRunning = false;
    this.updateRunButton(false);
  }

  stopCode() {
    if (this.previewFrame) {
      this.previewFrame.src = 'about:blank';
    }
    this.isRunning = false;
    this.updateRunButton(false);
  }

  buildHTMLContent() {
    // Get all files from the current project
    const files = this.getCurrentProjectFiles();
    
    // Find HTML file or create one
    let htmlFile = files.find(f => f.name.toLowerCase().endsWith('.html'));
    let htmlContent = '';

    if (htmlFile) {
      htmlContent = htmlFile.content;
    } else {
      // Create basic HTML structure
      htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CoCode Preview</title>
</head>
<body>
    <div id="app">
        <h1>CoCode Preview</h1>
        <p>Add HTML content to see your preview here.</p>
    </div>
</body>
</html>`;
    }

    // Inject CSS files
    const cssFiles = files.filter(f => f.name.toLowerCase().endsWith('.css'));
    let cssContent = '';
    cssFiles.forEach(file => {
      cssContent += `<style>\n${file.content}\n</style>\n`;
    });

    // Inject JavaScript files
    const jsFiles = files.filter(f => 
      f.name.toLowerCase().endsWith('.js') && 
      !f.name.toLowerCase().includes('node_modules')
    );
    let jsContent = '';
    jsFiles.forEach(file => {
      jsContent += `<script>\n${file.content}\n</script>\n`;
    });

    // Add console bridge script
    const consoleBridge = this.getConsoleBridgeScript();

    // Insert CSS in head, JS before closing body
    htmlContent = htmlContent.replace('</head>', `${cssContent}</head>`);
    htmlContent = htmlContent.replace('</body>', `${consoleBridge}\n${jsContent}</body>`);

    return htmlContent;
  }

  getCurrentProjectFiles() {
    // Get files from the global modelsByFile object
    if (typeof window !== 'undefined' && window.modelsByFile) {
      return Object.entries(window.modelsByFile).map(([name, model]) => ({
        name,
        content: model.getValue()
      }));
    }
    return [];
  }

  getConsoleBridgeScript() {
    return `
<script>
(function() {
  // Override console methods to send messages to parent
  const originalConsole = { ...console };
  
  ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
    console[method] = function(...args) {
      // Call original console method
      originalConsole[method].apply(console, args);
      
      // Send to parent window
      try {
        parent.postMessage({
          type: 'console',
          method: method,
          args: args.map(arg => {
            try {
              return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
            } catch (e) {
              return String(arg);
            }
          })
        }, '*');
      } catch (e) {
        // Ignore postMessage errors
      }
    };
  });

  // Catch unhandled errors
  window.addEventListener('error', function(event) {
    try {
      parent.postMessage({
        type: 'error',
        message: event.error ? event.error.stack || event.error.message : event.message
      }, '*');
    } catch (e) {
      // Ignore postMessage errors
    }
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    try {
      parent.postMessage({
        type: 'error',
        message: 'Unhandled Promise Rejection: ' + (event.reason?.stack || event.reason)
      }, '*');
    } catch (e) {
      // Ignore postMessage errors
    }
  });
})();
</script>`;
  }

  loadPreview(htmlContent) {
    if (!this.previewFrame) return;

    // Use srcdoc for better security and performance
    this.previewFrame.srcdoc = htmlContent;
  }

  clearConsole() {
    this.consoleOutput = [];
    const consoleEl = document.getElementById('console-output');
    if (consoleEl) {
      consoleEl.innerHTML = '';
    }
  }

  addConsoleMessage(method, args) {
    const timestamp = new Date().toLocaleTimeString();
    const message = {
      method,
      args,
      timestamp
    };

    this.consoleOutput.push(message);
    this.renderConsoleMessage(message);

    // Auto-switch to console tab on error
    if (method === 'error') {
      this.switchTab('console');
    }
  }

  renderConsoleMessage(message) {
    const consoleEl = document.getElementById('console-output');
    if (!consoleEl) return;

    const messageEl = document.createElement('div');
    messageEl.className = `console-message console-${message.method}`;
    
    const timeEl = document.createElement('span');
    timeEl.className = 'console-time';
    timeEl.textContent = message.timestamp;
    
    const contentEl = document.createElement('span');
    contentEl.className = 'console-content';
    contentEl.textContent = message.args.join(' ');
    
    messageEl.appendChild(timeEl);
    messageEl.appendChild(contentEl);
    consoleEl.appendChild(messageEl);
    
    // Auto-scroll to bottom
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  updateRunButton(isRunning) {
    const runBtn = document.getElementById('run-code-btn');
    const stopBtn = document.getElementById('stop-code-btn');
    
    if (runBtn && stopBtn) {
      if (isRunning) {
        runBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
      } else {
        runBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
      }
    }
  }

  // Public method to add runner toggle to UI
  addRunnerToggle() {
    const tabActions = document.querySelector('.tab-actions');
    if (tabActions && this.isEnabled) {
      const runnerToggle = document.createElement('button');
      runnerToggle.className = 'tab-action-btn';
      runnerToggle.id = 'show-runner-btn';
      runnerToggle.title = 'Show Code Runner';
      runnerToggle.innerHTML = '▶️ Run';
      
      runnerToggle.addEventListener('click', () => {
        this.showRunner();
      });
      
      tabActions.insertBefore(runnerToggle, tabActions.firstChild);
    }
  }
}
