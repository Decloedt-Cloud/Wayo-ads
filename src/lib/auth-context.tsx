'use client';

import { SessionProvider, useSession, signIn } from 'next-auth/react';
import { ReactNode, createContext, useContext } from 'react';

type AuthContextType = {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    roles: string[];
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdvertiser: boolean;
  isCreator: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const user = session?.user ?? null;
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const roles = user?.roles ?? [];
  const isAdvertiser = roles.includes('ADVERTISER');
  const isCreator = roles.includes('CREATOR');

  const handleSignIn = async (email: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    await signIn('credentials', { email, callbackUrl: `${baseUrl}/campaigns` });
  };

  const handleSignOut = async () => {
    window.location.href = '/api/auth/federated-logout';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdvertiser,
        isCreator,
        signIn: handleSignIn,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
