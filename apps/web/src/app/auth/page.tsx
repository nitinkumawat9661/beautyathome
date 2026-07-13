import type { Metadata } from 'next';
import Link from 'next/link';

import { OtpAuthForm } from '@/components/auth/otp-auth-form';

export const metadata: Metadata = {
  title: 'Customer and approved professional access',
};

export default function AuthenticationPage() {
  return (
    <main className="flex-1 bg-[#fffaf7] text-[#2f2027] dark:bg-[#171114] dark:text-[#fff8fa]">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-20">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#93506c] dark:text-[#e0a8bd]">
            Secure mobile access
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.03] tracking-[-0.04em]">
            Continue with your verified mobile number.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[#6e5a63] dark:text-[#d6c4cb]">
            Customers can sign in or create an account. Professionals can sign in only after their
            application and mobile number have been approved.
          </p>

          <div className="mt-10 border-y border-[#ddd0d6] py-6 text-sm leading-6 text-[#715d67] dark:border-[#46333c] dark:text-[#cdbac3]">
            <p className="font-semibold text-[#2f2027] dark:text-[#fff8fa]">
              Applying as a professional?
            </p>
            <p className="mt-2">
              Submit the professional application first. This sign-in page does not create
              professional access automatically.
            </p>
            <Link
              className="mt-4 inline-flex font-semibold text-[#7b3853] underline decoration-[#c9a6b4] underline-offset-8 dark:text-[#efb6cc]"
              href="/become-a-professional"
            >
              Open professional application
            </Link>
          </div>
        </section>

        <section aria-label="Mobile verification" className="border-t border-[#d8c7ce] pt-8 dark:border-[#49343e] lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
          <OtpAuthForm mode="marketplace" />
        </section>
      </div>
    </main>
  );
}
