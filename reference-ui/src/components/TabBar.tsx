import React from 'react';
import { XIcon } from 'lucide-react';
interface TabBarProps {
  activeFile: string;
}
const TabBar = ({
  activeFile
}: TabBarProps) => {
  return <div className="flex items-center border-b border-gray-700 bg-[#252526]">
      <div className="flex-1 flex items-center overflow-x-auto">
        <div className="flex items-center px-3 py-2 border-r border-gray-700 bg-[#1e1e1e]">
          <span className="text-xs text-white">{activeFile}</span>
          <button className="ml-2 text-gray-500 hover:text-white">
            <XIcon size={14} />
          </button>
        </div>
        <div className="flex items-center px-3 py-2 border-r border-gray-700">
          <span className="text-xs text-gray-400">bulk-prediction.html</span>
          <button className="ml-2 text-gray-500 hover:text-white">
            <XIcon size={14} />
          </button>
        </div>
        <div className="flex items-center px-3 py-2 border-r border-gray-700">
          <span className="text-xs text-gray-400">newest-model.h5</span>
          <button className="ml-2 text-gray-500 hover:text-white">
            <XIcon size={14} />
          </button>
        </div>
      </div>
    </div>;
};
export default TabBar;