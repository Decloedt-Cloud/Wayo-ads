'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { LanguageProvider, Language } from './translations';
import { OnboardingProvider } from './onboarding/OnboardingContext';
import OnboardingModal from './onboarding/OnboardingModal';

type ProvidersProps = {
  children: React.ReactNode;
  initialLanguage?: Language;
};

export function Providers({ children, initialLanguage }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider initialLanguage={initialLanguage}>
          <OnboardingProvider>
            {children}
            <OnboardingModal />
          </OnboardingProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
