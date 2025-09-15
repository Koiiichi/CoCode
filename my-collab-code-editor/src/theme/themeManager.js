// CoCode Theme Manager
// Handles light/dark theme switching with persistence

export class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme();
    this.init();
  }

  init() {
    // Apply initial theme
    this.applyTheme(this.currentTheme);
    
    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.currentTheme === 'system') {
          this.applyTheme('system');
        }
      });
    }
  }

  getStoredTheme() {
    try {
      const stored = localStorage.getItem('cocode-theme');
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored;
      }
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e);
    }
    return 'dark'; // Default to dark theme
  }

  getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  getEffectiveTheme(theme = this.currentTheme) {
    if (theme === 'system') {
      return this.getSystemTheme();
    }
    return theme;
  }

  applyTheme(theme) {
    const effectiveTheme = this.getEffectiveTheme(theme);
    const html = document.documentElement;
    
    // Remove existing theme classes
    html.removeAttribute('data-theme');
    
    // Apply new theme
    html.setAttribute('data-theme', effectiveTheme);
    
    // Store preference
    try {
      localStorage.setItem('cocode-theme', theme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
    
    this.currentTheme = theme;
    
    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent('themechange', {
      detail: { theme, effectiveTheme }
    }));
  }

  toggle() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    return nextTheme;
  }

  setTheme(theme) {
    if (['light', 'dark', 'system'].includes(theme)) {
      this.applyTheme(theme);
    } else {
      console.warn('Invalid theme:', theme);
    }
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  getEffectiveCurrentTheme() {
    return this.getEffectiveTheme();
  }
}

// Create and export singleton instance
export const themeManager = new ThemeManager();
