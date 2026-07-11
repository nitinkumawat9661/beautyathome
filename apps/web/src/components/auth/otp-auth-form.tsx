'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import {
  IndiaMobileNumberSchema,
  OtpVerifyRequestSchema,
  type IndiaMobileNumber,
  type OtpAuthRole,
  type OtpPurpose,
  type OtpRequest,
  type OtpRequestAcceptedResponse,
  type OtpVerifyRequest,
} from '@beautyathome/auth';
import { Button } from '@beautyathome/ui';

import { useAuthSession } from '@/components/auth-provider';
import { authenticationErrorMessage, requestOtp, verifyOtp } from '@/lib/api/api-client';

type MarketplaceRole = Extract<OtpAuthRole, 'CUSTOMER' | 'PROFESSIONAL'>;
type StaffRole = Extract<OtpAuthRole, 'ADMIN' | 'SUPPORT' | 'FINANCE'>;

interface OtpAuthFormProps {
  mode: 'marketplace' | 'admin';
}

function normalizeIndiaMobile(value: string): IndiaMobileNumber | null {
  const compact = value.replace(/[\s()-]/g, '');
  const withCountryCode = /^\d{10}$/.test(compact)
    ? `+91${compact}`
    : /^91\d{10}$/.test(compact)
      ? `+${compact}`
      : compact;

  const result = IndiaMobileNumberSchema.safeParse(withCountryCode);
  return result.success ? result.data : null;
}

function maskMobileNumber(mobileNumber: string): string {
  return `${mobileNumber.slice(0, 3)} •••••• ${mobileNumber.slice(-4)}`;
}

function buildOtpRequest(
  role: MarketplaceRole | StaffRole,
  purpose: OtpPurpose,
  mobileNumber: IndiaMobileNumber,
): OtpRequest {
  if (role === 'ADMIN' || role === 'SUPPORT' || role === 'FINANCE') {
    return { role, purpose: 'SIGN_IN', mobileNumber };
  }

  return { role, purpose, mobileNumber };
}

function buildOtpVerifyRequest(
  request: OtpRequest,
  challengeId: string,
  otp: string,
): OtpVerifyRequest {
  return OtpVerifyRequestSchema.parse({ ...request, challengeId, otp });
}

export function OtpAuthForm({ mode }: OtpAuthFormProps) {
  const router = useRouter();
  const session = useAuthSession();
  const otpInputRef = useRef<HTMLInputElement>(null);
  const lastChallengeRef = useRef<
    | {
        request: OtpRequest;
        response: OtpRequestAcceptedResponse;
      }
    | undefined
  >(undefined);
  const [marketplaceRole, setMarketplaceRole] = useState<MarketplaceRole>('CUSTOMER');
  const [staffRole, setStaffRole] = useState<StaffRole>('ADMIN');
  const [purpose, setPurpose] = useState<OtpPurpose>('SIGN_IN');
  const [mobileInput, setMobileInput] = useState('');
  const [normalizedMobile, setNormalizedMobile] = useState<IndiaMobileNumber | null>(null);
  const [otp, setOtp] = useState('');
  const [challenge, setChallenge] = useState<OtpRequestAcceptedResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const role: MarketplaceRole | StaffRole = mode === 'admin' ? staffRole : marketplaceRole;
  const effectivePurpose: OtpPurpose = mode === 'admin' ? 'SIGN_IN' : purpose;

  useEffect(() => {
    if (session.status === 'authenticated') {
      router.replace('/profile');
    }
  }, [router, session.status]);

  useEffect(() => {
    if (challenge !== null) {
      otpInputRef.current?.focus();
    }
  }, [challenge]);

  function resetChallenge(): void {
    setChallenge(null);
    setNormalizedMobile(null);
    setOtp('');
    setErrorMessage(null);
    setNotice(null);
  }

  async function requestCode(): Promise<void> {
    const mobileNumber = normalizeIndiaMobile(mobileInput);
    if (mobileNumber === null) {
      setErrorMessage('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setNotice(null);

    try {
      const request = buildOtpRequest(role, effectivePurpose, mobileNumber);
      const cached = lastChallengeRef.current;
      if (
        cached &&
        cached.request.mobileNumber === request.mobileNumber &&
        cached.request.role === request.role &&
        cached.request.purpose === request.purpose &&
        new Date(cached.response.expiresAt).getTime() > Date.now()
      ) {
        setNormalizedMobile(mobileNumber);
        setChallenge(cached.response);
        setNotice('Use the current verification code until it expires.');
        return;
      }

      const response = await requestOtp(request);
      lastChallengeRef.current = { request, response };
      setNormalizedMobile(mobileNumber);
      setChallenge(response);
      setOtp('');
      setNotice('If this request is eligible, the latest verification code has been sent.');
    } catch (error: unknown) {
      setErrorMessage(authenticationErrorMessage(error, 'request'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (challenge === null || normalizedMobile === null) {
      await requestCode();
      return;
    }

    if (!/^\d{4,8}$/.test(otp)) {
      setErrorMessage('Enter the numeric verification code from your message.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setNotice(null);

    try {
      const request = buildOtpRequest(role, effectivePurpose, normalizedMobile);
      await verifyOtp(buildOtpVerifyRequest(request, challenge.challengeId, otp));
      router.replace('/profile');
    } catch (error: unknown) {
      setErrorMessage(authenticationErrorMessage(error, 'verify'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const expiry = challenge
    ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(
        new Date(challenge.expiresAt),
      )
    : null;

  return (
    <form className="space-y-6" noValidate onSubmit={(event) => void handleSubmit(event)}>
      {mode === 'marketplace' ? (
        <fieldset disabled={challenge !== null || isSubmitting}>
          <legend className="mb-2 text-sm font-medium">I am continuing as</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {(['CUSTOMER', 'PROFESSIONAL'] as const).map((option) => (
              <Button
                aria-checked={marketplaceRole === option}
                className={`min-h-12 rounded-md border px-3 text-sm font-medium ${
                  marketplaceRole === option
                    ? 'border-zinc-950 bg-zinc-950 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950'
                    : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900'
                }`}
                key={option}
                onClick={() => {
                  setMarketplaceRole(option);
                  resetChallenge();
                }}
                role="radio"
              >
                {option === 'CUSTOMER' ? 'Customer' : 'Professional'}
              </Button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {mode === 'marketplace' ? (
        <fieldset disabled={challenge !== null || isSubmitting}>
          <legend className="mb-2 text-sm font-medium">Account action</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {(['SIGN_IN', 'SIGN_UP'] as const).map((option) => (
              <Button
                aria-checked={purpose === option}
                className={`min-h-11 rounded-md border px-3 text-sm ${
                  purpose === option
                    ? 'border-zinc-950 font-semibold dark:border-zinc-100'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}
                key={option}
                onClick={() => {
                  setPurpose(option);
                  resetChallenge();
                }}
                role="radio"
              >
                {option === 'SIGN_IN' ? 'Sign in' : 'Create account'}
              </Button>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="space-y-3">
          <fieldset disabled={challenge !== null || isSubmitting}>
            <legend className="mb-2 text-sm font-medium">Staff role</legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup">
              {(['ADMIN', 'SUPPORT', 'FINANCE'] as const).map((option) => (
                <Button
                  aria-checked={staffRole === option}
                  className={`min-h-11 rounded-md border px-2 text-sm ${
                    staffRole === option
                      ? 'border-zinc-950 font-semibold dark:border-zinc-100'
                      : 'border-zinc-300 dark:border-zinc-700'
                  }`}
                  key={option}
                  onClick={() => {
                    setStaffRole(option);
                    resetChallenge();
                  }}
                  role="radio"
                >
                  {option === 'ADMIN' ? 'Admin' : option === 'SUPPORT' ? 'Support' : 'Finance'}
                </Button>
              ))}
            </div>
          </fieldset>
          <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            Staff access is sign-in only. Accounts and roles are provisioned by authorized platform
            operations.
          </p>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor={`${mode}-mobile`}>
          Mobile number
        </label>
        <input
          aria-describedby={`${mode}-mobile-help ${mode}-form-message`}
          aria-invalid={Boolean(errorMessage) && challenge === null}
          autoComplete="tel"
          className="min-h-12 w-full rounded-md border border-zinc-300 bg-transparent px-3 disabled:opacity-70 dark:border-zinc-700"
          disabled={challenge !== null || isSubmitting}
          id={`${mode}-mobile`}
          inputMode="tel"
          name="mobileNumber"
          onChange={(event) => setMobileInput(event.target.value)}
          placeholder="98765 43210"
          required
          type="tel"
          value={mobileInput}
        />
        <p
          className="mt-2 text-xs leading-5 text-zinc-600 dark:text-zinc-400"
          id={`${mode}-mobile-help`}
        >
          Indian mobile numbers only. Standard messaging rates may apply.
        </p>
      </div>

      {challenge !== null && normalizedMobile !== null ? (
        <div>
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <label className="block text-sm font-medium" htmlFor={`${mode}-otp`}>
                Verification code
              </label>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                Sent to {maskMobileNumber(normalizedMobile)}. Expires around {expiry}.
              </p>
            </div>
            <Button
              className="shrink-0 rounded px-2 py-1 text-sm font-medium underline underline-offset-4 disabled:opacity-60"
              disabled={isSubmitting}
              onClick={resetChallenge}
            >
              Change number
            </Button>
          </div>
          <input
            aria-describedby={`${mode}-otp-help ${mode}-form-message`}
            aria-invalid={Boolean(errorMessage)}
            autoComplete="one-time-code"
            className="min-h-12 w-full rounded-md border border-zinc-300 bg-transparent px-3 font-mono tracking-[0.35em] dark:border-zinc-700"
            disabled={isSubmitting}
            id={`${mode}-otp`}
            inputMode="numeric"
            maxLength={8}
            name="otp"
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
            pattern="[0-9]*"
            ref={otpInputRef}
            required
            value={otp}
          />
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400" id={`${mode}-otp-help`}>
            For your security, use this challenge until it expires before requesting another code.
          </p>
        </div>
      ) : null}

      <div
        aria-atomic="true"
        aria-live="polite"
        className="min-h-6 text-sm"
        id={`${mode}-form-message`}
      >
        {errorMessage ? (
          <p className="font-medium text-red-700 dark:text-red-300">{errorMessage}</p>
        ) : null}
        {!errorMessage && notice ? (
          <p className="text-zinc-700 dark:text-zinc-300">{notice}</p>
        ) : null}
      </div>

      <Button
        className="min-h-12 w-full rounded-md bg-zinc-950 px-4 font-semibold text-white hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting
          ? 'Please wait…'
          : challenge === null
            ? 'Request verification code'
            : 'Verify and continue'}
      </Button>
    </form>
  );
}
