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
    <header className="sticky top-0 z-50 border-b border-[#eadde3] bg-[#fffaf8]/90 text-[#2f1b28] backdrop-blur-xl dark:border-[#3a2932] dark:bg-[#171014]/90 dark:text-[#fff7fa]">
      <div className="mx-auto flex min-h-18 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link className="group flex items-center gap-3" href="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3b1d2d] font-serif text-lg font-semibold text-white shadow-sm transition group-hover:scale-105 dark:bg-[#f2c9d9] dark:text-[#321d28]">
            B
          </span>
          <span>
            <span className="block text-base font-semibold tracking-[-0.02em]">BeautyAtHome</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a687c] dark:text-[#d7a9bb]">
              Sikar
            </span>
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-7 text-sm md:flex">
          <Link className="font-medium transition hover:text-[#a0486b]" href="/services">
            Services
          </Link>
          <Link className="font-medium transition hover:text-[#a0486b]" href="/#how-it-works">
            How it works
          </Link>
          <Link className="font-medium transition hover:text-[#a0486b]" href="/auth">
            For professionals
          </Link>
        </nav>

        <nav aria-label="Account" className="flex items-center justify-end gap-2 text-sm">
          <Link
            className="rounded-full px-3 py-2 font-medium transition hover:bg-[#f4e6eb] md:hidden dark:hover:bg-[#33212a]"
            href="/services"
          >
            Services
          </Link>
          {session.status === 'authenticated' && session.principal ? (
            <>
              <Link
                className="hidden rounded-full px-4 py-2 font-semibold transition hover:bg-[#f4e6eb] sm:inline-flex dark:hover:bg-[#33212a]"
                href={
                  session.principal.activeRole === 'PROFESSIONAL'
                    ? '/professional'
                    : ['ADMIN', 'SUPPORT', 'FINANCE'].includes(session.principal.activeRole)
                      ? '/admin'
                      : '/profile'
                }
              >
                {session.principal.activeRole === 'PROFESSIONAL'
                  ? 'Workspace'
                  : ['ADMIN', 'SUPPORT', 'FINANCE'].includes(session.principal.activeRole)
                    ? 'Admin'
                    : 'My profile'}
              </Link>
              <Button
                className="min-h-10 rounded-full border border-[#d8bdc8] px-4 font-semibold transition hover:bg-[#f4e6eb] disabled:cursor-wait disabled:opacity-60 dark:border-[#5b3c49] dark:hover:bg-[#33212a]"
                disabled={isSigningOut}
                onClick={() => void handleSignOut()}
              >
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </>
          ) : session.status === 'unauthenticated' ? (
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#3b1d2d] px-5 font-semibold text-white shadow-sm transition hover:bg-[#54283d] dark:bg-[#f2c9d9] dark:text-[#321d28]"
              href="/auth"
            >
              Sign in
            </Link>
          ) : session.status === 'unavailable' ? (
            <Button
              className="rounded-full border border-[#d8bdc8] px-4 py-2 font-semibold hover:bg-[#f4e6eb] dark:border-[#5b3c49] dark:hover:bg-[#33212a]"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          ) : (
            <span className="inline-flex h-10 w-20 animate-pulse rounded-full bg-[#f0dce4] dark:bg-[#3c2731]">
              <span className="sr-only">Checking session</span>
            </span>
          )}
        </nav>

        {signOutError ? (
          <p
            className="absolute inset-x-5 top-full mt-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700 shadow-lg sm:inset-x-auto sm:right-8 dark:border-red-900 dark:bg-[#24171e] dark:text-red-300"
            role="alert"
          >
            {signOutError}
          </p>
        ) : null}
      </div>
    </header>
  );
}
