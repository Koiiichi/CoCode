// CoCode Top Bar Component

import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { ProfileModal } from '@/components/ProfileModal';
import { SettingsModal } from '@/components/SettingsModal';
import { exportProject, importFiles, downloadBlob } from '@/lib/importExport';
import type { FileItem } from '@/hooks/useFiles';
import { toggleTheme, getTheme } from '@/theme/theme';

interface TopBarProps {
  projectName?: string;
  files?: Record<string, FileItem>;
  onImport?: (files: Record<string, { content: string; type: string }>) => Promise<void>;
}

export function TopBar({ projectName, files, onImport }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTheme, setCurrentTheme] = React.useState(getTheme());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  React.useEffect(() => {
    const handleThemeChange = (e: CustomEvent) => {
      setCurrentTheme(e.detail.theme);
    };

    window.addEventListener('themechange', handleThemeChange as EventListener);
    return () => window.removeEventListener('themechange', handleThemeChange as EventListener);
  }, []);

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const handleHomeClick = () => {
    navigate('/home');
  };

  const handleSettingsClick = () => {
    setShowSettingsModal(true);
  };

  const handleProfileClick = () => {
    setShowProfileModal(true);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onImport) return;

    setIsImporting(true);
    try {
      const result = await importFiles(file);
      
      if (result.success) {
        // Basic validation - check if files exist
        const validation = { valid: Object.keys(result.files).length > 0, errors: [] };
        
        if (validation.valid) {
          await onImport(result.files);
          alert(`Successfully imported ${Object.keys(result.files).length} files!`);
        } else {
          alert(`Import failed:\n${validation.errors.join('\n')}`);
        }
      } else {
        alert(`Import failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      // Reset the input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleExportClick = async () => {
    if (!files || Object.keys(files).length === 0) {
      alert('No files to export!');
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportProject(files, projectName || 'cocode-project');
      
      if (result.success && result.blob) {
        const filename = `${projectName || 'cocode-project'}.zip`;
        downloadBlob(result.blob, filename);
        alert('Project exported successfully!');
      } else {
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Determine current page for breadcrumb
  const getCurrentPageName = () => {
    if (location.pathname.includes('/editor')) return 'Editor';
    if (location.pathname.includes('/home')) return 'Projects';
    return 'CoCode';
  };

  return (
    <div className="h-12 glass border-b border-border flex items-center justify-between px-4 z-50">
      {/* Left: Logo and Branding */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
          <Icon name="code" size="sm" className="text-white" />
        </div>
        <span className="font-semibold text-lg text-fg">CoCode</span>
      </div>

      {/* Center: Breadcrumb Navigation */}
      <div className="flex-1 flex justify-center">
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Button variant="ghost" size="sm" icon="home" onClick={handleHomeClick}>
            Home
          </Button>
          <Icon name="chevron-right" size="sm" />
          <span>{getCurrentPageName()}</span>
        </nav>
      </div>

      {/* Right: Actions and Profile */}
      <div className="flex items-center gap-2">
        {/* Import/Export buttons - only show in editor */}
        {location.pathname.includes('/editor') && (
          <>
            <Button
              variant="ghost"
              size="sm"
              icon="upload"
              onClick={handleImportClick}
              disabled={isImporting}
              title="Import files"
            >
              {isImporting ? 'Importing...' : 'Import'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon="download"
              onClick={handleExportClick}
              disabled={isExporting || !files || Object.keys(files).length === 0}
              title="Export project"
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          icon="settings"
          onClick={handleSettingsClick}
          title="Settings"
        />
        <Button
          variant="ghost"
          size="sm"
          icon="user"
          onClick={handleProfileClick}
          title="Profile"
        />
        <Button
          variant="ghost"
          size="sm"
          icon={currentTheme === 'dark' ? 'sun' : 'moon'}
          onClick={handleThemeToggle}
          title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`}
        />
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.html,.css,.js,.ts,.json,.md,.txt"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />
    </div>
  );
}
