// CoCode Files Hook

import { useState, useEffect } from 'react';
import { 
  getProjectFiles, 
  saveFile, 
  deleteFile,
  renameFile as renameFileInDB
} from '@/firebase/rtdb';
import { useAuth } from './useAuth';
import { decodeFirebaseKey, inferLanguageFromExtension } from '@/lib/encoding';

export interface FileItem {
  path: string;
  name: string;
  content: string;
  type: string;
  version?: number;
  updatedAt: number;
  updatedBy: string;
  isFolder?: boolean;
  children?: FileItem[];
}

export interface UseFilesReturn {
  files: Record<string, FileItem>;
  fileTree: FileItem[];
  loading: boolean;
  error: string | null;
  saveFileContent: (path: string, content: string, type?: string) => Promise<boolean>;
  createFile: (path: string, content?: string) => Promise<boolean>;
  createFolder: (path: string) => Promise<boolean>;
  deleteFileOrFolder: (path: string) => Promise<boolean>;
  renameFile: (oldPath: string, newPath: string) => Promise<boolean>;
  refreshFiles: () => Promise<void>;
}

export function useFiles(projectId: string | null): UseFilesReturn {
  const [files, setFiles] = useState<Record<string, FileItem>>({});
  const [fileTree, setFileTree] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadFiles = async () => {
    if (!user || !projectId) {
      setFiles({});
      setFileTree([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const projectFiles = await getProjectFiles(user.uid, projectId);
      const fileItems: Record<string, FileItem> = {};
      
      // Convert Firebase data to FileItem format
      Object.entries(projectFiles).forEach(([encodedPath, fileData]) => {
        const path = decodeFirebaseKey(encodedPath);
        const name = path.split('/').pop() || path;
        
        fileItems[path] = {
          path,
          name,
          content: fileData.content,
          type: fileData.type,
          version: fileData.version,
          updatedAt: fileData.updatedAt,
          updatedBy: fileData.updatedBy,
        };
      });
      
      setFiles(fileItems);
      setFileTree(buildFileTree(fileItems));
    } catch (err) {
      setError('Failed to load files');
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [user, projectId]);

  const saveFileContent = async (path: string, content: string, type?: string): Promise<boolean> => {
    if (!user || !projectId) return false;

    try {
      setError(null);
      const fileType = type || inferLanguageFromExtension(path);
      
      await saveFile(user.uid, projectId, path, content, fileType);
      
      // Update local state
      setFiles(prevFiles => ({
        ...prevFiles,
        [path]: {
          ...prevFiles[path],
          content,
          type: fileType,
          version: Date.now(),
          updatedAt: Date.now(),
          updatedBy: user.uid,
        }
      }));
      
      return true;
    } catch (err) {
      setError('Failed to save file');
      console.error('Error saving file:', err);
      return false;
    }
  };

  const createFile = async (path: string, content = ''): Promise<boolean> => {
    if (!user || !projectId) return false;

    try {
      setError(null);
      const type = inferLanguageFromExtension(path);
      const name = path.split('/').pop() || path;
      
      await saveFile(user.uid, projectId, path, content, type);
      
      // Update local state
      const newFile: FileItem = {
        path,
        name,
        content,
        type,
        version: Date.now(),
        updatedAt: Date.now(),
        updatedBy: user.uid,
      };
      
      setFiles(prevFiles => {
        const updated = { ...prevFiles, [path]: newFile };
        setFileTree(buildFileTree(updated));
        return updated;
      });
      
      return true;
    } catch (err) {
      setError('Failed to create file');
      console.error('Error creating file:', err);
      return false;
    }
  };

  const createFolder = async (path: string): Promise<boolean> => {
    // Folders are implicit in Firebase - create a placeholder file
    const placeholderPath = `${path}/.gitkeep`;
    return await createFile(placeholderPath, '');
  };

  const deleteFileOrFolder = async (path: string): Promise<boolean> => {
    if (!user || !projectId) return false;

    try {
      setError(null);
      
      // If it's a folder, delete all files within it
      const filesToDelete = Object.keys(files).filter(filePath => 
        filePath === path || filePath.startsWith(path + '/')
      );
      
      for (const filePath of filesToDelete) {
        await deleteFile(user.uid, projectId, filePath);
      }

      // Update local state
      setFiles(prevFiles => {
        const updated = { ...prevFiles };
        filesToDelete.forEach(filePath => {
          delete updated[filePath];
        });
        setFileTree(buildFileTree(updated));
        return updated;
      });
      
      return true;
    } catch (err) {
      setError('Failed to delete file/folder');
      console.error('Error deleting file/folder:', err);
      return false;
    }
  };

  const renameFile = async (oldPath: string, newPath: string): Promise<boolean> => {
    if (!user || !projectId || !files[oldPath]) return false;

    try {
      setError(null);
      const fileData = files[oldPath];
      
      // Use atomic rename operation in Firebase
      await renameFileInDB(user.uid, projectId, oldPath, newPath);
      
      // Update Monaco Editor model if it exists
      if (typeof window !== 'undefined' && (window as any).monaco) {
        const monaco = (window as any).monaco;
        const models = monaco.editor.getModels();
        const model = models.find((m: any) => m.uri.path === `/${oldPath}`);
        
        if (model) {
          // Update language based on new extension
          const newLanguage = inferLanguageFromExtension(newPath);
          monaco.editor.setModelLanguage(model, newLanguage);
          
          // Note: Monaco doesn't allow direct URI modification, so we'll handle this in the editor component
        }
      }
      
      // Update local state
      setFiles(prevFiles => {
        const updated = { ...prevFiles };
        delete updated[oldPath];
        updated[newPath] = {
          ...fileData,
          path: newPath,
          name: newPath.split('/').pop() || newPath,
          type: inferLanguageFromExtension(newPath),
          updatedAt: Date.now(),
        };
        setFileTree(buildFileTree(updated));
        return updated;
      });
      
      return true;
    } catch (err) {
      setError('Failed to rename file');
      console.error('Error renaming file:', err);
      return false;
    }
  };

  const refreshFiles = async () => {
    await loadFiles();
  };

  return {
    files,
    fileTree,
    loading,
    error,
    saveFileContent,
    createFile,
    createFolder,
    deleteFileOrFolder,
    renameFile,
    refreshFiles,
  };
}

// Helper function to build file tree structure
function buildFileTree(files: Record<string, FileItem>): FileItem[] {
  const tree: FileItem[] = [];
  const folders: Record<string, FileItem> = {};

  // Sort files by path
  const sortedPaths = Object.keys(files).sort();

  sortedPaths.forEach(path => {
    const parts = path.split('/');
    const file = files[path];
    const isPlaceholder = file.name === '.gitkeep';

    if (parts.length === 1) {
      // Root level file
      if (!isPlaceholder) {
        tree.push(file);
      }
    } else {
      // Nested file - create folder structure
      let currentLevel = tree;
      let currentPath = '';
      
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        
        let folder = currentLevel.find(item => item.path === currentPath && item.isFolder);
        
        if (!folder) {
          folder = {
            path: currentPath,
            name: parts[i],
            content: '',
            type: 'folder',
            updatedAt: Date.now(),
            updatedBy: '',
            isFolder: true,
            children: [],
          };
          currentLevel.push(folder);
          folders[currentPath] = folder;
        }
        
        currentLevel = folder.children!;
      }
      
      // Add the file to the final folder
      if (!isPlaceholder) {
        currentLevel.push(file);
      }
    }
  });

  return tree;
}
