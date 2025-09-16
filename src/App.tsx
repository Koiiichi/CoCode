// CoCode Main Application Component

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OnboardingModal } from './components/OnboardingModal';
import { Login } from './app/routes/auth/Login';
import { Signup } from './app/routes/auth/Signup';
import { Home } from './app/routes/home/Home';
import { Editor } from './app/routes/editor/Editor';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { toggleTheme } from './theme/theme';
import { useAuth } from './hooks/useAuth';
import { CoCodeLogo } from './components/CoCodeLogo';

function App() {
  const { user, profile, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user && profile && !profile.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent mx-auto" />
          <p className="text-muted">Loading CoCode...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={user ? <Navigate to="/home" replace /> : <HomePage />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        
        {/* Protected Routes */}
        <Route path="/home" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/editor" element={
          <ProtectedRoute requireOnboarding>
            <Editor />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Onboarding Modal */}
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
    </div>
  );
}


function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Logo and Branding */}
        <div className="space-y-4">
          <CoCodeLogo size="lg" showWordmark className="justify-center" />
          <div>
            <h1 className="text-4xl font-bold text-fg mb-2">Collaborative Code Editor</h1>
            <p className="text-xl text-muted">Build, preview, and share your projects together in real time.</p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-4">
          <p className="text-lg text-muted max-w-lg mx-auto">
            Real-time collaborative coding environment with live editing, 
            synchronized changes, and integrated development tools.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <FeatureCard
            icon="users"
            title="Real-time Collaboration"
            description="Work together with live cursors and synchronized edits"
          />
          <FeatureCard
            icon="message-square"
            title="Inline Comments"
            description="Discuss code with contextual comments and threads"
          />
          <FeatureCard
            icon="play"
            title="Code Execution"
            description="Run and preview your code directly in the browser"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 pt-8">
          <Button variant="primary" size="lg" onClick={() => window.location.href = '/auth/login'}>
            Get Started
          </Button>
          <Button variant="ghost" size="lg" onClick={() => toggleTheme()} icon="sun">
            Toggle Theme
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  description: string;
}) {
  return (
    <div className="glass p-6 rounded-xl text-center space-y-3">
      <div className="w-12 h-12 mx-auto bg-accent/10 rounded-lg flex items-center justify-center">
        <Icon name={icon} size="lg" className="text-accent" />
      </div>
      <h3 className="font-semibold text-fg">{title}</h3>
      <p className="text-sm text-muted">{description}</p>
    </div>
  );
}

export default App;
