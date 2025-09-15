// React hook for settings management
import { useState, useEffect, useCallback } from 'react';
import { AppSettings, loadSettings, saveSettings } from '@/lib/settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    const handleSettingsChange = (e: CustomEvent) => {
      setSettings(e.detail.settings);
    };

    window.addEventListener('settingschange', handleSettingsChange as EventListener);
    return () => window.removeEventListener('settingschange', handleSettingsChange as EventListener);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    const current = loadSettings();
    const updated = { ...current, ...newSettings };
    saveSettings(updated);
  }, []);

  return { settings, updateSettings };
}
