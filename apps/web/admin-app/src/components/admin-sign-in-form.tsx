'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { useAuthSession } from '@/components/auth-provider';
import {
  apiErrorMessage,
  normalizeIndiaMobile,
  requestAdminOtp,
  verifyAdminOtp,
} from '@/lib/api/client';

export function AdminSignInForm() {
  const router = useRouter();
  const session = useAuthSession();
  const otpRef = useRef<HTMLInputElement>(null);
  const [mobileInput, setMobileInput] = useState('');
  const [mobileNumber, setMobileNumber] = useState<ReturnType<typeof normalizeIndiaMobile>>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === 'authenticated' && session.principal?.activeRole === 'ADMIN') {
      router.replace('/professional-applications');
    }
  }, [router, session.principal, session.status]);

  useEffect(() => {
    if (challengeId) otpRef.current?.focus();
  }, [challengeId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);

    if (!challengeId || !mobileNumber) {
      const normalized = normalizeIndiaMobile(mobileInput);
      if (!normalized) {
        setMessage('Enter a valid 10-digit Indian mobile number.');
        return;
      }

      setSubmitting(true);
      try {
        const challenge = await requestAdminOtp(normalized);
        setMobileNumber(normalized);
        setChallengeId(challenge.challengeId);
        setExpiresAt(challenge.expiresAt);
        setMessage('If the administrator account is eligible, a verification code has been sent.');
      } catch (error) {
        setMessage(apiErrorMessage(error));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!/^\d{4,8}$/.test(otp)) {
      setMessage('Enter the numeric verification code.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await verifyAdminOtp(mobileNumber, challengeId, otp);
      if (response.principal.activeRole !== 'ADMIN') {
        setMessage('This account is not authorized for administrator access.');
        return;
      }
      router.replace('/professional-applications');
    } catch (error) {
      setMessage(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
      <label className="block text-sm font-semibold">
        Administrator mobile number
        <input
          autoComplete="tel"
          className="mt-2 min-h-12 w-full border border-[#d9d3cd] px-4 outline-none focus:border-[#4a2435] disabled:bg-[#f2efec]"
          disabled={Boolean(challengeId) || submitting}
          inputMode="tel"
          onChange={(event) => setMobileInput(event.target.value)}
          placeholder="98765 43210"
          required
          type="tel"
          value={mobileInput}
        />
      </label>

      {challengeId ? (
        <label className="block text-sm font-semibold">
          Verification code
          <input
            autoComplete="one-time-code"
            className="mt-2 min-h-12 w-full border border-[#d9d3cd] px-4 font-mono tracking-[0.3em] outline-none focus:border-[#4a2435]"
            disabled={submitting}
            inputMode="numeric"
            maxLength={8}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
            ref={otpRef}
            required
            type="text"
            value={otp}
          />
          {expiresAt ? (
            <span className="mt-2 block text-xs font-normal text-[#6b625c]">
              Code expires at {new Date(expiresAt).toLocaleTimeString('en-IN')}.
            </span>
          ) : null}
        </label>
      ) : null}

      {message ? (
        <p aria-live="polite" className="border-y border-[#d9d3cd] py-3 text-sm text-[#5d313f]">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="min-h-12 bg-[#4a2435] px-6 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting
            ? 'Verifying…'
            : challengeId
              ? 'Verify and continue'
              : 'Send verification code'}
        </button>
        {challengeId ? (
          <button
            className="min-h-12 border border-[#d9d3cd] px-5 font-semibold"
            disabled={submitting}
            onClick={() => {
              setChallengeId(null);
              setExpiresAt(null);
              setMobileNumber(null);
              setOtp('');
              setMessage(null);
            }}
            type="button"
          >
            Change number
          </button>
        ) : null}
      </div>
    </form>
  );
}
