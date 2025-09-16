// CoCode Application Shell - Replit-inspired Layout

import React from 'react';
import { TopBar } from '@/layout/TopBar';
import { Sidebar } from '@/layout/Sidebar';
import { TabBar } from '@/layout/TabBar';
import type { FileItem } from '@/hooks/useFiles';

export interface AppShellProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showTabBar?: boolean;
  projectName?: string;
  files?: Record<string, FileItem>;
  fileTree?: FileItem[];
  selectedFile?: string | null;
  openTabs?: string[];
  dirtyFiles?: Set<string>;
  onFileSelect?: (filePath: string) => void;
  onTabClose?: (filePath: string) => void;
  onFileCreate?: (path: string, content?: string) => Promise<boolean>;
  onFolderCreate?: (path: string) => Promise<boolean>;
  onFileDelete?: (path: string) => Promise<boolean>;
  onFileRename?: (oldPath: string, newPath: string) => Promise<boolean>;
  onImport?: (files: Record<string, { content: string; type: string }>) => Promise<void>;
  onNavigateToLine?: (filePath: string, lineNumber: number) => Promise<void>;
}

export function AppShell({ 
  children, 
  showSidebar = true, 
  showTabBar = true,
  projectName,
  files,
  fileTree,
  selectedFile,
  openTabs = [],
  dirtyFiles,
  onFileSelect,
  onTabClose,
  onFileCreate,
  onFolderCreate,
  onFileDelete,
  onFileRename,
  onImport,
  onNavigateToLine
}: AppShellProps) {
  return (
    <div className="h-screen flex flex-col bg-bg text-fg overflow-hidden">
      {/* Top Bar - Fixed height */}
      <TopBar 
        projectName={projectName}
        files={files}
        onImport={onImport}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        {showSidebar && (
          <Sidebar 
            projectName={projectName}
            files={files}
            fileTree={fileTree}
            selectedFile={selectedFile}
            onFileSelect={onFileSelect}
            onFileCreate={onFileCreate}
            onFolderCreate={onFolderCreate}
            onFileDelete={onFileDelete}
            onFileRename={onFileRename}
            onNavigateToLine={onNavigateToLine}
          />
        )}
        
        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab Bar */}
          {showTabBar && (
            <TabBar
              tabs={openTabs.map(path => ({
                id: path,
                name: path.split('/').pop() || path,
                path: path,
                language: files?.[path]?.type,
                isActive: selectedFile === path,
                isDirty: dirtyFiles?.has(path)
              }))}
              onTabClick={(tab) => onFileSelect?.(tab.path)}
              onTabClose={(tab) => onTabClose?.(tab.path)}
              onNewTab={() => {
                const fileName = prompt('Enter file name:');
                if (fileName && onFileCreate) {
                  onFileCreate(fileName, '');
                }
              }}
            />
          )}
          
          {/* Main Content */}
          <div className="flex-1 relative min-h-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
