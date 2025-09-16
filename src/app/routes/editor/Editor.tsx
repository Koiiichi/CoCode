// CoCode Editor Page - Main coding interface with file tree and editor

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppShell } from '@/layout/AppShell';
import { useProjects } from '@/hooks/useProjects';
import { useFiles, type FileItem } from '@/hooks/useFiles';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { MonacoEditor } from '@/components/MonacoEditor';
import { PreviewRunner } from '@/components/PreviewRunner';
import { Console } from '@/components/Console';

export function Editor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { projects, loading: projectsLoading } = useProjects();
  
  const projectId = searchParams.get('project');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileBuffers, setFileBuffers] = useState<Record<string, string>>({});
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [consoleMessages, setConsoleMessages] = useState<Array<{type: 'log' | 'error' | 'warn' | 'info', content: string, timestamp: number}>>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [autoRun, setAutoRun] = useState(false);
  const [navigateTarget, setNavigateTarget] = useState<{ line: number; token: number } | null>(null);
  
  const { settings } = useSettings();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<Record<string, number>>({});
  
  const {
    files,
    fileTree,
    loading: filesLoading,
    saveFileContent,
    createFile,
    createFolder,
    deleteFileOrFolder,
    renameFile
  } = useFiles(projectId || '');

  // Find current project
  const currentProject = projects.find(p => p.id === projectId);

  const findFileInTree = (items: FileItem[], targetPath: string): FileItem | null => {
    for (const item of items) {
      if (item.path === targetPath) {
        return item;
      }
      if (item.isFolder && item.children) {
        const found = findFileInTree(item.children, targetPath);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  useEffect(() => {
    if (!projectId) {
      navigate('/home');
      return;
    }
  }, [projectId, navigate]);

  // Initialize file buffers when files are loaded
  useEffect(() => {
    setFileBuffers(prev => {
      const updated = { ...prev };
      let changed = false;
      Object.entries(files).forEach(([path, file]) => {
        if (!(path in updated)) {
          updated[path] = file.content || '';
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [files]);

  // Get current file content from buffer or files
  const getCurrentFileContent = useCallback((filePath: string) => {
    return fileBuffers[filePath] ?? files[filePath]?.content ?? '';
  }, [fileBuffers, files]);

  // Auto-save functionality
  const performAutoSave = useCallback(async (filePath: string, content: string) => {
    if (projectId && settings.autoSave.mode !== 'off') {
      try {
        await saveFileContent(filePath, content);
        setDirtyFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(filePath);
          return newSet;
        });
        lastSaveRef.current[filePath] = Date.now();
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  }, [projectId, settings.autoSave.mode, saveFileContent]);

  // Debounced auto-save
  const scheduleAutoSave = useCallback((filePath: string, content: string) => {
    if (settings.autoSave.mode === 'onEdit') {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        performAutoSave(filePath, content);
      }, settings.autoSave.debounceMs);
    }
  }, [settings.autoSave.mode, settings.autoSave.debounceMs, performAutoSave]);


  const handleFileSave = async (filePath?: string) => {
    const targetFile = filePath || selectedFile;
    if (targetFile && projectId) {
      const content = getCurrentFileContent(targetFile);
      await saveFileContent(targetFile, content);
      setDirtyFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetFile);
        return newSet;
      });
      lastSaveRef.current[targetFile] = Date.now();
    }
  };

  const handleFileContentChange = (content: string) => {
    if (!selectedFile) return;
    
    // Update buffer
    setFileBuffers(prev => ({ ...prev, [selectedFile]: content }));
    
    // Mark as dirty
    setDirtyFiles(prev => new Set([...prev, selectedFile]));
    
    // Schedule auto-save if enabled
    scheduleAutoSave(selectedFile, content);
  };

  const handleConsoleMessage = (message: {type: 'log' | 'error' | 'warn' | 'info', content: string, timestamp: number}) => {
    setConsoleMessages(prev => [...prev, message]);
  };

  const clearConsole = () => {
    setConsoleMessages([]);
  };

  // Handle file selection and tab management
  const handleFileSelect = useCallback(async (filePath: string) => {
    if (selectedFile && settings.autoSave.mode === 'onBlur' && dirtyFiles.has(selectedFile)) {
      await handleFileSave(selectedFile);
    }

    setSelectedFile(filePath);
    setNavigateTarget(null);

    setOpenTabs(prev => (prev.includes(filePath) ? prev : [...prev, filePath]));

    setFileBuffers(prev => {
      if (prev[filePath] || !files[filePath]) {
        return prev;
      }
      return { ...prev, [filePath]: files[filePath].content || '' };
    });
  }, [selectedFile, settings.autoSave.mode, dirtyFiles, handleFileSave, files]);

  // Handle navigation to specific line in file
  const handleNavigateToLine = async (filePath: string, lineNumber: number) => {
    await handleFileSelect(filePath);
    setNavigateTarget({ line: lineNumber, token: Date.now() });
  };

  const handleFileCreate = useCallback(async (path: string, content = '') => {
    const success = await createFile(path, content);
    if (success) {
      setFileBuffers(prev => ({ ...prev, [path]: content }));
      await handleFileSelect(path);
    }
    return success;
  }, [createFile, handleFileSelect]);

  // Handle file rename - update tabs and selected file
  const handleFileRename = async (oldPath: string, newPath: string) => {
    const success = await renameFile(oldPath, newPath);
    if (success) {
      // Update open tabs
      setOpenTabs(prev => prev.map(tab => tab === oldPath ? newPath : tab));

      // Update selected file if it was the renamed file
      if (selectedFile === oldPath) {
        setSelectedFile(newPath);
      }

      // Preserve buffer content
      setFileBuffers(prev => {
        if (!(oldPath in prev)) return prev;
        const { [oldPath]: buffer, ...rest } = prev;
        return { ...rest, [newPath]: buffer };
      });

      setDirtyFiles(prev => {
        if (!prev.has(oldPath)) return prev;
        const updated = new Set(prev);
        updated.delete(oldPath);
        updated.add(newPath);
        return updated;
      });
    }
    return success;
  };

  // Handle file deletion - close tab and update selection
  const handleFileDelete = async (filePath: string) => {
    const item = findFileInTree(fileTree, filePath);
    const isFolder = item?.isFolder ?? false;
    const affectedPaths = Object.keys(files).filter(path => path === filePath || path.startsWith(`${filePath}/`));
    const visibleAffectedPaths = affectedPaths.filter(path => !path.endsWith('/.gitkeep'));

    let confirmMessage = `Delete ${isFolder ? 'folder' : 'file'} "${item?.name || filePath}"?`;

    if (isFolder) {
      const nestedCount = visibleAffectedPaths.length;
      const hasContent = visibleAffectedPaths.some(path => {
        const file = files[path];
        if (!file) return false;
        const content = getCurrentFileContent(path);
        return content.trim().length > 0;
      });

      if (nestedCount > 0) {
        confirmMessage = `Delete folder "${item?.name || filePath}" and its ${nestedCount} item${nestedCount === 1 ? '' : 's'}?`;
        if (hasContent) {
          confirmMessage += ' This will remove files with unsaved changes.';
        }
      }
    } else {
      const content = getCurrentFileContent(filePath);
      if (content.trim().length > 0) {
        confirmMessage = `File "${item?.name || filePath}" has content. Delete it anyway?`;
      }
    }

    if (!window.confirm(confirmMessage)) {
      return false;
    }

    const success = await deleteFileOrFolder(filePath);
    if (success) {
      setFileBuffers(prev => {
        const updated = { ...prev };
        affectedPaths.forEach(path => {
          delete updated[path];
        });
        return updated;
      });

      setDirtyFiles(prev => {
        const updated = new Set(prev);
        affectedPaths.forEach(path => updated.delete(path));
        return updated;
      });

      setOpenTabs(prev => {
        const updated = prev.filter(tab => !affectedPaths.includes(tab));
        if (selectedFile && affectedPaths.includes(selectedFile)) {
          setSelectedFile(updated.length > 0 ? updated[updated.length - 1] : null);
        }
        return updated;
      });
    }
    return success;
  };

  // Close tab
  const handleTabClose = async (filePath: string) => {
    // Auto-save if dirty and auto-save is enabled
    if (dirtyFiles.has(filePath) && settings.autoSave.mode !== 'off') {
      await handleFileSave(filePath);
    }
    
    setOpenTabs(prev => prev.filter(tab => tab !== filePath));
    
    if (selectedFile === filePath) {
      const remainingTabs = openTabs.filter(tab => tab !== filePath);
      setSelectedFile(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1] : null);
    }
    
    // Clean up buffer
    setFileBuffers(prev => {
      const newBuffers = { ...prev };
      delete newBuffers[filePath];
      return newBuffers;
    });
    
    // Remove from dirty files
    setDirtyFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(filePath);
      return newSet;
    });
  };

  // Handle file import
  const handleImport = async (importedFiles: Record<string, { content: string; type: string }>) => {
    try {
      for (const [path, file] of Object.entries(importedFiles)) {
        await handleFileCreate(path, file.content);
      }
    } catch (error) {
      console.error('Failed to import files:', error);
      throw error;
    }
  };

  // Check if project has previewable files for preview
  const hasPreviewableFiles = Object.keys(files).some(path => /\.(html|css|js)$/i.test(path));

  // Only show preview when previewable files exist
  useEffect(() => {
    if (hasPreviewableFiles && !showPreview) {
      setShowPreview(true);
    } else if (!hasPreviewableFiles && showPreview) {
      setShowPreview(false);
    }
  }, [hasPreviewableFiles, showPreview]);

  if (!projectId) {
    return null;
  }

  if (projectsLoading || filesLoading) {
    return (
      <AppShell>
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (!currentProject) {
    return (
      <AppShell>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Icon name="alert-circle" size="lg" className="mx-auto mb-3 text-muted" />
            <h3 className="font-medium text-fg mb-2">Project not found</h3>
            <p className="text-muted text-sm mb-4">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button variant="primary" onClick={() => navigate('/home')}>
              Back to Home
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      projectName={currentProject?.name}
      files={files}
      fileTree={fileTree}
      selectedFile={selectedFile}
      openTabs={openTabs}
      dirtyFiles={dirtyFiles}
      onFileSelect={handleFileSelect}
      onTabClose={handleTabClose}
      onFileCreate={handleFileCreate}
      onFolderCreate={createFolder}
      onFileDelete={handleFileDelete}
      onFileRename={handleFileRename}
      onImport={handleImport}
      onNavigateToLine={handleNavigateToLine}
    >
      <div className="h-full flex flex-col">
        {/* Editor Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            {selectedFile ? (
              <>
                <Icon name="file" size="sm" className="text-muted" />
                <span className="text-sm font-medium text-fg">{selectedFile}</span>
                {selectedFile && dirtyFiles.has(selectedFile) && (
                  <div className="w-2 h-2 bg-accent rounded-full" title="Unsaved changes" />
                )}
              </>
            ) : (
              <span className="text-sm text-muted">No file selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              icon="save"
              onClick={() => handleFileSave()}
              disabled={!selectedFile || !dirtyFiles.has(selectedFile)}
            >
              Save
            </Button>
            {hasPreviewableFiles && (
              <Button
                variant="ghost"
                size="sm"
                icon={showPreview ? "eye-off" : "eye"}
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            )}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex min-h-0">
          {/* Editor */}
          <div className={`flex flex-col transition-all duration-200 ${showPreview ? 'flex-1' : 'w-full'}`}>
            {selectedFile ? (
              <MonacoEditor
                value={getCurrentFileContent(selectedFile)}
                onChange={handleFileContentChange}
                filename={selectedFile}
                onSave={() => handleFileSave(selectedFile)}
                navigateTarget={navigateTarget}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <div className="max-w-md">
                  <Icon name="file" size="lg" className="mx-auto mb-4 text-muted opacity-50" />
                  <h3 className="text-lg font-medium text-fg mb-2">No file selected</h3>
                  <p className="text-muted mb-6">
                    Select a file from the sidebar to start editing, or create a new file to get started.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      variant="primary"
                      icon="plus"
                      onClick={() => handleFileCreate('index.html', '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Project</title>\n</head>\n<body>\n  <h1>Hello World!</h1>\n</body>\n</html>')}
                    >
                      Create HTML File
                    </Button>
                    <Button
                      variant="secondary"
                      icon="file"
                      onClick={() => handleFileCreate('script.js', '// JavaScript code\nconsole.log("Hello, World!");')}
                    >
                      Create JS File
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className={`border-l border-border transition-all duration-200 ${
            showPreview ? 'w-1/2 opacity-100' : 'w-0 opacity-0 overflow-hidden'
          }`}>
            {showPreview && (
              <PreviewRunner
                files={Object.fromEntries(
                  Object.entries(fileBuffers).map(([path, content]) => [
                    path,
                    { content, type: files[path]?.type || 'text/plain' }
                  ])
                )}
                onConsoleMessage={handleConsoleMessage}
                autoRun={autoRun}
                onAutoRunChange={setAutoRun}
              />
            )}
          </div>
        </div>

        {/* Console */}
        <Console 
          messages={consoleMessages}
          onClear={clearConsole}
        />
      </div>
    </AppShell>
  );
}
