// CoCode Import/Export Utilities

import JSZip from 'jszip';
import type { FileItem } from '@/hooks/useFiles';

export interface ImportResult {
  success: boolean;
  files: Record<string, { content: string; type: string }>;
  error?: string;
}

export interface ExportResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}

/**
 * Import files from a ZIP archive or individual files
 */
export async function importFiles(file: File): Promise<ImportResult> {
  try {
    const files: Record<string, { content: string; type: string }> = {};

    if (file.name.endsWith('.zip')) {
      // Handle ZIP file
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      for (const [path, zipEntry] of Object.entries(zipContent.files)) {
        if (!zipEntry.dir && !path.startsWith('__MACOSX/') && !path.startsWith('.DS_Store')) {
          const content = await zipEntry.async('text');
          const fileType = getFileType(path);
          
          // Clean up the path (remove leading slashes, normalize)
          const cleanPath = path.replace(/^\/+/, '');
          
          files[cleanPath] = {
            content,
            type: fileType
          };
        }
      }
    } else {
      // Handle individual file
      const content = await file.text();
      const fileType = getFileType(file.name);
      
      files[file.name] = {
        content,
        type: fileType
      };
    }

    return {
      success: true,
      files
    };
  } catch (error) {
    return {
      success: false,
      files: {},
      error: error instanceof Error ? error.message : 'Failed to import files'
    };
  }
}

/**
 * Export project files as a ZIP archive
 */
export async function exportProject(
  files: Record<string, FileItem>,
  projectName: string = 'cocode-project'
): Promise<ExportResult> {
  try {
    const zip = new JSZip();

    // Add all files to the ZIP
    for (const [path, file] of Object.entries(files)) {
      if (file.content !== undefined) {
        zip.file(path, file.content);
      }
    }

    // Add a README if it doesn't exist
    if (!files['README.md']) {
      const readme = `# ${projectName}

This project was created with CoCode - A collaborative code editor.

## Files

${Object.keys(files).map(path => `- ${path}`).join('\n')}

## Getting Started

Open the HTML files in your browser to see the project in action.
`;
      zip.file('README.md', readme);
    }

    // Generate the ZIP blob
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });

    return {
      success: true,
      blob
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export project'
    };
  }
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get file type based on extension
 */
function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'js':
    case 'mjs':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'txt':
      return 'text';
    case 'xml':
      return 'xml';
    case 'svg':
      return 'svg';
    default:
      return 'text';
  }
}

/**
 * Validate imported files
 */
export function validateImportedFiles(files: Record<string, { content: string; type: string }>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const maxFileSize = 1024 * 1024; // 1MB per file
  const maxTotalFiles = 100;

  // Check file count
  if (Object.keys(files).length > maxTotalFiles) {
    errors.push(`Too many files. Maximum ${maxTotalFiles} files allowed.`);
  }

  // Check individual files
  for (const [path, file] of Object.entries(files)) {
    // Check file size
    if (file.content.length > maxFileSize) {
      errors.push(`File ${path} is too large. Maximum size is 1MB.`);
    }

    // Check for dangerous file types
    const ext = path.split('.').pop()?.toLowerCase();
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'com', 'scr', 'vbs', 'jar'];
    if (ext && dangerousExtensions.includes(ext)) {
      errors.push(`File type .${ext} is not allowed for security reasons.`);
    }

    // Check for valid UTF-8 content
    try {
      // Try to encode/decode to check for valid UTF-8
      new TextEncoder().encode(file.content);
    } catch {
      errors.push(`File ${path} contains invalid characters.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
