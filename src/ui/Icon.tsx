// CoCode Icon System - Lucide React Icons

import { 
  Home, User, Menu, X, Plus, File, Folder, FolderOpen, 
  Upload, Download, Save, Archive, Play, Square, Code, 
  Terminal, MessageSquare, Users, Settings, Wrench, 
  Sun, Moon, Check, AlertCircle, Edit, Trash2,
  ChevronRight, ChevronDown, Search, MoreHorizontal,
  GitBranch, Clock, Eye, EyeOff, Copy, ExternalLink,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface IconProps {
  name: keyof typeof icons;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const icons = {
  // Navigation & UI
  home: Home,
  user: User,
  menu: Menu,
  x: X,
  plus: Plus,
  
  // Files & Folders
  file: File,
  folder: Folder,
  'folder-open': FolderOpen,
  upload: Upload,
  download: Download,
  save: Save,
  archive: Archive,
  
  // Code & Execution
  play: Play,
  stop: Square,
  code: Code,
  terminal: Terminal,
  
  // Collaboration
  'message-square': MessageSquare,
  users: Users,
  
  // Settings & Tools
  settings: Settings,
  wrench: Wrench,
  
  // Theme
  sun: Sun,
  moon: Moon,
  
  // Status
  check: Check,
  'alert-circle': AlertCircle,
  
  // Actions
  edit: Edit,
  trash: Trash2,
  copy: Copy,
  'external-link': ExternalLink,
  
  // Navigation
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  
  // Misc
  search: Search,
  'more-horizontal': MoreHorizontal,
  'git-branch': GitBranch,
  clock: Clock,
  eye: Eye,
  'eye-off': EyeOff,
} as const;

const sizeMap = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

export function Icon({ name, size = 'md', className }: IconProps) {
  const IconComponent = icons[name] as LucideIcon;
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  
  return (
    <IconComponent 
      className={cn(sizeMap[size], className)} 
      strokeWidth={1.5}
    />
  );
}

export { icons };
