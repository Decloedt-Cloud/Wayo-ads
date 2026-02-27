'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

type UserType = 'advertiser' | 'creator' | null;

interface OnboardingContextType {
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  isCompleted: boolean;
  userType: UserType;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  completeOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<UserType>(null);

  const getTotalSteps = (type: UserType) => {
    return type === 'advertiser' ? 4 : 4;
  };

  const getUserRole = (): UserType => {
    const roles = (session?.user as any)?.roles || [];
    const roleStr = Array.isArray(roles) ? roles.join(',') : roles;
    
    if (roleStr.includes('ADVERTISER')) return 'advertiser';
    if (roleStr.includes('CREATOR')) return 'creator';
    return null;
  };

  useEffect(() => {
    if (status === 'loading') return;

    const type = getUserRole();
    setUserType(type);

    const emailVerified = (session?.user as any)?.emailVerified;
    if (status === 'authenticated' && type && emailVerified) {
      checkOnboardingStatus(type);
    } else {
      setIsLoading(false);
    }
  }, [status, session]);

  const checkOnboardingStatus = async (type: UserType) => {
    try {
      const res = await fetch(`/api/user/onboarding-status?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.completed) {
          setIsOpen(true);
        }
        setIsCompleted(data.completed);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const openOnboarding = () => setIsOpen(true);
  const closeOnboarding = () => setIsOpen(false);
  
  const nextStep = () => {
    if (currentStep < getTotalSteps(userType) - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const goToStep = (step: number) => {
    if (step >= 0 && step < getTotalSteps(userType)) {
      setCurrentStep(step);
    }
  };

  const completeOnboarding = async () => {
    try {
      await fetch('/api/user/onboarding-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType }),
      });
      setIsCompleted(true);
      setIsOpen(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const totalSteps = getTotalSteps(userType);

  return (
    <OnboardingContext.Provider
      value={{
        isOpen,
        currentStep,
        totalSteps,
        isCompleted,
        userType,
        openOnboarding,
        closeOnboarding,
        nextStep,
        prevStep,
        goToStep,
        completeOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
