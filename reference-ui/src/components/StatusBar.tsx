import React from 'react';
import { GitBranchIcon } from 'lucide-react';
const StatusBar = () => {
  return <div className="flex items-center justify-between px-3 py-1 border-t border-gray-700 bg-[#007acc] text-white text-xs">
      <div className="flex items-center space-x-3">
        <div className="flex items-center">
          <GitBranchIcon size={14} className="mr-1" />
          <span>git:main</span>
        </div>
        <span>•</span>
        <span>Python</span>
      </div>
      <div className="flex items-center space-x-3">
        <span>Ln 24, Col 15</span>
        <span>UTF-8</span>
      </div>
    </div>;
};
export default StatusBar;