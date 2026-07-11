'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@beautyathome/ui';

import { useAuthSession } from '@/components/auth-provider';
import { logout } from '@/lib/api/api-client';

export function SiteHeader() {
  const session = useAuthSession();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await logout();
      router.replace('/');
    } catch {
      setSignOutError(
        'Sign out could not be confirmed. Your session remains active; please try again.',
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-2 sm:px-8">
        <Link className="font-semibold tracking-tight" href="/">
          BeautyAtHome
        </Link>
        <nav aria-label="Account" className="flex items-center gap-3 text-sm">
          {session.status === 'authenticated' && session.principal ? (
            <>
              <Link
                className="rounded px-2 py-2 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900"
                href="/profile"
              >
                {session.principal.activeRole === 'PROFESSIONAL'
                  ? 'Professional profile'
                  : ['ADMIN', 'SUPPORT', 'FINANCE'].includes(session.principal.activeRole)
                    ? 'Staff profile'
                    : 'My profile'}
              </Link>
              <Button
                className="min-h-10 rounded-md border border-zinc-300 px-3 font-medium hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
                disabled={isSigningOut}
                onClick={() => void handleSignOut()}
              >
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </>
          ) : session.status === 'unauthenticated' ? (
            <Link
              className="rounded-md border border-zinc-300 px-3 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              href="/auth"
            >
              Sign in
            </Link>
          ) : session.status === 'unavailable' ? (
            <Button
              className="rounded-md border border-zinc-300 px-3 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              onClick={() => window.location.reload()}
            >
              Retry session
            </Button>
          ) : (
            <span aria-label="Checking session" className="text-zinc-500">
              Checking session…
            </span>
          )}
        </nav>
        {signOutError ? (
          <p
            className="w-full pb-2 text-sm font-medium text-red-700 dark:text-red-300"
            role="alert"
          >
            {signOutError}
          </p>
        ) : null}
      </div>
    </header>
  );
}
