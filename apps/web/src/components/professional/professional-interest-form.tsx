'use client';

import { useState, type FormEvent } from 'react';

const serviceOptions = [
  'Hair styling and care',
  'Skin and facial services',
  'Makeup',
  'Manicure and pedicure',
  'Waxing and grooming',
] as const;

export function ProfessionalInterestForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <section
        aria-live="polite"
        className="border-y border-[#d8c7ce] py-8 dark:border-[#49343e]"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#93506c] dark:text-[#e0a8bd]">
          Application prepared
        </p>
        <h2 className="mt-3 font-serif text-3xl tracking-[-0.03em]">
          Your details are ready for admin review.
        </h2>
        <p className="mt-4 max-w-xl leading-7 text-[#715d67] dark:text-[#cdbac3]">
          This UI preview does not send the application yet. Admin delivery and status tracking will
          be connected in the backend step.
        </p>
        <button
          className="mt-7 border border-[#3b1d2d] px-5 py-3 text-sm font-semibold text-[#3b1d2d] dark:border-[#f2cbd9] dark:text-[#f2cbd9]"
          onClick={() => setSubmitted(false)}
          type="button"
        >
          Edit application
        </button>
      </section>
    );
  }

  return (
    <form className="space-y-7" onSubmit={handleSubmit}>
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Full name
          <input
            autoComplete="name"
            className="mt-2 min-h-12 w-full border border-[#d8c7ce] bg-transparent px-4 outline-none transition focus:border-[#8f526a] dark:border-[#49343e]"
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
            inputMode="tel"
            name="mobileNumber"
            pattern="[0-9+ -]{10,16}"
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
            name="experience"
            required
          >
            <option disabled value="">
              Select experience
            </option>
            <option value="less-than-1">Less than 1 year</option>
            <option value="1-2">1–2 years</option>
            <option value="3-5">3–5 years</option>
            <option value="6-plus">6+ years</option>
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Services you provide</legend>
        <div className="mt-3 grid gap-x-8 gap-y-3 border-y border-[#ddd0d6] py-5 sm:grid-cols-2 dark:border-[#46333c]">
          {serviceOptions.map((service) => (
            <label className="flex items-start gap-3 text-sm" key={service}>
              <input className="mt-0.5 h-4 w-4" name="services" type="checkbox" value={service} />
              <span>{service}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-medium">
        Area coverage or work preference
        <input
          className="mt-2 min-h-12 w-full border border-[#d8c7ce] bg-transparent px-4 outline-none transition focus:border-[#8f526a] dark:border-[#49343e]"
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
          name="workSummary"
          placeholder="Mention training, specialties and the type of appointments you handle."
          required
        />
      </label>

      <label className="flex items-start gap-3 border-t border-[#ddd0d6] pt-5 text-sm leading-6 dark:border-[#46333c]">
        <input className="mt-1 h-4 w-4" name="consent" required type="checkbox" />
        <span>
          I confirm that these details are accurate and understand that professional access is
          activated only after verification and admin approval.
        </span>
      </label>

      <button
        className="inline-flex min-h-13 w-full items-center justify-center bg-[#3b1d2d] px-7 text-sm font-semibold text-white transition hover:bg-[#52283d] sm:w-auto dark:bg-[#f2cbd9] dark:text-[#321d28]"
        type="submit"
      >
        Submit application for review
      </button>
    </form>
  );
}
