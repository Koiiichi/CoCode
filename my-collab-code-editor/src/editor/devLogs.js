/**
 * Development Logs Panel - Provides real-time logging and debugging information
 */

export class DevLogsManager {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.isVisible = false;
    this.logLevel = 'info'; // debug, info, warn, error
    this.filters = new Set(['info', 'warn', 'error']);
    this.setupPanel();
    this.interceptConsole();
  }

  /**
   * Setup the development logs panel
   */
  setupPanel() {
    // Create logs panel if it doesn't exist
    if (!document.getElementById('dev-logs-panel')) {
      const panel = document.createElement('div');
      panel.id = 'dev-logs-panel';
      panel.className = 'dev-logs-panel hidden';
      panel.innerHTML = `
        <div class="logs-header">
          <div class="logs-title">
            <span>🔧 Development Logs</span>
            <div class="logs-stats">
              <span id="logs-count">0 logs</span>
            </div>
          </div>
          <div class="logs-controls">
            <select id="log-level-filter" class="log-filter">
              <option value="all">All Levels</option>
              <option value="debug">Debug</option>
              <option value="info" selected>Info+</option>
              <option value="warn">Warn+</option>
              <option value="error">Error Only</option>
            </select>
            <button id="clear-logs" class="log-btn">Clear</button>
            <button id="export-logs" class="log-btn">Export</button>
            <button id="close-logs" class="log-btn close">✕</button>
          </div>
        </div>
        <div class="logs-content">
          <div id="logs-list" class="logs-list"></div>
        </div>
        <div class="logs-footer">
          <div class="logs-info">
            <span>Real-time application logs and debug information</span>
          </div>
        </div>
      `;
      document.body.appendChild(panel);

      this.setupEventListeners();
    }
  }

  /**
   * Setup event listeners for the logs panel
   */
  setupEventListeners() {
    // Close panel
    document.getElementById('close-logs')?.addEventListener('click', () => {
      this.hide();
    });

    // Clear logs
    document.getElementById('clear-logs')?.addEventListener('click', () => {
      this.clearLogs();
    });

    // Export logs
    document.getElementById('export-logs')?.addEventListener('click', () => {
      this.exportLogs();
    });

    // Filter logs
    document.getElementById('log-level-filter')?.addEventListener('change', (e) => {
      this.setLogLevel(e.target.value);
    });

    // Add keyboard shortcut (Ctrl+Shift+L)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * Intercept console methods to capture logs
   */
  interceptConsole() {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };

    // Override console methods
    console.log = (...args) => {
      this.addLog('info', args);
      originalConsole.log.apply(console, args);
    };

    console.info = (...args) => {
      this.addLog('info', args);
      originalConsole.info.apply(console, args);
    };

    console.warn = (...args) => {
      this.addLog('warn', args);
      originalConsole.warn.apply(console, args);
    };

    console.error = (...args) => {
      this.addLog('error', args);
      originalConsole.error.apply(console, args);
    };

    console.debug = (...args) => {
      this.addLog('debug', args);
      originalConsole.debug.apply(console, args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.addLog('error', [`Unhandled Error: ${event.message}`, `File: ${event.filename}:${event.lineno}:${event.colno}`]);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', [`Unhandled Promise Rejection: ${event.reason}`]);
    });
  }

  /**
   * Add a log entry
   */
  addLog(level, args) {
    const timestamp = new Date();
    const logEntry = {
      id: Date.now() + Math.random(),
      level,
      timestamp,
      message: this.formatLogMessage(args),
      args: args
    };

    this.logs.push(logEntry);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Update UI if visible
    if (this.isVisible) {
      this.renderLogs();
    }

    // Update stats
    this.updateStats();
  }

  /**
   * Format log message from arguments
   */
  formatLogMessage(args) {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  /**
   * Render logs in the panel
   */
  renderLogs() {
    const logsList = document.getElementById('logs-list');
    if (!logsList) return;

    const filteredLogs = this.getFilteredLogs();
    
    logsList.innerHTML = '';
    
    if (filteredLogs.length === 0) {
      logsList.innerHTML = '<div class="no-logs">No logs to display</div>';
      return;
    }

    filteredLogs.forEach(log => {
      const logElement = document.createElement('div');
      logElement.className = `log-entry log-${log.level}`;
      logElement.innerHTML = `
        <div class="log-header">
          <span class="log-time">${this.formatTime(log.timestamp)}</span>
          <span class="log-level">${log.level.toUpperCase()}</span>
        </div>
        <div class="log-message">${this.escapeHtml(log.message)}</div>
      `;
      logsList.appendChild(logElement);
    });

    // Auto-scroll to bottom
    logsList.scrollTop = logsList.scrollHeight;
  }

  /**
   * Get filtered logs based on current level
   */
  getFilteredLogs() {
    if (this.logLevel === 'all') {
      return this.logs;
    }

    const levelPriority = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    const minLevel = levelPriority[this.logLevel] || 1;
    
    return this.logs.filter(log => {
      const logPriority = levelPriority[log.level] || 1;
      return logPriority >= minLevel;
    });
  }

  /**
   * Format timestamp for display
   */
  formatTime(timestamp) {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  }

  /**
   * Escape HTML for safe display
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Set log level filter
   */
  setLogLevel(level) {
    this.logLevel = level;
    if (this.isVisible) {
      this.renderLogs();
    }
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    this.renderLogs();
    this.updateStats();
  }

  /**
   * Export logs to file
   */
  exportLogs() {
    const logsData = {
      exportTime: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs.map(log => ({
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        message: log.message
      }))
    };

    const blob = new Blob([JSON.stringify(logsData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cocode-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.addLog('info', ['Logs exported successfully']);
  }

  /**
   * Update statistics display
   */
  updateStats() {
    const statsEl = document.getElementById('logs-count');
    if (statsEl) {
      const filteredCount = this.getFilteredLogs().length;
      const totalCount = this.logs.length;
      statsEl.textContent = filteredCount === totalCount 
        ? `${totalCount} logs`
        : `${filteredCount}/${totalCount} logs`;
    }
  }

  /**
   * Show the logs panel
   */
  show() {
    const panel = document.getElementById('dev-logs-panel');
    if (panel) {
      panel.classList.remove('hidden');
      this.isVisible = true;
      this.renderLogs();
    }
  }

  /**
   * Hide the logs panel
   */
  hide() {
    const panel = document.getElementById('dev-logs-panel');
    if (panel) {
      panel.classList.add('hidden');
      this.isVisible = false;
    }
  }

  /**
   * Toggle logs panel visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Add custom application log
   */
  logApp(level, message, data = null) {
    const args = data ? [message, data] : [message];
    this.addLog(level, args);
  }

  /**
   * Log user action for telemetry
   */
  logUserAction(action, details = {}) {
    this.addLog('info', [`User Action: ${action}`, details]);
  }

  /**
   * Log performance metric
   */
  logPerformance(metric, value, unit = 'ms') {
    this.addLog('debug', [`Performance: ${metric} = ${value}${unit}`]);
  }

  /**
   * Log Firebase operation
   */
  logFirebase(operation, path, success = true, error = null) {
    const level = success ? 'debug' : 'error';
    const message = success 
      ? `Firebase ${operation}: ${path}`
      : `Firebase ${operation} failed: ${path}`;
    
    const args = error ? [message, error] : [message];
    this.addLog(level, args);
  }
}
