// CoCode File Tree Item Component

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { cn } from '@/lib/utils';
import { getFileIcon } from '@/lib/encoding';
import type { FileItem } from '@/hooks/useFiles';

type CreateType = 'file' | 'folder';

type MaybePromise<T> = T | Promise<T>;

interface FileTreeItemProps {
  item: FileItem;
  level: number;
  selectedPath?: string | null;
  onSelect?: (item: FileItem) => void;
  onRename?: (oldPath: string, newPath: string) => MaybePromise<boolean | void>;
  onDelete?: (path: string) => MaybePromise<boolean | void>;
  onCreateFile?: (path: string, content?: string) => MaybePromise<boolean | void>;
  onCreateFolder?: (path: string) => MaybePromise<boolean | void>;
}

export function FileTreeItem({
  item,
  level,
  selectedPath,
  onSelect,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
}: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(item.isFolder ? level === 0 : false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [hovered, setHovered] = useState(false);
  const [createType, setCreateType] = useState<CreateType | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [isSubmittingCreation, setIsSubmittingCreation] = useState(false);

  const editInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const isSelected = selectedPath === item.path;
  const hasChildren = useMemo(
    () => Boolean(item.isFolder && item.children && item.children.length > 0),
    [item.isFolder, item.children]
  );

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (createType) {
      setTimeout(() => createInputRef.current?.focus(), 0);
    }
  }, [createType]);

  const toggleOpen = () => {
    if (item.isFolder) {
      setIsOpen(prev => !prev);
    }
  };

  const handleSelect = () => {
    if (item.isFolder) {
      toggleOpen();
    } else {
      onSelect?.(item);
    }
  };

  const handleStartRename = () => {
    setEditName(item.name);
    setIsEditing(true);
  };

  const handleCancelRename = () => {
    setIsEditing(false);
    setEditName(item.name);
  };

  const handleRename = async () => {
    const nextName = editName.trim();
    if (!nextName || nextName === item.name) {
      handleCancelRename();
      return;
    }

    const pathParts = item.path.split('/');
    pathParts[pathParts.length - 1] = nextName;
    const newPath = pathParts.join('/');

    if (onRename) {
      const result = await onRename(item.path, newPath);
      if (result === false) {
        return;
      }
    }

    setIsEditing(false);
  };

  const handleRenameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleRename();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelRename();
    }
  };

  const handleDelete = async () => {
    await onDelete?.(item.path);
  };

  const beginCreate = (type: CreateType) => {
    if (!item.isFolder) return;
    if (!isOpen) setIsOpen(true);
    setCreateType(type);
    setNewItemName('');
  };

  const cancelCreate = () => {
    setCreateType(null);
    setNewItemName('');
    setIsSubmittingCreation(false);
  };

  const commitCreate = async () => {
    if (!createType || isSubmittingCreation) return;

    const trimmedName = newItemName.trim();
    if (!trimmedName) {
      cancelCreate();
      return;
    }

    setIsSubmittingCreation(true);
    try {
      const fullPath = `${item.path}/${trimmedName}`;
      let success = true;

      if (createType === 'file') {
        const result = await onCreateFile?.(fullPath, '');
        success = result !== false;
      } else {
        const result = await onCreateFolder?.(fullPath);
        success = result !== false;
      }

      if (success) {
        cancelCreate();
      } else {
        setIsSubmittingCreation(false);
      }
    } catch (error) {
      console.error('Failed to create item', error);
      setIsSubmittingCreation(false);
    }
  };

  const handleCreateKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commitCreate();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelCreate();
    }
  };

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-2 px-2 py-1 text-sm rounded transition-colors',
          'cursor-pointer select-none',
          item.isFolder ? 'text-muted hover:text-fg' : 'hover:text-fg',
          isSelected && 'bg-accent/10 text-accent'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {item.isFolder && (
          <button
            onClick={toggleOpen}
            className="flex items-center justify-center w-4 h-4 rounded hover:bg-bg-1 transition-colors"
            aria-label={isOpen ? 'Collapse folder' : 'Expand folder'}
          >
            <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size="xs" />
          </button>
        )}

        <Icon
          name={getFileIcon(item.name, item.isFolder)}
          size="sm"
          className={cn(
            item.isFolder
              ? isOpen
                ? 'text-accent'
                : 'text-muted'
              : 'text-muted'
          )}
        />

        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            onBlur={() => void handleRename()}
            onKeyDown={handleRenameKeyDown}
            className="flex-1 px-1 py-0 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        ) : (
          <span className="flex-1 truncate" onClick={handleSelect}>
            {item.name}
          </span>
        )}

        {hovered && !isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.isFolder && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="plus"
                  className="w-6 h-6 p-0"
                  title="New file"
                  onClick={() => beginCreate('file')}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon="folder"
                  className="w-6 h-6 p-0"
                  title="New folder"
                  onClick={() => beginCreate('folder')}
                />
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon="edit"
              className="w-6 h-6 p-0"
              title="Rename"
              onClick={handleStartRename}
            />
            <Button
              variant="ghost"
              size="sm"
              icon="trash"
              className="w-6 h-6 p-0 text-danger hover:text-danger"
              title="Delete"
              onClick={() => void handleDelete()}
            />
          </div>
        )}
      </div>

      {createType && (
        <div
          className="flex items-center gap-2 px-2 py-1 text-sm"
          style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}
        >
          <Icon
            name={createType === 'file' ? getFileIcon('file.txt', false) : getFileIcon('folder', true)}
            size="sm"
            className="text-muted"
          />
          <input
            ref={createInputRef}
            type="text"
            value={newItemName}
            onChange={(event) => setNewItemName(event.target.value)}
            onBlur={() => void commitCreate()}
            onKeyDown={handleCreateKeyDown}
            disabled={isSubmittingCreation}
            placeholder={createType === 'file' ? 'New file name' : 'New folder name'}
            className="flex-1 px-1 py-0 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      )}

      {item.isFolder && isOpen && hasChildren && (
        <div>
          {item.children!.map((child) => (
            <FileTreeItem
              key={child.path}
              item={child}
              level={level + 1}
              selectedPath={selectedPath}
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
