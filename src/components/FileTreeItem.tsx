// CoCode File Tree Item Component

import { useState } from 'react';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { cn } from '@/lib/utils';
import { getFileIcon } from '@/lib/encoding';
import type { FileItem } from '@/hooks/useFiles';

interface FileTreeItemProps {
  item: FileItem;
  level: number;
  isSelected?: boolean;
  onSelect?: (item: FileItem) => void;
  onRename?: (oldPath: string, newPath: string) => void;
  onDelete?: (path: string) => void;
  onCreateFile?: (parentPath: string) => void;
  onCreateFolder?: (parentPath: string) => void;
}

export function FileTreeItem({
  item,
  level,
  isSelected = false,
  onSelect,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
}: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(level === 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [showActions, setShowActions] = useState(false);

  const hasChildren = item.isFolder && item.children && item.children.length > 0;
  const canToggle = item.isFolder;

  const handleToggle = () => {
    if (canToggle) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = () => {
    if (!item.isFolder) {
      onSelect?.(item);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditName(item.name);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(item.name);
  };

  const handleSaveEdit = () => {
    if (editName.trim() && editName !== item.name) {
      const pathParts = item.path.split('/');
      pathParts[pathParts.length - 1] = editName.trim();
      const newPath = pathParts.join('/');
      onRename?.(item.path, newPath);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${item.isFolder ? 'folder' : 'file'} "${item.name}"?`)) {
      onDelete?.(item.path);
    }
  };

  const handleCreateFile = () => {
    const fileName = prompt('Enter file name:');
    if (fileName?.trim()) {
      const filePath = item.isFolder ? `${item.path}/${fileName.trim()}` : fileName.trim();
      onCreateFile?.(filePath);
    }
  };

  const handleCreateFolder = () => {
    const folderName = prompt('Enter folder name:');
    if (folderName?.trim()) {
      const folderPath = item.isFolder ? `${item.path}/${folderName.trim()}` : folderName.trim();
      onCreateFolder?.(folderPath);
    }
  };

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-bg-2 transition-colors',
          'cursor-pointer select-none',
          isSelected && 'bg-accent/10 text-accent',
          !item.isFolder && 'hover:text-fg',
          item.isFolder && 'text-muted hover:text-fg'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Toggle Icon */}
        {canToggle && (
          <button
            onClick={handleToggle}
            className="flex items-center justify-center w-4 h-4 hover:bg-bg-1 rounded transition-colors"
          >
            <Icon 
              name={isOpen ? 'chevron-down' : 'chevron-right'} 
              size="xs" 
            />
          </button>
        )}
        
        {/* File/Folder Icon */}
        <Icon 
          name={getFileIcon(item.name, item.isFolder)} 
          size="sm" 
          className={cn(
            item.isFolder 
              ? (isOpen ? 'text-accent' : 'text-muted')
              : 'text-muted'
          )}
        />

        {/* Name */}
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            className="flex-1 px-1 py-0 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            autoFocus
          />
        ) : (
          <span 
            className="flex-1 truncate"
            onClick={item.isFolder ? handleToggle : handleSelect}
          >
            {item.name}
          </span>
        )}

        {/* Actions */}
        {showActions && !isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.isFolder && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="plus"
                  onClick={handleCreateFile}
                  className="w-6 h-6 p-0"
                  title="New file"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon="folder"
                  onClick={handleCreateFolder}
                  className="w-6 h-6 p-0"
                  title="New folder"
                />
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon="edit"
              onClick={handleStartEdit}
              className="w-6 h-6 p-0"
              title="Rename"
            />
            <Button
              variant="ghost"
              size="sm"
              icon="trash"
              onClick={handleDelete}
              className="w-6 h-6 p-0 text-danger hover:text-danger"
              title="Delete"
            />
          </div>
        )}
      </div>

      {/* Children */}
      {canToggle && isOpen && hasChildren && (
        <div>
          {item.children!.map((child) => (
            <FileTreeItem
              key={child.path}
              item={child}
              level={level + 1}
              isSelected={isSelected}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
