import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/stores/auth/app';
import { useAuth } from '@/hooks';

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

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    session: isAuthenticated,
    isLoading,
    signIn,
    signOut,
  }), [isAuthenticated, isLoading]);

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}