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
  if (role !== 'CUSTOMER') {
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

function destinationForRole(role: OtpAuthRole): string {
  if (role === 'PROFESSIONAL') return '/professional';
  if (role === 'ADMIN' || role === 'SUPPORT' || role === 'FINANCE') return '/admin';
  return '/profile';
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
  const effectivePurpose: OtpPurpose = role === 'CUSTOMER' ? purpose : 'SIGN_IN';

  useEffect(() => {
    if (session.status === 'authenticated' && session.principal) {
      router.replace(destinationForRole(session.principal.activeRole));
    }
  }, [router, session.principal, session.status]);

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
      setNotice('If this mobile number is eligible, the latest verification code has been sent.');
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
      const response = await verifyOtp(buildOtpVerifyRequest(request, challenge.challengeId, otp));
      router.replace(destinationForRole(response.principal.activeRole));
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
    <form className="space-y-7" noValidate onSubmit={(event) => void handleSubmit(event)}>
      {mode === 'marketplace' ? (
        <fieldset disabled={challenge !== null || isSubmitting}>
          <legend className="mb-3 text-sm font-semibold">Continue as</legend>
          <div className="grid grid-cols-2 border border-[#d8c7ce] dark:border-[#49343e]">
            {(['CUSTOMER', 'PROFESSIONAL'] as const).map((option) => (
              <Button
                aria-checked={marketplaceRole === option}
                className={`min-h-12 px-3 text-sm font-medium transition ${
                  marketplaceRole === option
                    ? 'bg-[#3b1d2d] text-white dark:bg-[#f2cbd9] dark:text-[#321d28]'
                    : 'bg-transparent hover:bg-[#f5e9ed] dark:hover:bg-[#2b1e24]'
                }`}
                key={option}
                onClick={() => {
                  setMarketplaceRole(option);
                  if (option === 'PROFESSIONAL') setPurpose('SIGN_IN');
                  resetChallenge();
                }}
                role="radio"
                type="button"
              >
                {option === 'CUSTOMER' ? 'Customer' : 'Approved professional'}
              </Button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {mode === 'marketplace' && marketplaceRole === 'CUSTOMER' ? (
        <fieldset disabled={challenge !== null || isSubmitting}>
          <legend className="mb-3 text-sm font-semibold">Account action</legend>
          <div className="grid grid-cols-2 border border-[#d8c7ce] dark:border-[#49343e]">
            {(['SIGN_IN', 'SIGN_UP'] as const).map((option) => (
              <Button
                aria-checked={purpose === option}
                className={`min-h-11 px-3 text-sm transition ${
                  purpose === option
                    ? 'bg-[#f0dfe6] font-semibold text-[#3b1d2d] dark:bg-[#3a2730] dark:text-[#f5dce6]'
                    : 'bg-transparent hover:bg-[#f7eef1] dark:hover:bg-[#2b1e24]'
                }`}
                key={option}
                onClick={() => {
                  setPurpose(option);
                  resetChallenge();
                }}
                role="radio"
                type="button"
              >
                {option === 'SIGN_IN' ? 'Sign in' : 'Create customer account'}
              </Button>
            ))}
          </div>
        </fieldset>
      ) : mode === 'marketplace' ? (
        <p className="border-y border-[#ddd0d6] py-4 text-sm leading-6 text-[#715d67] dark:border-[#46333c] dark:text-[#cdbac3]">
          Professional access is sign-in only. The mobile number must already be approved and
          provisioned by platform operations.
        </p>
      ) : (
        <div className="space-y-3">
          <fieldset disabled={challenge !== null || isSubmitting}>
            <legend className="mb-3 text-sm font-semibold">Staff role</legend>
            <div className="grid grid-cols-3 border border-[#d8c7ce] dark:border-[#49343e]">
              {(['ADMIN', 'SUPPORT', 'FINANCE'] as const).map((option) => (
                <Button
                  aria-checked={staffRole === option}
                  className={`min-h-11 px-2 text-sm ${
                    staffRole === option
                      ? 'bg-zinc-950 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950'
                      : 'bg-transparent'
                  }`}
                  key={option}
                  onClick={() => {
                    setStaffRole(option);
                    resetChallenge();
                  }}
                  role="radio"
                  type="button"
                >
                  {option === 'ADMIN' ? 'Admin' : option === 'SUPPORT' ? 'Support' : 'Finance'}
                </Button>
              ))}
            </div>
          </fieldset>
          <p className="border-y border-zinc-200 py-4 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
            Staff access is sign-in only. Accounts and roles are provisioned by authorized platform
            operations.
          </p>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold" htmlFor={`${mode}-mobile`}>
          Mobile number
        </label>
        <input
          aria-describedby={`${mode}-mobile-help ${mode}-form-message`}
          aria-invalid={Boolean(errorMessage) && challenge === null}
          autoComplete="tel"
          className="min-h-12 w-full border border-[#d8c7ce] bg-transparent px-4 outline-none transition focus:border-[#8f526a] disabled:opacity-70 dark:border-[#49343e]"
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
          className="mt-2 text-xs leading-5 text-[#806b75] dark:text-[#bfaab4]"
          id={`${mode}-mobile-help`}
        >
          Indian mobile numbers only. Standard messaging rates may apply.
        </p>
      </div>

      {challenge !== null && normalizedMobile !== null ? (
        <div>
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <label className="block text-sm font-semibold" htmlFor={`${mode}-otp`}>
                Verification code
              </label>
              <p className="mt-1 text-xs text-[#806b75] dark:text-[#bfaab4]">
                Sent to {maskMobileNumber(normalizedMobile)}. Expires around {expiry}.
              </p>
            </div>
            <Button
              className="shrink-0 px-2 py-1 text-sm font-medium underline underline-offset-4 disabled:opacity-60"
              disabled={isSubmitting}
              onClick={resetChallenge}
              type="button"
            >
              Change number
            </Button>
          </div>
          <input
            aria-describedby={`${mode}-otp-help ${mode}-form-message`}
            aria-invalid={Boolean(errorMessage)}
            autoComplete="one-time-code"
            className="min-h-12 w-full border border-[#d8c7ce] bg-transparent px-4 font-mono tracking-[0.35em] outline-none transition focus:border-[#8f526a] dark:border-[#49343e]"
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
          <p className="mt-2 text-xs text-[#806b75] dark:text-[#bfaab4]" id={`${mode}-otp-help`}>
            Use this verification challenge until it expires before requesting another code.
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
          <p className="text-[#715d67] dark:text-[#cdbac3]">{notice}</p>
        ) : null}
      </div>

      <Button
        className="min-h-12 w-full bg-[#3b1d2d] px-4 font-semibold text-white transition hover:bg-[#52283d] disabled:cursor-wait disabled:opacity-60 dark:bg-[#f2cbd9] dark:text-[#321d28]"
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
