// CoCode Tab Bar Component

import React from 'react';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  name: string;
  path: string;
  language?: string;
  isDirty?: boolean;
  isActive?: boolean;
}

export interface TabBarProps {
  tabs?: Tab[];
  onTabClick?: (tab: Tab) => void;
  onTabClose?: (tab: Tab) => void;
  onNewTab?: () => void;
}

export function TabBar({ tabs = [], onTabClick, onTabClose, onNewTab }: TabBarProps) {
  return (
    <div className="h-10 bg-bg-1 border-b border-border flex items-center overflow-x-auto custom-scrollbar">
      {/* File Tabs */}
      <div className="flex items-center min-w-0">
        {tabs.map((tab) => (
          <FileTab
            key={tab.id}
            tab={tab}
            onClick={() => onTabClick?.(tab)}
            onClose={() => onTabClose?.(tab)}
          />
        ))}
      </div>

      {/* Tab Actions */}
      <div className="flex items-center gap-1 px-2 ml-auto">
        <Button
          variant="ghost"
          size="sm"
          icon="plus"
          onClick={onNewTab}
          className="text-muted hover:text-fg"
          title="New file"
        />
      </div>
    </div>
  );
}

interface FileTabProps {
  tab: Tab;
  onClick: () => void;
  onClose: () => void;
}

function FileTab({ tab, onClick, onClose }: FileTabProps) {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 border-r border-border cursor-pointer group',
        'hover:bg-bg-2 transition-colors min-w-0 max-w-48',
        tab.isActive
          ? 'bg-bg text-fg border-b-2 border-accent'
          : 'bg-bg-1 text-muted hover:text-fg'
      )}
      onClick={onClick}
    >
      {/* File Icon */}
      <Icon name="file" size="sm" className="flex-shrink-0" />
      
      {/* File Name */}
      <span className="text-sm font-medium truncate">
        {tab.name}
        {tab.isDirty && '*'}
      </span>
      
      {/* Close Button */}
      <button
        onClick={handleClose}
        className={cn(
          'flex-shrink-0 w-4 h-4 rounded hover:bg-bg-2 flex items-center justify-center',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          tab.isActive && 'opacity-100'
        )}
      >
        <Icon name="x" size="xs" />
      </button>
    </div>
  );
}
