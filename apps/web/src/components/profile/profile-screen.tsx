'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { Button } from '@beautyathome/ui';
import { isOperationalRole } from '@beautyathome/auth';

import { useAuthSession } from '@/components/auth-provider';
import {
  getCurrentPrincipal,
  logoutAllSessions,
  patchCustomerProfile,
  profileErrorMessage,
} from '@/lib/api/api-client';
import {
  getAdminProfile,
  getProfessionalProfile,
  patchAdminProfile,
  patchProfessionalProfile,
  type ProfessionalProfileView,
} from '@/lib/api/profile-client';

function nullableTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function statusLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function ProfileScreen() {
  const session = useAuthSession();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [biography, setBiography] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [professionalProfile, setProfessionalProfile] = useState<ProfessionalProfileView | null>(
    null,
  );
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === 'unauthenticated') {
      router.replace('/auth');
    }
  }, [router, session.status]);

  useEffect(() => {
    if (session.status !== 'authenticated' || session.principal === null) {
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();
    const principal = session.principal;

    async function loadProfile(): Promise<void> {
      setIsLoadingProfile(true);
      setProfileLoaded(false);
      setProfessionalProfile(null);
      setErrorMessage(null);

      try {
        if (principal.activeRole === 'PROFESSIONAL') {
          const profile = await getProfessionalProfile(abortController.signal);
          if (!cancelled) {
            setProfessionalProfile(profile);
            setDisplayName(profile.displayName ?? '');
            setBiography(profile.biography ?? '');
            setExperienceYears(profile.experienceYears?.toString() ?? '');
            setProfileLoaded(true);
          }
        } else if (isOperationalRole(principal.activeRole)) {
          const profile = await getAdminProfile(abortController.signal);
          if (!cancelled) {
            setDisplayName(profile.displayName ?? '');
            setProfileLoaded(true);
          }
        } else if (principal.activeRole === 'CUSTOMER' && !cancelled) {
          setDisplayName(
            principal.profile.role === 'CUSTOMER' ? (principal.profile.displayName ?? '') : '',
          );
          setProfileLoaded(true);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setErrorMessage(profileErrorMessage(error, 'load'));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [loadAttempt, session.principal, session.status]);

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const nextDisplayName = nullableTrimmed(displayName);
    if (nextDisplayName !== null && nextDisplayName.length > 100) {
      setErrorMessage('Display name must be 100 characters or fewer.');
      return;
    }

    if (session.status !== 'authenticated' || session.principal === null) {
      setErrorMessage('Your session has expired. Sign in again to continue.');
      return;
    }
    if (!profileLoaded || session.principal.user.status !== 'ACTIVE') {
      setErrorMessage('This profile cannot be changed in the current account state.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setNotice(null);

    try {
      if (session.principal.activeRole === 'PROFESSIONAL') {
        const nextBiography = nullableTrimmed(biography);
        if (nextBiography !== null && nextBiography.length > 1000) {
          setErrorMessage('Biography must be 1,000 characters or fewer.');
          return;
        }

        const nextExperienceYears = experienceYears.trim() === '' ? null : Number(experienceYears);
        if (
          nextExperienceYears !== null &&
          (!Number.isInteger(nextExperienceYears) ||
            nextExperienceYears < 0 ||
            nextExperienceYears > 80)
        ) {
          setErrorMessage('Experience must be a whole number from 0 to 80.');
          return;
        }

        const profile = await patchProfessionalProfile({
          displayName: nextDisplayName,
          biography: nextBiography,
          experienceYears: nextExperienceYears,
        });
        setProfessionalProfile(profile);
      } else if (isOperationalRole(session.principal.activeRole)) {
        await patchAdminProfile(nextDisplayName);
      } else if (session.principal.activeRole === 'CUSTOMER') {
        await patchCustomerProfile(nextDisplayName);
      } else {
        throw new Error('Unsupported profile role');
      }

      setNotice('Your profile was saved.');
      void getCurrentPrincipal().catch(() => undefined);
    } catch (error: unknown) {
      setErrorMessage(profileErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRevokeAll(): Promise<void> {
    if (!confirmRevokeAll) {
      setConfirmRevokeAll(true);
      return;
    }

    setIsRevoking(true);
    setErrorMessage(null);

    try {
      await logoutAllSessions();
      router.replace('/auth');
    } catch (error: unknown) {
      setErrorMessage(profileErrorMessage(error));
      setConfirmRevokeAll(false);
    } finally {
      setIsRevoking(false);
    }
  }

  if (session.status === 'loading') {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p aria-live="polite" className="mt-4 text-zinc-600 dark:text-zinc-400">
          Loading your secure profile…
        </p>
      </main>
    );
  }

  if (session.status === 'unavailable') {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Session temporarily unavailable</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          We could not confirm your secure session. Retry when the API connection is available.
        </p>
        <Button
          className="mt-6 min-h-11 rounded-md border border-zinc-300 px-4 font-medium dark:border-zinc-700"
          onClick={() => window.location.reload()}
        >
          Retry session
        </Button>
      </main>
    );
  }

  if (session.status !== 'authenticated' || session.principal === null) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Sign in required</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Redirecting you to secure mobile verification…
        </p>
      </main>
    );
  }

  if (isLoadingProfile) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p aria-live="polite" className="mt-4 text-zinc-600 dark:text-zinc-400">
          Loading your secure profile…
        </p>
      </main>
    );
  }

  if (!profileLoaded) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Profile unavailable</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400" role="alert">
          {errorMessage ?? 'We could not load an authoritative copy of your profile.'}
        </p>
        <Button
          className="mt-6 min-h-11 rounded-md border border-zinc-300 px-4 font-medium dark:border-zinc-700"
          onClick={() => setLoadAttempt((attempt) => attempt + 1)}
        >
          Try again
        </Button>
      </main>
    );
  }

  const { principal } = session;
  const isProfessional = principal.activeRole === 'PROFESSIONAL';
  const canEditProfile = principal.user.status === 'ACTIVE';

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          {statusLabel(principal.activeRole)} account
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-zinc-300 px-3 py-1 dark:border-zinc-700">
            {principal.user.mobileNumberMasked}
          </span>
          <span className="rounded-full border border-zinc-300 px-3 py-1 dark:border-zinc-700">
            Account: {statusLabel(principal.user.status)}
          </span>
          {professionalProfile ? (
            <span className="rounded-full border border-zinc-300 px-3 py-1 dark:border-zinc-700">
              Verification: {statusLabel(professionalProfile.verificationStatus)}
            </span>
          ) : null}
        </div>
      </header>

      {isProfessional && professionalProfile && !professionalProfile.isServiceActive ? (
        <section className="mb-6 rounded-md border border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 dark:border-zinc-700 dark:bg-zinc-900">
          Your professional profile is not active for services yet. Complete the required onboarding
          and verification steps before accepting bookings.
        </section>
      ) : null}

      <section
        aria-labelledby="profile-details"
        className="rounded-xl border border-zinc-200 p-5 shadow-sm dark:border-zinc-800 sm:p-7"
      >
        <h2 className="text-xl font-semibold" id="profile-details">
          Profile details
        </h2>
        {!canEditProfile ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Profile changes are unavailable while this account is suspended.
          </p>
        ) : null}
        <form className="mt-6 space-y-6" noValidate onSubmit={(event) => void handleSave(event)}>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="displayName">
              Display name
            </label>
            <input
              aria-describedby="profile-form-message"
              aria-invalid={Boolean(errorMessage)}
              autoComplete="name"
              className="min-h-12 w-full rounded-md border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
              disabled={!canEditProfile || isSaving}
              id="displayName"
              maxLength={100}
              onChange={(event) => setDisplayName(event.target.value)}
              value={displayName}
            />
          </div>

          {isProfessional ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="biography">
                  Professional biography
                </label>
                <textarea
                  aria-describedby="biography-help profile-form-message"
                  aria-invalid={Boolean(errorMessage)}
                  className="min-h-32 w-full resize-y rounded-md border border-zinc-300 bg-transparent p-3 dark:border-zinc-700"
                  disabled={!canEditProfile || isSaving}
                  id="biography"
                  maxLength={1000}
                  onChange={(event) => setBiography(event.target.value)}
                  value={biography}
                />
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400" id="biography-help">
                  Do not include phone numbers or direct contact details.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="experienceYears">
                  Years of experience
                </label>
                <input
                  aria-describedby="profile-form-message"
                  aria-invalid={Boolean(errorMessage)}
                  className="min-h-12 w-full rounded-md border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
                  disabled={!canEditProfile || isSaving}
                  id="experienceYears"
                  inputMode="numeric"
                  max={80}
                  min={0}
                  onChange={(event) => setExperienceYears(event.target.value)}
                  step={1}
                  type="number"
                  value={experienceYears}
                />
              </div>
            </>
          ) : null}

          <div
            aria-atomic="true"
            aria-live="polite"
            className="min-h-6 text-sm"
            id="profile-form-message"
          >
            {errorMessage ? (
              <p className="font-medium text-red-700 dark:text-red-300">{errorMessage}</p>
            ) : null}
            {!errorMessage && notice ? (
              <p className="text-zinc-700 dark:text-zinc-300">{notice}</p>
            ) : null}
          </div>

          <Button
            className="min-h-12 rounded-md bg-zinc-950 px-5 font-semibold text-white hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            disabled={!canEditProfile || isSaving}
            type="submit"
          >
            {isSaving ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </section>

      <section
        aria-labelledby="session-security"
        className="mt-6 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800 sm:p-7"
      >
        <h2 className="text-xl font-semibold" id="session-security">
          Session security
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Sign out every active session if you no longer recognize a device or believe your account
          may be at risk.
        </p>
        <Button
          className="mt-4 min-h-11 rounded-md border border-red-300 px-4 font-medium text-red-800 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950"
          disabled={isRevoking}
          onClick={() => void handleRevokeAll()}
        >
          {isRevoking
            ? 'Signing out…'
            : confirmRevokeAll
              ? 'Confirm sign out everywhere'
              : 'Sign out everywhere'}
        </Button>
        {confirmRevokeAll && !isRevoking ? (
          <Button
            className="ml-2 min-h-11 rounded-md px-4 font-medium underline underline-offset-4"
            onClick={() => setConfirmRevokeAll(false)}
          >
            Cancel
          </Button>
        ) : null}
      </section>
    </main>
  );
}
