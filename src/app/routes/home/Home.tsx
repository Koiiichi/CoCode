// CoCode Home Page - Projects Dashboard

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { AppShell } from '@/layout/AppShell';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { formatDate } from '@/lib/utils';

export function Home() {
  const { user, profile } = useAuth();
  const { projects, loading, createNewProject } = useProjects();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleCreateProject = async (name: string, description?: string) => {
    try {
      const projectId = await createNewProject(name, description);
      if (projectId) {
        setNotification({type: 'success', message: `Project "${name}" created successfully!`});
        setShowCreateModal(false);
        // Auto-hide notification after 3 seconds
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({type: 'error', message: 'Failed to create project. Please try again.'});
      }
    } catch (error) {
      setNotification({type: 'error', message: 'Failed to create project. Please try again.'});
    }
  };

  const handlePlaceholderAction = (feature: string) => {
    setNotification({
      type: 'error', 
      message: `${feature} will be implemented in a future PR. Currently available: Create Project, File System, Monaco Editor.`
    });
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <AppShell showSidebar={false} showTabBar={false}>
      <div className="h-full overflow-auto custom-scrollbar">
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            <div className="flex items-center gap-2">
              <Icon name={notification.type === 'success' ? 'check' : 'x'} size="sm" />
              <span>{notification.message}</span>
              <button 
                onClick={() => setNotification(null)}
                className="ml-2 hover:opacity-70"
              >
                <Icon name="x" size="sm" />
              </button>
            </div>
          </div>
        )}
        
        <div className="max-w-6xl mx-auto p-6 space-y-8">
          {/* Welcome Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-fg mb-2">
                Welcome back, {profile?.displayName || user?.displayName || 'Developer'}!
              </h1>
              <p className="text-muted">Continue working on your projects or start something new.</p>
            </div>
            <Button variant="primary" icon="plus" onClick={() => setShowCreateModal(true)}>
              New Project
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div onClick={() => setShowCreateModal(true)}>
              <QuickActionCard
                icon="plus"
                title="Create Project"
                description="Start a new collaborative coding project"
                action="Create"
              />
            </div>
            <div onClick={() => handlePlaceholderAction('Import Files')}>
              <QuickActionCard
                icon="upload"
                title="Import Files"
                description="Upload existing code to collaborate on"
                action="Import"
              />
            </div>
            <div onClick={() => handlePlaceholderAction('Join Project')}>
              <QuickActionCard
                icon="users"
                title="Join Project"
                description="Collaborate on a shared project"
                action="Join"
              />
            </div>
          </div>

          {/* Recent Projects */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-fg">Recent Projects</h2>
              <Button variant="ghost" size="sm" icon="external-link" onClick={() => handlePlaceholderAction('View All Projects')}>
                View All
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
              </div>
            ) : projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    id={project.id}
                    name={project.name}
                    description={project.description || 'No description'}
                    lastModified={formatDate(project.updatedAt)}
                    language="typescript"
                    collaborators={1}
                  />
                ))}
              </div>
            ) : (
              <div className="glass p-8 rounded-xl text-center">
                <Icon name="folder" size="lg" className="mx-auto mb-3 text-muted" />
                <h3 className="font-medium text-fg mb-2">No projects yet</h3>
                <p className="text-muted text-sm mb-4">
                  Create your first project to start coding collaboratively.
                </p>
                <Button variant="primary" icon="plus" onClick={() => setShowCreateModal(true)}>
                  Create Project
                </Button>
              </div>
            )}
          </div>

          {/* Shared Projects */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-fg">Shared with Me</h2>
            <div className="glass p-6 rounded-xl text-center">
              <Icon name="users" size="lg" className="mx-auto mb-3 text-muted" />
              <h3 className="font-medium text-fg mb-2">No shared projects yet</h3>
              <p className="text-muted text-sm mb-4">
                When others share projects with you, they'll appear here.
              </p>
              <Button variant="secondary" size="sm">
                Learn about collaboration
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateProject={handleCreateProject}
      />
    </AppShell>
  );
}

function QuickActionCard({ icon, title, description, action }: {
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  description: string;
  action: string;
}) {
  return (
    <div className="glass p-4 rounded-xl hover:bg-bg-2 transition-colors cursor-pointer group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center group-hover:bg-accent/20 transition-colors">
          <Icon name={icon} size="sm" className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-fg mb-1">{title}</h3>
          <p className="text-sm text-muted mb-3">{description}</p>
          <Button variant="ghost" size="sm" className="text-accent hover:text-accent-weak">
            {action}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ id, name, description, lastModified, language, collaborators }: {
  id: string;
  name: string;
  description: string;
  lastModified: string;
  language: string;
  collaborators: number;
}) {
  const { deleteProjectData } = useProjects();
  const [showActions, setShowActions] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleDeleteProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      const success = await deleteProjectData(id);
      if (success) {
        setNotification({type: 'success', message: `Project "${name}" deleted successfully`});
      } else {
        setNotification({type: 'error', message: 'Failed to delete project'});
      }
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleExportProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNotification({type: 'error', message: 'Export functionality will be implemented in a future update'});
    setTimeout(() => setNotification(null), 3000);
  };
  const getLanguageIcon = (lang: string) => {
    switch (lang) {
      case 'typescript': return 'code';
      case 'javascript': return 'code';
      case 'html': return 'file';
      default: return 'file';
    }
  };

  const getLanguageColor = (lang: string) => {
    switch (lang) {
      case 'typescript': return 'text-blue-400';
      case 'javascript': return 'text-yellow-400';
      case 'html': return 'text-orange-400';
      default: return 'text-muted';
    }
  };

  return (
    <div className="relative">
      {/* Project Card Notification */}
      {notification && (
        <div className={`absolute top-2 right-2 z-50 p-2 rounded-lg shadow-lg text-sm ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center gap-1">
            <Icon name={notification.type === 'success' ? 'check' : 'x'} size="xs" />
            <span>{notification.message}</span>
          </div>
        </div>
      )}
      
      <Link to={`/editor?project=${id}`} className="block">
        <div 
          className="glass p-4 rounded-xl hover:bg-bg-2 transition-colors group relative"
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon name={getLanguageIcon(language)} size="sm" className={getLanguageColor(language)} />
              <h3 className="font-medium text-fg group-hover:text-accent transition-colors">{name}</h3>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" icon="external-link" className="opacity-0 group-hover:opacity-100 transition-opacity" />
              {showActions && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    icon="download" 
                    onClick={handleExportProject}
                    className="text-muted hover:text-fg"
                    title="Export project"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    icon="trash" 
                    onClick={handleDeleteProject}
                    className="text-muted hover:text-red-400"
                    title="Delete project"
                  />
                </div>
              )}
            </div>
          </div>
          
          <p className="text-sm text-muted mb-4 line-clamp-2">{description}</p>
          
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Updated {lastModified}</span>
            <div className="flex items-center gap-1">
              <Icon name="users" size="xs" />
              <span>{collaborators}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
