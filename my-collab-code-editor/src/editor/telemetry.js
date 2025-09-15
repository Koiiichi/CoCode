/**
 * Telemetry Manager - Collects usage analytics and performance metrics
 */

export class TelemetryManager {
  constructor() {
    this.isEnabled = true;
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.events = [];
    this.metrics = new Map();
    this.setupPerformanceObserver();
    this.setupEventTracking();
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup performance observer for web vitals
   */
  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // Track Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('lcp', entry.startTime);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Track First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('fid', entry.processingStart - entry.startTime);
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Track Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.recordMetric('cls', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  /**
   * Setup automatic event tracking
   */
  setupEventTracking() {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackEvent('page_visibility', {
        hidden: document.hidden,
        timestamp: Date.now()
      });
    });

    // Track window focus/blur
    window.addEventListener('focus', () => {
      this.trackEvent('window_focus', { timestamp: Date.now() });
    });

    window.addEventListener('blur', () => {
      this.trackEvent('window_blur', { timestamp: Date.now() });
    });

    // Track errors
    window.addEventListener('error', (event) => {
      this.trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      });
    });
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName, properties = {}) {
    if (!this.isEnabled) return;

    const event = {
      id: this.generateEventId(),
      sessionId: this.sessionId,
      name: eventName,
      timestamp: Date.now(),
      properties: {
        ...properties,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionDuration: Date.now() - this.startTime
      }
    };

    this.events.push(event);
    
    // Log to dev logs if available
    if (window.devLogs) {
      window.devLogs.logApp('debug', `Telemetry: ${eventName}`, properties);
    }

    // Trim events if too many
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name, value, unit = 'ms') {
    if (!this.isEnabled) return;

    const metric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.metrics.set(name, metric);

    // Log to dev logs if available
    if (window.devLogs) {
      window.devLogs.logPerformance(name, value, unit);
    }
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track user interaction with specific feature
   */
  trackFeatureUsage(feature, action, metadata = {}) {
    this.trackEvent('feature_usage', {
      feature,
      action,
      ...metadata
    });
  }

  /**
   * Track editor operations
   */
  trackEditorOperation(operation, details = {}) {
    this.trackEvent('editor_operation', {
      operation,
      ...details
    });
  }

  /**
   * Track file operations
   */
  trackFileOperation(operation, fileName, success = true, error = null) {
    this.trackEvent('file_operation', {
      operation,
      fileName,
      success,
      error: error?.message,
      fileExtension: fileName?.split('.').pop()
    });
  }

  /**
   * Track collaboration events
   */
  trackCollaboration(event, details = {}) {
    this.trackEvent('collaboration', {
      event,
      ...details
    });
  }

  /**
   * Track performance timing
   */
  trackTiming(name, startTime, endTime = Date.now()) {
    const duration = endTime - startTime;
    this.recordMetric(`timing_${name}`, duration);
    
    this.trackEvent('performance_timing', {
      name,
      duration,
      startTime,
      endTime
    });
  }

  /**
   * Start timing an operation
   */
  startTiming(name) {
    const startTime = Date.now();
    return {
      end: () => this.trackTiming(name, startTime)
    };
  }

  /**
   * Track user session information
   */
  trackSession(userId, projectId) {
    this.trackEvent('session_start', {
      userId,
      projectId,
      sessionId: this.sessionId,
      startTime: this.startTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    });
  }

  /**
   * Track project statistics
   */
  trackProjectStats(projectId, stats) {
    this.trackEvent('project_stats', {
      projectId,
      ...stats
    });
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    const now = Date.now();
    const duration = now - this.startTime;
    
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      duration,
      eventCount: this.events.length,
      metrics: Array.from(this.metrics.values()),
      lastActivity: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : this.startTime
    };
  }

  /**
   * Export telemetry data
   */
  exportData() {
    return {
      sessionSummary: this.getSessionSummary(),
      events: this.events,
      metrics: Array.from(this.metrics.entries()),
      exportTime: Date.now()
    };
  }

  /**
   * Clear all telemetry data
   */
  clearData() {
    this.events = [];
    this.metrics.clear();
  }

  /**
   * Enable/disable telemetry
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.trackEvent('telemetry_enabled');
    } else {
      this.trackEvent('telemetry_disabled');
    }
  }

  /**
   * Get feature usage statistics
   */
  getFeatureUsageStats() {
    const featureEvents = this.events.filter(e => e.name === 'feature_usage');
    const stats = {};

    featureEvents.forEach(event => {
      const feature = event.properties.feature;
      const action = event.properties.action;
      
      if (!stats[feature]) {
        stats[feature] = {};
      }
      
      if (!stats[feature][action]) {
        stats[feature][action] = 0;
      }
      
      stats[feature][action]++;
    });

    return stats;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const performanceMetrics = {};
    
    this.metrics.forEach((metric, name) => {
      performanceMetrics[name] = {
        value: metric.value,
        unit: metric.unit,
        timestamp: metric.timestamp
      };
    });

    return performanceMetrics;
  }

  /**
   * Track error with context
   */
  trackError(error, context = {}) {
    this.trackEvent('application_error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context
    });
  }

  /**
   * Track user feedback
   */
  trackFeedback(type, rating, comment = '') {
    this.trackEvent('user_feedback', {
      type,
      rating,
      comment,
      sessionDuration: Date.now() - this.startTime
    });
  }
}
