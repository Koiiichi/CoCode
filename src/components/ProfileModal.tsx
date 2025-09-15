// CoCode Profile Modal Component

import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/firebase/auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, profile } = useAuth();

  if (!isOpen) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg/95 backdrop-blur-xl border border-border/50 shadow-2xl p-6 rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-fg">Profile</h2>
          <Button variant="ghost" size="sm" icon="x" onClick={onClose} />
        </div>

        {/* Profile Info */}
        <div className="space-y-4 mb-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <Icon name="user" size="lg" className="text-accent" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-fg">
                {profile?.displayName || user?.displayName || 'Anonymous User'}
              </h3>
              <p className="text-sm text-muted">{user?.email}</p>
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted">Account Type</span>
              <span className="text-sm text-fg">Free</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted">Member Since</span>
              <span className="text-sm text-fg">
                {user?.metadata?.creationTime ? 
                  new Date(user.metadata.creationTime).toLocaleDateString() : 
                  'Unknown'
                }
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted">Last Sign In</span>
              <span className="text-sm text-fg">
                {user?.metadata?.lastSignInTime ? 
                  new Date(user.metadata.lastSignInTime).toLocaleDateString() : 
                  'Unknown'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            variant="secondary" 
            icon="settings" 
            className="w-full justify-start"
            onClick={() => {
              // This will be handled by the Settings modal
              onClose();
            }}
          >
            Account Settings
          </Button>
          
          <Button 
            variant="secondary" 
            icon="message-square" 
            className="w-full justify-start"
            onClick={() => {
              window.open('https://github.com/koiiichi/cocode/issues', '_blank');
            }}
          >
            Help & Support
          </Button>
          
          <Button 
            variant="danger" 
            icon="x" 
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
