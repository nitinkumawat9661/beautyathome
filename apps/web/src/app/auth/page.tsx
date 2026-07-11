import type { Metadata } from 'next';
import Link from 'next/link';

import { OtpAuthForm } from '@/components/auth/otp-auth-form';

export const metadata: Metadata = {
  title: 'Customer and professional access',
};

export default function AuthenticationPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-10 sm:px-8 sm:py-16">
      <div className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Secure mobile access
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Continue to BeautyAtHome</h1>
        <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-300">
          Choose your account context and verify your Indian mobile number with a one-time code.
        </p>
      </div>
      <section
        aria-label="Mobile verification"
        className="rounded-xl border border-zinc-200 p-5 shadow-sm dark:border-zinc-800 sm:p-7"
      >
        <OtpAuthForm mode="marketplace" />
      </section>
      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Platform staff?{' '}
        <Link className="font-medium underline underline-offset-4" href="/admin/sign-in">
          Use admin sign in
        </Link>
      </p>
    </main>
  );
}
