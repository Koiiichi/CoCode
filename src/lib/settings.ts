// CoCode Settings Management

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  cursorStyle: 'line' | 'block' | 'underline';
}

export interface AutoSaveSettings {
  mode: 'off' | 'onEdit' | 'onBlur';
  debounceMs: number;
}

export interface PreviewSettings {
  autoRun: boolean;
  position: 'right' | 'bottom';
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  editor: EditorSettings;
  autoSave: AutoSaveSettings;
  preview: PreviewSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    minimap: true,
    cursorStyle: 'line'
  },
  autoSave: {
    mode: 'off',
    debounceMs: 500
  },
  preview: {
    autoRun: false,
    position: 'right'
  }
};

const SETTINGS_KEY = 'cocode-settings';

/**
 * Load settings from localStorage
 */
export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    
    // Dispatch custom event for settings changes
    window.dispatchEvent(new CustomEvent('settingschange', { 
      detail: { settings } 
    }));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Update specific setting
 */
export function updateSetting<K extends keyof AppSettings>(
  key: K, 
  value: AppSettings[K]
): void {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);
}

/**
 * Update nested setting
 */
export function updateNestedSetting<
  K extends keyof AppSettings,
  NK extends keyof AppSettings[K]
>(
  key: K,
  nestedKey: NK,
  value: AppSettings[K][NK]
): void {
  const settings = loadSettings();
  (settings[key] as any)[nestedKey] = value;
  saveSettings(settings);
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): void {
  saveSettings(DEFAULT_SETTINGS);
}

/**
 * Hook for using settings in React components
 */
export function useSettings() {
  // This hook should be implemented in a React component file
  // For now, we'll provide the basic functions for settings management
  return {
    settings: loadSettings(),
    updateSettings: (newSettings: Partial<AppSettings>) => {
      const current = loadSettings();
      const updated = { ...current, ...newSettings };
      saveSettings(updated);
    }
  };
}

