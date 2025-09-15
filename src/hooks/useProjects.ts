// CoCode Projects Hook

import { useState, useEffect } from 'react';
import { 
  createProject, 
  getUserProjects, 
  updateProject, 
  deleteProject, 
  type ProjectData 
} from '@/firebase/rtdb';
import { useAuth } from './useAuth';

export interface UseProjectsReturn {
  projects: ProjectData[];
  loading: boolean;
  error: string | null;
  createNewProject: (name: string, description?: string) => Promise<string | null>;
  updateProjectData: (projectId: string, updates: Partial<ProjectData>) => Promise<boolean>;
  deleteProjectData: (projectId: string) => Promise<boolean>;
  refreshProjects: () => Promise<void>;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadProjects = async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userProjects = await getUserProjects(user.uid);
      setProjects(userProjects);
    } catch (err) {
      setError('Failed to load projects');
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  const createNewProject = async (name: string, description?: string): Promise<string | null> => {
    if (!user) return null;

    try {
      setError(null);
      const projectData: any = {
        name: name.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      // Only add description if it's not empty
      if (description && description.trim()) {
        projectData.description = description.trim();
      }
      
      const projectId = await createProject(user.uid, projectData);
      
      // Refresh projects list
      await loadProjects();
      return projectId;
    } catch (err) {
      setError('Failed to create project');
      console.error('Error creating project:', err);
      return null;
    }
  };

  const updateProjectData = async (projectId: string, updates: Partial<ProjectData>): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);
      await updateProject(user.uid, projectId, updates);
      
      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, ...updates, updatedAt: Date.now() } : p
      ));
      
      return true;
    } catch (err) {
      setError('Failed to update project');
      console.error('Error updating project:', err);
      return false;
    }
  };

  const deleteProjectData = async (projectId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);
      await deleteProject(user.uid, projectId);
      
      // Remove from local state
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      return true;
    } catch (err) {
      setError('Failed to delete project');
      console.error('Error deleting project:', err);
      return false;
    }
  };

  const refreshProjects = async () => {
    await loadProjects();
  };

  return {
    projects,
    loading,
    error,
    createNewProject,
    updateProjectData,
    deleteProjectData,
    refreshProjects,
  };
}
