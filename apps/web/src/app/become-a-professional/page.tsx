import type { Metadata } from 'next';
import Link from 'next/link';

import { ProfessionalInterestForm } from '@/components/professional/professional-interest-form';

export const metadata: Metadata = {
  title: 'Become a professional',
  description: 'Apply to offer verified at-home beauty services through BeautyAtHome in Sikar.',
};

const reviewSteps = [
  ['1', 'Submit your details', 'Tell us about your experience, services and work area.'],
  ['2', 'Admin review', 'The operations team checks eligibility and verification requirements.'],
  ['3', 'Mobile activation', 'Approved professionals receive access on the verified mobile number.'],
] as const;

export default function BecomeAProfessionalPage() {
  return (
    <main className="flex-1 bg-[#fffaf7] text-[#2f2027] dark:bg-[#171114] dark:text-[#fff8fa]">
      <section className="border-b border-[#e4d5dc] dark:border-[#3a2b32]">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#93506c] dark:text-[#e0a8bd]">
              Professional applications
            </p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.03] tracking-[-0.04em] sm:text-6xl">
              Build your independent beauty practice with reviewed platform access.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6e5a63] dark:text-[#d6c4cb]">
              Applying does not create a professional account. Access is activated only after admin
              review and approval of the mobile number you submit.
            </p>
          </div>

          <ol className="divide-y divide-[#d9c8cf] border-y border-[#d9c8cf] dark:divide-[#47343d] dark:border-[#47343d]">
            {reviewSteps.map(([number, title, description]) => (
              <li className="grid grid-cols-[3rem_1fr] gap-5 py-6" key={number}>
                <span className="font-serif text-3xl text-[#985975] dark:text-[#e1a9bf]">
                  {number}
                </span>
                <div>
                  <h2 className="font-semibold">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#715d67] dark:text-[#cdbac3]">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[0.65fr_1.35fr] lg:gap-20 lg:py-20">
        <aside>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#93506c] dark:text-[#e0a8bd]">
            Before you apply
          </p>
          <h2 className="mt-3 font-serif text-3xl tracking-[-0.03em]">
            Keep your mobile number and work details ready.
          </h2>
          <ul className="mt-7 space-y-4 text-sm leading-6 text-[#715d67] dark:text-[#cdbac3]">
            <li>Use the mobile number you want approved for future professional sign-in.</li>
            <li>List only the services you are trained and prepared to provide.</li>
            <li>Approval may require identity, skill and service-area verification.</li>
          </ul>
          <p className="mt-8 border-t border-[#ddd0d6] pt-6 text-sm leading-6 text-[#715d67] dark:border-[#46333c] dark:text-[#cdbac3]">
            Already approved? Use the same verified mobile number on the sign-in page and choose
            Approved professional. After verification, you will continue to the professional
            workspace.
          </p>
          <Link
            className="mt-5 inline-flex text-sm font-semibold text-[#7b3853] underline decoration-[#c9a6b4] underline-offset-8 dark:text-[#efb6cc]"
            href="/auth"
          >
            Go to sign in
          </Link>
        </aside>

        <section aria-labelledby="application-title">
          <div className="mb-8 border-b border-[#ddd0d6] pb-6 dark:border-[#46333c]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#93506c] dark:text-[#e0a8bd]">
              Application form
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-[-0.03em]" id="application-title">
              Tell us about your work.
            </h2>
          </div>
          <ProfessionalInterestForm />
        </section>
      </section>
    </main>
  );
}
