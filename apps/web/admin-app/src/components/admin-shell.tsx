'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { logoutAdmin } from '@/lib/api/client';

export function AdminShell({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <header className="border-b border-[#d9d3cd] bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b625c]">
              BeautyAtHome
            </p>
            <p className="mt-1 font-semibold">Operations workspace</p>
          </div>
          <nav className="flex items-center gap-5 text-sm font-semibold">
            <Link href="/professional-applications">Applications</Link>
            <button
              className="border border-[#d9d3cd] px-4 py-2"
              onClick={() => void logoutAdmin().then(() => router.replace('/sign-in'))}
              type="button"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
