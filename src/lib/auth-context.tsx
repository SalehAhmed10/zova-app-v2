import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app';
import { useAuth } from '@/hooks/useAuth';

interface SessionContextType {
  session: boolean;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, logout } = useAppStore();
  const { signOut: authSignOut } = useAuth();

  const signIn = () => {
    // This will be called from sign-in screen
    // The actual sign-in logic is handled in the auth screens
  };

  const signOut = async () => {
    await authSignOut();
    logout();
  };

  return (
    <SessionContext.Provider
      value={{
        session: isAuthenticated,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}