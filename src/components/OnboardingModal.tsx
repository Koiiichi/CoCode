// CoCode Onboarding Modal

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { updateUserProfile } from '@/firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: '',
    useCase: '',
  });
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isOpen && user?.displayName) {
      setFormData(prev => ({ ...prev, displayName: user.displayName || '' }));
    }
  }, [isOpen, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.displayName.trim()) {
        alert('Please enter your display name');
        return;
      }
      if (!formData.useCase) {
        alert('Please select how you\'ll use CoCode');
        return;
      }
      setStep(2);
    }
  };

  const handleFinish = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: formData.displayName,
        onboardingCompleted: true,
      });
      
      onClose();
      navigate('/home');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
    navigate('/home');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleSkip} />
      
      {/* Modal */}
      <div className="relative w-full max-w-md glass rounded-xl p-6 animate-in">
        {step === 1 && (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Icon name="user" size="lg" className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-fg mb-2">Welcome to CoCode!</h2>
              <p className="text-muted">Let's get you set up for collaborative coding</p>
            </div>

            {/* Form */}
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-fg mb-2">
                  Display Name
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className={cn(
                    'w-full px-3 py-2 bg-bg border border-border rounded-lg text-fg',
                    'placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'
                  )}
                  placeholder="How should others see you?"
                />
              </div>

              <div>
                <label htmlFor="useCase" className="block text-sm font-medium text-fg mb-2">
                  How will you use CoCode?
                </label>
                <select
                  id="useCase"
                  name="useCase"
                  value={formData.useCase}
                  onChange={handleInputChange}
                  className={cn(
                    'w-full px-3 py-2 bg-bg border border-border rounded-lg text-fg',
                    'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'
                  )}
                >
                  <option value="">Select your primary use case</option>
                  <option value="work">Work & Professional Projects</option>
                  <option value="personal">Personal & Side Projects</option>
                  <option value="school">School & Learning</option>
                  <option value="team">Team Collaboration</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleSkip}>
                Skip for now
              </Button>
              <Button variant="primary" onClick={handleNext}>
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {/* Success */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-success rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Icon name="check" size="lg" className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-fg mb-2">You're all set!</h2>
              <p className="text-muted mb-6">Your profile has been created. Ready to start coding?</p>

              {/* Features */}
              <div className="space-y-3 mb-6">
                <FeatureItem icon="users" text="Real-time collaboration" />
                <FeatureItem icon="message-square" text="Inline comments" />
                <FeatureItem icon="play" text="Code execution" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleFinish}
                loading={loading}
                disabled={loading}
              >
                Start Coding
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: {
  icon: React.ComponentProps<typeof Icon>['name'];
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-bg-1 rounded-lg">
      <Icon name={icon} size="sm" className="text-accent" />
      <span className="text-sm text-fg">{text}</span>
    </div>
  );
}
