import type { Metadata } from 'next';

import { AdminSignInForm } from '@/components/admin-sign-in-form';

export const metadata: Metadata = {
  title: 'Admin sign in',
};

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b625c]">
        Restricted operations
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Admin sign in</h1>
      <p className="mt-4 leading-7 text-[#6b625c]">
        Use the mobile number attached to a pre-provisioned administrator account.
      </p>
      <section className="mt-8 border border-[#d9d3cd] bg-white p-6 shadow-sm">
        <AdminSignInForm />
      </section>
    </main>
  );
}
