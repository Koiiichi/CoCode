// CoCode Sidebar Component

import React from 'react';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/Button';
import { SearchPanel } from '@/components/SearchPanel';
import { FileTreeItem as FileTreeComponent } from '@/components/FileTreeItem';
import { cn } from '@/lib/utils';
import type { FileItem } from '@/hooks/useFiles';

export interface SidebarProps {
  projectName?: string;
  files?: Record<string, FileItem>;
  fileTree?: FileItem[];
  selectedFile?: string | null;
  onFileSelect?: (filePath: string) => void;
  onFileCreate?: (path: string, content?: string) => Promise<boolean>;
  onFolderCreate?: (path: string) => Promise<boolean>;
  onFileDelete?: (path: string) => Promise<boolean>;
  onFileRename?: (oldPath: string, newPath: string) => Promise<boolean>;
  onNavigateToLine?: (filePath: string, lineNumber: number) => Promise<void>;
}

export function Sidebar({ 
  projectName, 
  files,
  fileTree,
  selectedFile, 
  onFileSelect, 
  onFileCreate, 
  onFolderCreate, 
  onFileDelete, 
  onFileRename,
  onNavigateToLine
}: SidebarProps) {
  const [activeTab, setActiveTab] = React.useState<'files' | 'search' | 'git'>('files');

  return (
    <div className="w-64 bg-bg-1 border-r border-border flex flex-col">
      {/* Sidebar Tabs */}
      <div className="flex border-b border-border">
        <SidebarTab
          id="files"
          icon="folder"
          label="Files"
          active={activeTab === 'files'}
          onClick={() => setActiveTab('files')}
        />
        <SidebarTab
          id="search"
          icon="search"
          label="Search"
          active={activeTab === 'search'}
          onClick={() => setActiveTab('search')}
        />
        <SidebarTab
          id="git"
          icon="git-branch"
          label="Git"
          active={activeTab === 'git'}
          onClick={() => setActiveTab('git')}
        />
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'files' && (
          <FilesPanel 
            projectName={projectName}
            fileTree={fileTree}
            selectedFile={selectedFile}
            onFileSelect={onFileSelect}
            onFileCreate={onFileCreate}
            onFolderCreate={onFolderCreate}
            onFileDelete={onFileDelete}
            onFileRename={onFileRename}
          />
        )}
        {activeTab === 'search' && (
          <SearchPanel 
            files={files || {}}
            onFileSelect={onFileSelect}
            onNavigateToLine={(filePath, lineNumber) => {
              onNavigateToLine?.(filePath, lineNumber);
            }}
          />
        )}
        {activeTab === 'git' && <GitPanel />}
      </div>
    </div>
  );
}

interface SidebarTabProps {
  id: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  active: boolean;
  onClick: () => void;
}

function SidebarTab({ icon, label, active, onClick }: SidebarTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors',
        'hover:bg-bg-2 focus:outline-none focus:bg-bg-2',
        active
          ? 'text-fg bg-bg border-b-2 border-accent'
          : 'text-muted'
      )}
    >
      <Icon name={icon} size="sm" />
      {label}
    </button>
  );
}

function FilesPanel({
  projectName,
  fileTree = [],
  selectedFile,
  onFileSelect,
  onFileCreate,
  onFolderCreate,
  onFileDelete,
  onFileRename
}: {
  projectName?: string;
  fileTree?: FileItem[];
  selectedFile?: string | null;
  onFileSelect?: (filePath: string) => void;
  onFileCreate?: (path: string, content?: string) => Promise<boolean>;
  onFolderCreate?: (path: string) => Promise<boolean>;
  onFileDelete?: (path: string) => Promise<boolean>;
  onFileRename?: (oldPath: string, newPath: string) => Promise<boolean>;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-fg">Explorer</h3>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              icon="plus" 
              title="New file"
              onClick={() => {
                const fileName = prompt('Enter file name:');
                if (fileName && onFileCreate) {
                  onFileCreate(fileName, '');
                }
              }}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              icon="folder" 
              title="New folder"
              onClick={() => {
                const folderName = prompt('Enter folder name:');
                if (folderName && onFolderCreate) {
                  onFolderCreate(folderName);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-auto custom-scrollbar p-2">
        {projectName && (
          <div className="mb-2 text-xs font-medium text-muted uppercase tracking-wide">
            {projectName}
          </div>
        )}
        {fileTree.length === 0 ? (
          <div className="text-sm text-muted text-center py-8">
            No files in this project
          </div>
        ) : (
          <div className="space-y-1">
            {fileTree.map((item) => (
              <FileTreeComponent
                key={item.path}
                item={item}
                level={0}
                isSelected={selectedFile === item.path}
                onSelect={() => onFileSelect?.(item.path)}
                onRename={(oldPath, newPath) => onFileRename?.(oldPath, newPath)}
                onDelete={() => onFileDelete?.(item.path)}
                onCreateFile={(parentPath) => {
                  const fileName = prompt('Enter file name:');
                  if (fileName && onFileCreate) {
                    const fullPath = parentPath ? `${parentPath}/${fileName}` : fileName;
                    onFileCreate(fullPath, '');
                  }
                }}
                onCreateFolder={(parentPath) => {
                  const folderName = prompt('Enter folder name:');
                  if (folderName && onFolderCreate) {
                    const fullPath = parentPath ? `${parentPath}/${folderName}` : folderName;
                    onFolderCreate(fullPath);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function GitPanel() {
  return (
    <div className="h-full flex flex-col p-3">
      <h3 className="text-sm font-medium text-fg mb-3">Source Control</h3>
      <div className="flex-1 flex items-center justify-center text-muted">
        <div className="text-center">
          <Icon name="git-branch" size="lg" className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No repository found</p>
        </div>
      </div>
    </div>
  );
}
