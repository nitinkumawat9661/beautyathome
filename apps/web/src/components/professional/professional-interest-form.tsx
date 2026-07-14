'use client';

import { useState, type FormEvent } from 'react';

import { submitProfessionalApplication } from '@/lib/api/professional-applications-client';

const serviceOptions = [
  { value: 'HAIR_CARE', label: 'Hair styling and care' },
  { value: 'SKIN_FACIAL', label: 'Skin and facial services' },
  { value: 'MAKEUP', label: 'Makeup' },
  { value: 'NAIL_CARE', label: 'Manicure and pedicure' },
  { value: 'WAXING_GROOMING', label: 'Waxing and grooming' },
] as const;

type SubmissionState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'error'; message: string }
  | { status: 'submitted'; referenceId: string };

export function ProfessionalInterestForm() {
  const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' });

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmission({ status: 'submitting' });

    try {
      const response = await submitProfessionalApplication({
        fullName: formData.get('fullName'),
        mobileNumber: formData.get('mobileNumber'),
        city: formData.get('city'),
        experienceBand: formData.get('experienceBand'),
        services: formData.getAll('services'),
        coverage: formData.get('coverage'),
        workSummary: formData.get('workSummary'),
        consent: formData.get('consent') === 'on',
      });

      setSubmission({
        status: 'submitted',
        referenceId: response.referenceId,
      });
      form.reset();
    } catch (error) {
      setSubmission({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'The application could not be submitted. Please try again.',
      });
    }
  }

  if (submission.status === 'submitted') {
    return (
      <section aria-live="polite" className="border-y border-[#d8c7ce] py-8 dark:border-[#49343e]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#93506c] dark:text-[#e0a8bd]">
          Application received
        </p>
        <h2 className="mt-3 font-serif text-3xl tracking-[-0.03em]">
          Your details are now in the admin review queue.
        </h2>
        <p className="mt-4 max-w-xl leading-7 text-[#715d67] dark:text-[#cdbac3]">
          We will review your service experience and coverage details. Professional sign-in will
          work only after your mobile number is approved and provisioned.
        </p>
        <p className="mt-4 text-sm text-[#715d67] dark:text-[#cdbac3]">
          Reference: <span className="font-mono">{submission.referenceId}</span>
        </p>
        <button
          className="mt-7 border border-[#3b1d2d] px-5 py-3 text-sm font-semibold text-[#3b1d2d] dark:border-[#f2cbd9] dark:text-[#f2cbd9]"
          onClick={() => setSubmission({ status: 'idle' })}
          type="button"
        >
          Submit another application
        </button>
      </section>
    );
  }

  const submitting = submission.status === 'submitting';

  return (
    <form className="space-y-7" onSubmit={handleSubmit}>
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Full name
          <input
            autoComplete="name"
            className="mt-2 min-h-12 w-full border border-[#d8c7ce] bg-transparent px-4 outline-none transition focus:border-[#8f526a] dark:border-[#49343e]"
            disabled={submitting}
            name="fullName"
            placeholder="Your full name"
            required
            type="text"
          />
        </label>

        <label className="text-sm font-medium">
          Mobile number
          <input
            autoComplete="tel"
            className="mt-2 min-h-12 w-full border border-[#d8c7ce] bg-transparent px-4 outline-none transition focus:border-[#8f526a] dark:border-[#49343e]"
            disabled={submitting}
            inputMode="tel"
            name="mobileNumber"
            pattern="[0-9+() -]{10,18}"
            placeholder="98765 43210"
            required
            type="tel"
          />
        </label>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="text-sm font-medium">
          City
          <input
            autoComplete="address-level2"
            className="mt-2 min-h-12 w-full border border-[#d8c7ce] bg-transparent px-4 outline-none transition focus:border-[#8f526a] dark:border-[#49343e]"
            defaultValue="Sikar"
            disabled={submitting}
            name="city"
            required
            type="text"
          />
        </label>

        <label className="text-sm font-medium">
          Years of experience
          <select
            className="mt-2 min-h-12 w-full border border-[#d8c7ce] bg-transparent px-4 outline-none transition focus:border-[#8f526a] dark:border-[#49343e] dark:bg-[#171114]"
            defaultValue=""
            disabled={submitting}
            name="experienceBand"
            required
          >
            <option disabled value="">
              Select experience
            </option>
            <option value="LESS_THAN_ONE">Less than 1 year</option>
            <option value="ONE_TO_TWO">1–2 years</option>
            <option value="THREE_TO_FIVE">3–5 years</option>
            <option value="SIX_PLUS">6+ years</option>
          </select>
        </label>
      </div>

      <fieldset disabled={submitting}>
        <legend className="text-sm font-medium">Services you provide</legend>
        <div className="mt-3 grid gap-x-8 gap-y-3 border-y border-[#ddd0d6] py-5 sm:grid-cols-2 dark:border-[#46333c]">
          {serviceOptions.map((service) => (
            <label className="flex items-start gap-3 text-sm" key={service.value}>
              <input
                className="mt-0.5 h-4 w-4"
                name="services"
                type="checkbox"
                value={service.value}
              />
              <span>{service.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-medium">
        Area coverage or work preference
        <input
          className="mt-2 min-h-12 w-full border border-[#d8c7ce] bg-transparent px-4 outline-none transition focus:border-[#8f526a] dark:border-[#49343e]"
          disabled={submitting}
          name="coverage"
          placeholder="Example: Piprali Road, Rani Sati Road, within 8 km"
          required
          type="text"
        />
      </label>

      <label className="block text-sm font-medium">
        Tell us about your work
        <textarea
          className="mt-2 min-h-32 w-full resize-y border border-[#d8c7ce] bg-transparent px-4 py-3 outline-none transition focus:border-[#8f526a] dark:border-[#49343e]"
          disabled={submitting}
          minLength={20}
          name="workSummary"
          placeholder="Mention training, specialties and the type of appointments you handle."
          required
        />
      </label>

      <label className="flex items-start gap-3 border-t border-[#ddd0d6] pt-5 text-sm leading-6 dark:border-[#46333c]">
        <input
          className="mt-1 h-4 w-4"
          disabled={submitting}
          name="consent"
          required
          type="checkbox"
        />
        <span>
          I confirm that these details are accurate and understand that professional access is
          activated only after verification and admin approval.
        </span>
      </label>

      {submission.status === 'error' ? (
        <p aria-live="polite" className="text-sm font-medium text-red-700 dark:text-red-300">
          {submission.message}
        </p>
      ) : null}

      <button
        className="inline-flex min-h-13 w-full items-center justify-center bg-[#3b1d2d] px-7 text-sm font-semibold text-white transition hover:bg-[#52283d] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-[#f2cbd9] dark:text-[#321d28]"
        disabled={submitting}
        type="submit"
      >
        {submitting ? 'Submitting application…' : 'Submit application for review'}
      </button>
    </form>
  );
}
