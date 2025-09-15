// File import/export functionality
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { encodeFirebaseKey } from "../firebase/paths.js";

export class ImportExportManager {
  constructor(currentUser, currentProjectId) {
    this.currentUser = currentUser;
    this.currentProjectId = currentProjectId;
    this.db = getDatabase();
    
    // Supported file types for import
    this.supportedTypes = [
      '.txt', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.less',
      '.json', '.md', '.xml', '.svg', '.c', '.cpp', '.h', '.hpp', '.py', '.java',
      '.php', '.rb', '.go', '.rs', '.sh', '.bat', '.yml', '.yaml', '.toml'
    ];
  }

  // Import single or multiple files
  async importFiles() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = this.supportedTypes.join(',');
      
      input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length === 0) {
          resolve([]);
          return;
        }

        try {
          const importedFiles = [];
          const maxFileSize = 1024 * 1024; // 1MB limit per file
          
          for (const file of files) {
            if (file.size > maxFileSize) {
              console.warn(`File ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Skipping.`);
              continue;
            }

            const content = await this.readFileContent(file);
            const fileName = this.sanitizeFileName(file.name);
            const fileType = this.inferLanguageFromExtension(fileName);
            
            // Save to Firebase
            const encodedFileName = encodeFirebaseKey(fileName);
            const fileRef = ref(this.db, `users/${this.currentUser.uid}/projects/${this.currentProjectId}/files/${encodedFileName}`);
            
            await set(fileRef, {
              content: content,
              type: fileType,
              imported: true,
              importedAt: new Date().toISOString()
            });

            importedFiles.push({
              name: fileName,
              size: file.size,
              type: fileType
            });
          }
          
          resolve(importedFiles);
        } catch (error) {
          reject(error);
        }
      };

      input.click();
    });
  }

  // Read file content as text
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      
      reader.readAsText(file);
    });
  }

  // Export single file
  exportFile(fileName, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  // Export entire project as ZIP
  async exportProject(projectData, projectName = 'project') {
    // Dynamically import JSZip
    const JSZip = await this.loadJSZip();
    
    const zip = new JSZip();
    const files = projectData.files || {};
    
    // Add each file to the zip
    Object.entries(files).forEach(([encodedFileName, fileData]) => {
      const fileName = decodeURIComponent(encodedFileName);
      const content = fileData.content || '';
      zip.file(fileName, content);
    });
    
    // Add a README with project info
    const readme = this.generateProjectReadme(projectName, Object.keys(files).length);
    zip.file('README.md', readme);
    
    // Generate and download the zip
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.sanitizeFileName(projectName)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  // Load JSZip library dynamically
  async loadJSZip() {
    if (window.JSZip) {
      return window.JSZip;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => {
        resolve(window.JSZip);
      };
      script.onerror = () => {
        reject(new Error('Failed to load JSZip library'));
      };
      document.head.appendChild(script);
    });
  }

  // Generate project README
  generateProjectReadme(projectName, fileCount) {
    return `# ${projectName}

This project was exported from CoCode - A Collaborative Code Editor.

## Project Info
- **Files**: ${fileCount}
- **Exported**: ${new Date().toLocaleString()}
- **Platform**: CoCode (https://cocode.dev)

## Getting Started
This project contains the source files from your CoCode workspace. You can:
1. Import these files into any code editor
2. Set up your preferred development environment
3. Continue development locally or re-import to CoCode

## File Structure
All files maintain their original names and content from your CoCode project.

---
*Generated by CoCode - Collaborative Code Editor*
`;
  }

  // Sanitize filename for safe download
  sanitizeFileName(fileName) {
    return fileName.replace(/[^a-zA-Z0-9.-_]/g, '_');
  }

  // Infer language from file extension
  inferLanguageFromExtension(fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'md': 'markdown',
      'xml': 'xml',
      'svg': 'xml',
      'c': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'py': 'python',
      'java': 'java',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'sh': 'shell',
      'bat': 'bat',
      'yml': 'yaml',
      'yaml': 'yaml',
      'toml': 'toml'
    };
    
    return languageMap[ext] || 'plaintext';
  }

  // Show import progress
  showImportProgress(files) {
    const notification = document.createElement('div');
    notification.className = 'import-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <h4>Import Complete!</h4>
        <p>Successfully imported ${files.length} file(s):</p>
        <ul>
          ${files.map(file => `<li>${file.name} (${(file.size / 1024).toFixed(1)}KB)</li>`).join('')}
        </ul>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  // Show export progress
  showExportProgress(type, fileName) {
    const notification = document.createElement('div');
    notification.className = 'export-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <h4>Export Complete!</h4>
        <p>${type === 'file' ? `File "${fileName}" downloaded` : `Project exported as "${fileName}"`}</p>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}
