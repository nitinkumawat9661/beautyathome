'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import type { UserRole } from '@beautyathome/auth';
import { Button } from '@beautyathome/ui';

import { useAuthSession } from '@/components/auth-provider';

export function RoleGate({
  allowedRoles,
  children,
  signInPath = '/auth',
}: Readonly<{
  allowedRoles: readonly UserRole[];
  children: ReactNode;
  signInPath?: string;
}>) {
  const session = useAuthSession();
  const router = useRouter();
  const isAllowed =
    session.status === 'authenticated' &&
    session.principal !== null &&
    allowedRoles.includes(session.principal.activeRole);

  useEffect(() => {
    if (session.status === 'unauthenticated') {
      router.replace(signInPath);
    } else if (session.status === 'authenticated' && !isAllowed) {
      router.replace('/');
    }
  }, [isAllowed, router, session.status, signInPath]);

  if (isAllowed) return children;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">
        {session.status === 'unavailable' ? 'Workspace unavailable' : 'Checking access'}
      </h1>
      <p aria-live="polite" className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
        {session.status === 'unavailable'
          ? 'We could not confirm your secure session. Retry when the API connection is available.'
          : 'Confirming your account role before opening this workspace…'}
      </p>
      {session.status === 'unavailable' ? (
        <Button
          className="mt-6 min-h-11 rounded-md border border-zinc-300 px-4 font-medium dark:border-zinc-700"
          onClick={() => window.location.reload()}
        >
          Retry session
        </Button>
      ) : null}
    </main>
  );
}
