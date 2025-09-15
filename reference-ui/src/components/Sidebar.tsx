import React, { useState } from 'react';
import { FolderIcon, FileIcon, ChevronDownIcon, ChevronRightIcon, EyeIcon, SearchIcon, HistoryIcon, PackageIcon, SettingsIcon, GitBranchIcon } from 'lucide-react';
interface SidebarProps {
  activeFile: string;
  setActiveFile: (file: string) => void;
}
const Sidebar = ({
  activeFile,
  setActiveFile
}: SidebarProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'app.py': true,
    'game-addiction-classification-project': true
  });
  const toggleFolder = (folder: string) => {
    setExpandedFolders({
      ...expandedFolders,
      [folder]: !expandedFolders[folder]
    });
  };
  return <div className="w-64 border-r border-gray-700 flex flex-col bg-[#252526]">
      <div className="p-2 flex items-center justify-between border-b border-gray-700">
        <EyeIcon size={18} className="text-gray-400" />
        <span className="text-xs text-gray-400">EXPLORER</span>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-1">
          <div className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer rounded">
            <button className="flex items-center w-full text-left" onClick={() => toggleFolder('app.py')}>
              {expandedFolders['app.py'] ? <ChevronDownIcon size={16} className="text-gray-400 mr-1" /> : <ChevronRightIcon size={16} className="text-gray-400 mr-1" />}
              <span className="text-sm text-gray-300">+ Add new folder</span>
            </button>
          </div>
          <div className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer rounded">
            <button className="flex items-center w-full text-left" onClick={() => toggleFolder('game-addiction-classification-project')}>
              {expandedFolders['game-addiction-classification-project'] ? <ChevronDownIcon size={16} className="text-gray-400 mr-1" /> : <ChevronRightIcon size={16} className="text-gray-400 mr-1" />}
              <FolderIcon size={16} className="text-gray-400 mr-1" />
              <span className="text-sm text-gray-300">
                game-addiction-classification-project
              </span>
            </button>
          </div>
          {expandedFolders['game-addiction-classification-project'] && <div className="ml-4">
              <div className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer rounded">
                <FileIcon size={16} className="text-gray-400 mr-1" />
                <span className={`text-sm ${activeFile === 'game-addiction-classification.py' ? 'text-white' : 'text-gray-300'}`} onClick={() => setActiveFile('game-addiction-classification.py')}>
                  game-addiction-classification.py
                </span>
              </div>
              <div className="ml-2">
                <div className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer rounded">
                  <FolderIcon size={16} className="text-gray-400 mr-1" />
                  <span className="text-sm text-gray-300">datasets</span>
                </div>
                <div className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer rounded">
                  <FolderIcon size={16} className="text-gray-400 mr-1" />
                  <span className="text-sm text-gray-300">models</span>
                </div>
                <div className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer rounded">
                  <FileIcon size={16} className="text-gray-400 mr-1" />
                  <span className="text-sm text-gray-300">newest-model.h5</span>
                </div>
                <div className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer rounded">
                  <FileIcon size={16} className="text-gray-400 mr-1" />
                  <span className="text-sm text-gray-300">train.h5</span>
                </div>
              </div>
              <div className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer rounded">
                <FolderIcon size={16} className="text-gray-400 mr-1" />
                <span className="text-sm text-gray-300">static</span>
              </div>
              <div className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer rounded">
                <FolderIcon size={16} className="text-gray-400 mr-1" />
                <span className="text-sm text-gray-300">templates</span>
              </div>
              <div className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer rounded">
                <FolderIcon size={16} className="text-gray-400 mr-1" />
                <span className="text-sm text-gray-300">uploads</span>
              </div>
              <div className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer rounded">
                <FolderIcon size={16} className="text-gray-400 mr-1" />
                <span className="text-sm text-gray-300">app.py</span>
              </div>
              <div className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer rounded">
                <FileIcon size={16} className="text-gray-400 mr-1" />
                <span className="text-sm text-gray-300">
                  bulk-prediction.html
                </span>
              </div>
              <div className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer rounded">
                <FileIcon size={16} className="text-gray-400 mr-1" />
                <span className="text-sm text-gray-300">index.html</span>
              </div>
            </div>}
        </div>
      </div>
      <div className="mt-auto border-t border-gray-700">
        <div className="p-2 flex flex-col gap-2">
          <button className="flex items-center py-1 px-2 hover:bg-gray-700 rounded">
            <SearchIcon size={18} className="text-gray-400 mr-2" />
            <span className="text-sm text-gray-300">Search</span>
          </button>
          <button className="flex items-center py-1 px-2 hover:bg-gray-700 rounded">
            <HistoryIcon size={18} className="text-gray-400 mr-2" />
            <span className="text-sm text-gray-300">Timeline</span>
          </button>
          <button className="flex items-center py-1 px-2 hover:bg-gray-700 rounded">
            <PackageIcon size={18} className="text-gray-400 mr-2" />
            <span className="text-sm text-gray-300">Extensions</span>
          </button>
          <button className="flex items-center py-1 px-2 hover:bg-gray-700 rounded">
            <SettingsIcon size={18} className="text-gray-400 mr-2" />
            <span className="text-sm text-gray-300">Settings</span>
          </button>
        </div>
      </div>
    </div>;
};
export default Sidebar;