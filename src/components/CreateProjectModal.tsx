// CoCode Create Project Modal

import React, { useState } from 'react';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { cn } from '@/lib/utils';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (name: string, description?: string) => Promise<void>;
}

export function CreateProjectModal({ isOpen, onClose, onCreateProject }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onCreateProject(formData.name.trim(), formData.description.trim() || undefined);
      setFormData({ name: '', description: '' });
      onClose();
    } catch (err) {
      setError('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ name: '', description: '' });
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-md glass rounded-xl p-6 animate-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Icon name="plus" size="sm" className="text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-fg">Create New Project</h2>
              <p className="text-sm text-muted">Start a new collaborative coding project</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon="x" onClick={handleClose} disabled={loading} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
              <Icon name="alert-circle" size="sm" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-fg mb-2">
              Project Name *
            </label>
            <input
              id="projectName"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              className={cn(
                'w-full px-3 py-2 bg-bg border border-border rounded-lg text-fg',
                'placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
                'transition-colors duration-200'
              )}
              placeholder="My Awesome Project"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="projectDescription" className="block text-sm font-medium text-fg mb-2">
              Description
            </label>
            <textarea
              id="projectDescription"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className={cn(
                'w-full px-3 py-2 bg-bg border border-border rounded-lg text-fg resize-none',
                'placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
                'transition-colors duration-200'
              )}
              placeholder="What are you building? (optional)"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              loading={loading}
              disabled={loading || !formData.name.trim()}
            >
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
