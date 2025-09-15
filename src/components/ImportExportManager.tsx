// CoCode Import/Export Manager Component

import React, { useRef } from 'react';
import { Button } from '@/ui/Button';
import { sanitizeFilename, inferLanguageFromExtension } from '@/lib/encoding';
import JSZip from 'jszip';

interface ImportExportManagerProps {
  onImportFiles: (files: Array<{ path: string; content: string; type: string }>) => Promise<void>;
  onExportProject: (projectName: string) => Promise<void>;
  files: Record<string, { content: string; type: string }>;
  projectName?: string;
}

export function ImportExportManager({ 
  onImportFiles, 
  onExportProject, 
  files, 
  projectName = 'CoCode Project' 
}: ImportExportManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const importedFiles: Array<{ path: string; content: string; type: string }> = [];

    for (const file of Array.from(selectedFiles)) {
      try {
        const content = await readFileContent(file);
        const path = sanitizeFilename(file.name);
        const type = inferLanguageFromExtension(file.name);
        
        importedFiles.push({ path, content, type });
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
      }
    }

    if (importedFiles.length > 0) {
      await onImportFiles(importedFiles);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportProject = async () => {
    try {
      const zip = new JSZip();
      
      // Add all files to zip
      Object.entries(files).forEach(([path, fileData]) => {
        zip.file(path, fileData.content);
      });

      // Generate zip file
      const blob = await zip.generateAsync({ type: 'blob' });
      
      // Download zip file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sanitizeFilename(projectName)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await onExportProject(projectName);
    } catch (error) {
      console.error('Error exporting project:', error);
      alert('Failed to export project. Please try again later.');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".js,.jsx,.ts,.tsx,.html,.css,.json,.md,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.sh,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Import Button */}
      <Button
        variant="ghost"
        size="sm"
        icon="upload"
        onClick={handleImportClick}
        title="Import files"
      >
        Import
      </Button>

      {/* Export Project Button */}
      <Button
        variant="ghost"
        size="sm"
        icon="download"
        onClick={handleExportProject}
        title="Export project as ZIP"
        disabled={Object.keys(files).length === 0}
      >
        Export
      </Button>
    </div>
  );
}

// Helper function to read file content
function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}
