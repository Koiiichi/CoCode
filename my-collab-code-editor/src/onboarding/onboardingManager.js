// CoCode First-Run Onboarding Manager
// Provides a friendly welcome experience for new users

export class OnboardingManager {
  constructor(db, auth) {
    this.db = db;
    this.auth = auth;
    this.currentUser = null;
    this.onboardingModal = null;
    this.init();
  }

  init() {
    this.createOnboardingModal();
    this.bindEvents();
  }

  createOnboardingModal() {
    // Create modal HTML structure
    const modalHTML = `
      <div id="onboarding-modal" class="onboarding-modal hidden">
        <div class="modal-backdrop"></div>
        <div class="onboarding-content glass">
          <div class="onboarding-header">
            <div class="welcome-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h2>Welcome to CoCode!</h2>
            <p>Let's get you set up for collaborative coding</p>
          </div>
          
          <div class="onboarding-body">
            <div class="onboarding-step" id="step-1">
              <h3>Tell us about yourself</h3>
              <div class="form-group">
                <label for="display-name">Display Name</label>
                <input type="text" id="display-name" placeholder="How should others see you?" />
              </div>
              
              <div class="form-group">
                <label for="use-case">How will you use CoCode?</label>
                <select id="use-case">
                  <option value="">Select your primary use case</option>
                  <option value="work">Work & Professional Projects</option>
                  <option value="personal">Personal & Side Projects</option>
                  <option value="school">School & Learning</option>
                  <option value="team">Team Collaboration</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div class="onboarding-step hidden" id="step-2">
              <h3>You're all set!</h3>
              <div class="success-content">
                <div class="success-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 12 2 2 4-4"/>
                    <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1"/>
                    <path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1"/>
                  </svg>
                </div>
                <p>Your profile has been created! Ready to start coding?</p>
                <div class="feature-highlights">
                  <div class="feature-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="m22 21-3-3"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span>Real-time collaboration</span>
                  </div>
                  <div class="feature-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span>Inline comments</span>
                  </div>
                  <div class="feature-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="6,3 20,12 6,21"/>
                    </svg>
                    <span>Code execution</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="onboarding-footer">
            <button class="btn btn-ghost" id="skip-onboarding">Skip for now</button>
            <div class="onboarding-actions">
              <button class="btn btn-ghost hidden" id="back-btn">Back</button>
              <button class="btn btn-primary" id="next-btn">Continue</button>
              <button class="btn btn-primary hidden" id="finish-btn">Create First Project</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Insert modal into DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.onboardingModal = document.getElementById('onboarding-modal');
  }

  bindEvents() {
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const finishBtn = document.getElementById('finish-btn');
    const skipBtn = document.getElementById('skip-onboarding');

    nextBtn?.addEventListener('click', () => this.nextStep());
    backBtn?.addEventListener('click', () => this.previousStep());
    finishBtn?.addEventListener('click', () => this.finishOnboarding());
    skipBtn?.addEventListener('click', () => this.skipOnboarding());

    // Close modal when clicking backdrop
    this.onboardingModal?.querySelector('.modal-backdrop')?.addEventListener('click', () => {
      this.skipOnboarding();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.onboardingModal?.classList.contains('hidden')) {
        if (e.key === 'Escape') {
          this.skipOnboarding();
        } else if (e.key === 'Enter' && e.ctrlKey) {
          this.nextStep();
        }
      }
    });
  }

  async shouldShowOnboarding(user) {
    if (!user) return false;

    try {
      // Check if user has completed onboarding
      const { getDatabase, ref, get } = await import("https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js");
      const userProfileRef = ref(this.db, `users/${user.uid}/profile`);
      const snapshot = await get(userProfileRef);
      
      return !snapshot.exists() || !snapshot.val().onboardingCompleted;
    } catch (error) {
      console.warn('Error checking onboarding status:', error);
      return true; // Show onboarding if we can't determine status
    }
  }

  async showOnboarding(user) {
    this.currentUser = user;
    
    // Pre-fill display name if available
    const displayNameInput = document.getElementById('display-name');
    if (displayNameInput && user.displayName) {
      displayNameInput.value = user.displayName;
    }

    // Show modal
    this.onboardingModal?.classList.remove('hidden');
    
    // Focus first input
    setTimeout(() => {
      displayNameInput?.focus();
    }, 100);

    // Track onboarding start
    if (window.telemetry) {
      window.telemetry.trackEvent('onboarding_started', {
        userId: user.uid,
        userEmail: user.email
      });
    }
  }

  nextStep() {
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const finishBtn = document.getElementById('finish-btn');

    if (!step1?.classList.contains('hidden')) {
      // Validate step 1
      const displayName = document.getElementById('display-name')?.value.trim();
      const useCase = document.getElementById('use-case')?.value;

      if (!displayName) {
        this.showError('Please enter your display name');
        return;
      }

      if (!useCase) {
        this.showError('Please select how you\'ll use CoCode');
        return;
      }

      // Move to step 2
      step1.classList.add('hidden');
      step2?.classList.remove('hidden');
      nextBtn?.classList.add('hidden');
      backBtn?.classList.remove('hidden');
      finishBtn?.classList.remove('hidden');

      // Track step completion
      if (window.telemetry) {
        window.telemetry.trackEvent('onboarding_step_completed', {
          step: 1,
          displayName,
          useCase
        });
      }
    }
  }

  previousStep() {
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const finishBtn = document.getElementById('finish-btn');

    if (!step2?.classList.contains('hidden')) {
      // Move back to step 1
      step2.classList.add('hidden');
      step1?.classList.remove('hidden');
      nextBtn?.classList.remove('hidden');
      backBtn?.classList.add('hidden');
      finishBtn?.classList.add('hidden');
    }
  }

  async finishOnboarding() {
    const displayName = document.getElementById('display-name')?.value.trim();
    const useCase = document.getElementById('use-case')?.value;

    if (!this.currentUser) {
      this.showError('User session expired. Please refresh and try again.');
      return;
    }

    try {
      // Save user profile to Firebase
      const { getDatabase, ref, set } = await import("https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js");
      const userProfileRef = ref(this.db, `users/${this.currentUser.uid}/profile`);
      
      await set(userProfileRef, {
        displayName,
        useCase,
        onboardingCompleted: true,
        createdAt: Date.now(),
        email: this.currentUser.email
      });

      // Track completion
      if (window.telemetry) {
        window.telemetry.trackEvent('onboarding_completed', {
          userId: this.currentUser.uid,
          displayName,
          useCase
        });
      }

      // Close modal
      this.closeOnboarding();

      // Redirect to create first project or home
      this.redirectToCreateProject();

    } catch (error) {
      console.error('Error saving user profile:', error);
      this.showError('Failed to save profile. Please try again.');
    }
  }

  skipOnboarding() {
    // Track skip event
    if (window.telemetry && this.currentUser) {
      window.telemetry.trackEvent('onboarding_skipped', {
        userId: this.currentUser.uid
      });
    }

    this.closeOnboarding();
  }

  closeOnboarding() {
    this.onboardingModal?.classList.add('hidden');
    
    // Reset modal state
    setTimeout(() => {
      const step1 = document.getElementById('step-1');
      const step2 = document.getElementById('step-2');
      const nextBtn = document.getElementById('next-btn');
      const backBtn = document.getElementById('back-btn');
      const finishBtn = document.getElementById('finish-btn');

      step1?.classList.remove('hidden');
      step2?.classList.add('hidden');
      nextBtn?.classList.remove('hidden');
      backBtn?.classList.add('hidden');
      finishBtn?.classList.add('hidden');

      // Clear form
      const displayNameInput = document.getElementById('display-name');
      const useCaseSelect = document.getElementById('use-case');
      if (displayNameInput) displayNameInput.value = '';
      if (useCaseSelect) useCaseSelect.value = '';
    }, 300);
  }

  redirectToCreateProject() {
    // For now, just show a success message
    // In the future, this could redirect to a project creation flow
    this.showSuccess('Welcome to CoCode! You can now create your first project.');
  }

  showError(message) {
    // Create temporary error notification
    const notification = document.createElement('div');
    notification.className = 'onboarding-notification error';
    notification.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" x2="12" y1="8" y2="12"/>
        <line x1="12" x2="12.01" y1="16" y2="16"/>
      </svg>
      <span>${message}</span>
    `;

    this.onboardingModal?.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 4000);
  }

  showSuccess(message) {
    // Create temporary success notification
    const notification = document.createElement('div');
    notification.className = 'onboarding-notification success';
    notification.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m9 12 2 2 4-4"/>
        <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1"/>
        <path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1"/>
      </svg>
      <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 4000);
  }

  // Method to manually trigger onboarding (for settings)
  async reopenOnboarding(user) {
    if (user) {
      await this.showOnboarding(user);
    }
  }
}
