'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';

import { initializeAuthSession } from '@/lib/api/client';
import {
  getAuthSessionSnapshot,
  getServerAuthSessionSnapshot,
  subscribeToAuthSession,
} from '@/lib/auth/session-store';

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  useEffect(() => {
    void initializeAuthSession();
  }, []);
  return children;
}

export function useAuthSession() {
  return useSyncExternalStore(
    subscribeToAuthSession,
    getAuthSessionSnapshot,
    getServerAuthSessionSnapshot,
  );
}
