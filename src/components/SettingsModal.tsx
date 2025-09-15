// CoCode Settings Modal Component

import { useState, useEffect } from 'react';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { useSettings } from '@/hooks/useSettings';
import { AppSettings } from '@/lib/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  const handleReset = () => {
    // Reset to default values
    const defaultSettings: AppSettings = {
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
    setLocalSettings(defaultSettings);
  };

  const updateLocalSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedLocalSetting = <
    K extends keyof AppSettings,
    NK extends keyof AppSettings[K]
  >(
    key: K,
    nestedKey: NK,
    value: AppSettings[K][NK]
  ) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: { ...(prev[key] as object), [nestedKey]: value }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg/95 backdrop-blur-xl border border-border/50 shadow-2xl p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-fg">Settings</h2>
          <Button variant="ghost" size="sm" icon="x" onClick={onClose} />
        </div>

        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-fg">Appearance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-fg">Theme</label>
                <select
                  value={localSettings.theme}
                  onChange={(e) => updateLocalSetting('theme', e.target.value as 'dark' | 'light' | 'system')}
                  className="bg-bg-2 border border-border rounded px-3 py-1 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
          </div>

          {/* Editor Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-fg">Editor</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-fg">Font Size</label>
                <input
                  type="number"
                  min="10"
                  max="24"
                  value={localSettings.editor.fontSize}
                  onChange={(e) => updateNestedLocalSetting('editor', 'fontSize', parseInt(e.target.value))}
                  className="bg-bg-2 border border-border rounded px-3 py-1 text-sm text-fg w-20 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-fg">Tab Size</label>
                <select
                  value={localSettings.editor.tabSize}
                  onChange={(e) => updateNestedLocalSetting('editor', 'tabSize', parseInt(e.target.value))}
                  className="bg-bg-2 border border-border rounded px-3 py-1 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                  <option value={8}>8 spaces</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-fg">Word Wrap</label>
                <button
                  onClick={() => updateNestedLocalSetting('editor', 'wordWrap', !localSettings.editor.wordWrap)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    localSettings.editor.wordWrap ? 'bg-accent' : 'bg-bg-3'
                  } relative`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                    localSettings.editor.wordWrap ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-fg">Show Minimap</label>
                <button
                  onClick={() => updateNestedLocalSetting('editor', 'minimap', !localSettings.editor.minimap)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    localSettings.editor.minimap ? 'bg-accent' : 'bg-bg-3'
                  } relative`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                    localSettings.editor.minimap ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-fg">Cursor Style</label>
                <select
                  value={localSettings.editor.cursorStyle}
                  onChange={(e) => updateNestedLocalSetting('editor', 'cursorStyle', e.target.value as 'line' | 'block' | 'underline')}
                  className="bg-bg-2 border border-border rounded px-3 py-1 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="line">Line</option>
                  <option value="block">Block</option>
                  <option value="underline">Underline</option>
                </select>
              </div>
            </div>
          </div>

          {/* Auto-save Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-fg">Auto-save</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-fg">Auto-save Mode</label>
                <select
                  value={localSettings.autoSave.mode}
                  onChange={(e) => updateNestedLocalSetting('autoSave', 'mode', e.target.value as 'off' | 'onEdit' | 'onBlur')}
                  className="bg-bg-2 border border-border rounded px-3 py-1 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="off">Off</option>
                  <option value="onEdit">On Edit (Debounced)</option>
                  <option value="onBlur">On Blur/Tab Switch</option>
                </select>
              </div>

              {localSettings.autoSave.mode === 'onEdit' && (
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-fg">Debounce Delay (ms)</label>
                  <input
                    type="number"
                    min="100"
                    max="5000"
                    step="100"
                    value={localSettings.autoSave.debounceMs}
                    onChange={(e) => updateNestedLocalSetting('autoSave', 'debounceMs', parseInt(e.target.value))}
                    className="bg-bg-2 border border-border rounded px-3 py-1 text-sm text-fg w-20 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Preview Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-fg">Preview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-fg">Auto-run Preview</label>
                <button
                  onClick={() => updateNestedLocalSetting('preview', 'autoRun', !localSettings.preview.autoRun)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    localSettings.preview.autoRun ? 'bg-accent' : 'bg-bg-3'
                  } relative`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                    localSettings.preview.autoRun ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-fg">Preview Position</label>
                <select
                  value={localSettings.preview.position}
                  onChange={(e) => updateNestedLocalSetting('preview', 'position', e.target.value as 'right' | 'bottom')}
                  className="bg-bg-2 border border-border rounded px-3 py-1 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="right">Right</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
          <Button variant="secondary" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
