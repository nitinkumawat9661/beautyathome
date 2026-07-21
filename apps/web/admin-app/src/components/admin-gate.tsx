'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuthSession } from '@/components/auth-provider';
import { logoutAdmin } from '@/lib/api/client';

export function AdminGate({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const session = useAuthSession();

  useEffect(() => {
    if (session.status === 'unauthenticated') router.replace('/sign-in');
  }, [router, session.status]);

  if (session.status === 'loading') {
    return <main className="p-8">Restoring secure session…</main>;
  }

  if (session.status === 'unavailable') {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">Operations API unavailable</h1>
        <p className="mt-3 leading-7 text-[#6b625c]">
          Check the admin deployment API configuration and try again.
        </p>
      </main>
    );
  }

  if (session.status !== 'authenticated' || !session.principal) {
    return <main className="p-8">Redirecting to sign in…</main>;
  }

  if (session.principal.activeRole !== 'ADMIN') {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">Administrator role required</h1>
        <p className="mt-3 leading-7 text-[#6b625c]">
          This workspace does not accept customer, professional, support, or finance sessions.
        </p>
        <button
          className="mt-6 min-h-11 bg-[#4a2435] px-5 font-semibold text-white"
          onClick={() => void logoutAdmin().then(() => router.replace('/sign-in'))}
          type="button"
        >
          Sign out
        </button>
      </main>
    );
  }

  return children;
}
