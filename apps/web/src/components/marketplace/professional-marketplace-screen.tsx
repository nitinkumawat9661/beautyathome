'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type {
  OwnAvailabilityResponse,
  OwnProfessionalService,
  ProfessionalOwnProfile,
  ProfessionalVerificationApplication,
  PublicCity,
  PublicMasterService,
} from '@beautyathome/marketplace';

import { RoleGate } from '@/components/role-gate';
import {
  getCurrentVerification,
  getOwnAvailability,
  getOwnProfessionalProfile,
  listCities,
  listOwnProfessionalServices,
  listServices,
  replaceDateOverrides,
  replaceWeeklyAvailability,
  resubmitVerification,
  submitVerification,
  upsertOwnProfessionalService,
} from '@/lib/api/marketplace-client';

type Mode = 'services' | 'availability' | 'verification';

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function ProfessionalMarketplaceScreen({ mode }: Readonly<{ mode: Mode }>) {
  const [profile, setProfile] = useState<ProfessionalOwnProfile | null>(null);
  const [cities, setCities] = useState<PublicCity[]>([]);
  const [catalogue, setCatalogue] = useState<PublicMasterService[]>([]);
  const [offerings, setOfferings] = useState<OwnProfessionalService[]>([]);
  const [availability, setAvailability] = useState<OwnAvailabilityResponse | null>(null);
  const [verification, setVerification] = useState<ProfessionalVerificationApplication | null>(
    null,
  );
  const [cityId, setCityId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [priceRupees, setPriceRupees] = useState('');
  const [duration, setDuration] = useState('60');
  const [weekday, setWeekday] = useState<
    'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
  >('MONDAY');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [unavailableDate, setUnavailableDate] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [ownProfile, cityPage] = await Promise.all([getOwnProfessionalProfile(), listCities()]);
    setProfile(ownProfile);
    setCities(cityPage.data);
    const selectedCity = cityId || cityPage.data[0]?.id || '';
    setCityId(selectedCity);
    if (mode === 'services' && selectedCity) {
      const [servicePage, ownPage] = await Promise.all([
        listServices({ cityId: selectedCity, sort: 'nameAsc', limit: 100 }),
        listOwnProfessionalServices(),
      ]);
      setCatalogue(servicePage.data);
      setOfferings(ownPage.data);
      setServiceId((current) => current || servicePage.data[0]?.id || '');
    }
    if (mode === 'availability') {
      setAvailability(await getOwnAvailability(isoDate(), isoDate(92)));
    }
    if (mode === 'verification') {
      setVerification(await getCurrentVerification());
    }
  }, [cityId, mode]);

  useEffect(() => {
    // The async loader owns the related remote-resource state updates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch(() => setMessage('Unable to load this workspace.'));
  }, [load]);

  async function saveService(event: FormEvent) {
    event.preventDefault();
    const selectedCityId = cities.find((city) => city.id === cityId)?.id;
    if (!selectedCityId) return;
    const existing = offerings.find((item) => item.masterService.id === serviceId);
    setBusy(true);
    setMessage('');
    try {
      await upsertOwnProfessionalService(serviceId, {
        cityId: selectedCityId,
        pricePaise: Math.round(Number(priceRupees) * 100),
        estimatedDurationMinutes: Number(duration),
        isEnabled: true,
        portfolioImages: [],
        expectedVersion: existing?.version,
      });
      setMessage(existing ? 'Service updated.' : 'Service added.');
      await load();
    } catch {
      setMessage('Service could not be saved. Check the platform price limits.');
    } finally {
      setBusy(false);
    }
  }

  async function saveWeekly(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      setAvailability(
        await replaceWeeklyAvailability({
          timeZone: 'Asia/Kolkata',
          rules: [{ weekday, startLocalTime: startTime, endLocalTime: endTime }],
          expectedVersion: availability?.schedule?.version,
        }),
      );
      setMessage('Weekly availability saved in Asia/Kolkata.');
    } catch {
      setMessage('Availability could not be saved. Check for overlapping or invalid times.');
    } finally {
      setBusy(false);
    }
  }

  async function blockDate(event: FormEvent) {
    event.preventDefault();
    if (!unavailableDate) return;
    setBusy(true);
    try {
      setAvailability(
        await replaceDateOverrides({
          timeZone: 'Asia/Kolkata',
          overrides: [{ date: unavailableDate, kind: 'UNAVAILABLE', reason: 'Not available' }],
          expectedVersion: availability?.schedule?.version,
        }),
      );
      setMessage('Unavailable date saved.');
    } catch {
      setMessage('The unavailable date could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function applyForVerification() {
    if (!profile) return;
    setBusy(true);
    try {
      setVerification(
        verification?.correctionAllowed
          ? await resubmitVerification(verification.id)
          : await submitVerification({
              eligibilityPolicyVersionAcknowledged: 'PHASE_1_V1',
              eligibilityDeclarationAccepted: true,
              certificateIds: profile.certificates.map((certificate) => certificate.id),
              expectedProfileVersion: profile.version,
            }),
      );
      setMessage('Verification application submitted.');
    } catch {
      setMessage('Complete your profile and required evidence before submitting.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <RoleGate allowedRoles={['PROFESSIONAL']}>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Professional workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {mode === 'services'
            ? 'Service management'
            : mode === 'availability'
              ? 'Availability management'
              : 'Verification progress'}
        </h1>
        {message ? (
          <p className="mt-4 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-900" role="status">
            {message}
          </p>
        ) : null}

        {mode === 'services' ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <form
              className="space-y-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
              onSubmit={saveService}
            >
              <h2 className="text-xl font-semibold">Add or update an approved service</h2>
              <label className="block text-sm font-medium">
                City
                <select
                  className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                  onChange={(event) => setCityId(event.target.value)}
                  value={cityId}
                >
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Master service
                <select
                  className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                  onChange={(event) => setServiceId(event.target.value)}
                  value={serviceId}
                >
                  {catalogue.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Price (₹)
                <input
                  className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                  min="1"
                  onChange={(event) => setPriceRupees(event.target.value)}
                  required
                  type="number"
                  value={priceRupees}
                />
              </label>
              <label className="block text-sm font-medium">
                Estimated duration (minutes)
                <input
                  className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                  min="5"
                  onChange={(event) => setDuration(event.target.value)}
                  required
                  type="number"
                  value={duration}
                />
              </label>
              <button
                className="min-h-11 rounded-md bg-zinc-950 px-4 font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950"
                disabled={busy || !serviceId}
                type="submit"
              >
                Save service
              </button>
            </form>
            <section aria-label="Configured services">
              <h2 className="text-xl font-semibold">Your services</h2>
              <div className="mt-4 space-y-3">
                {offerings.map((item) => (
                  <article className="rounded-xl border p-4" key={item.id}>
                    <h3 className="font-semibold">{item.masterService.name}</h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      ₹{item.pricePaise / 100} · {item.estimatedDurationMinutes} min · {item.state}
                    </p>
                    {item.userSafeAdminReason ? (
                      <p className="mt-2 text-sm text-red-700">
                        Admin note: {item.userSafeAdminReason}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {mode === 'availability' ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <form className="space-y-4 rounded-xl border p-5" onSubmit={saveWeekly}>
              <h2 className="text-xl font-semibold">Weekly hours</h2>
              <p className="text-sm text-zinc-600">
                Times are stored with the Asia/Kolkata timezone and converted safely by the API.
              </p>
              <label className="block text-sm font-medium">
                Weekday
                <select
                  className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                  onChange={(event) => setWeekday(event.target.value as typeof weekday)}
                  value={weekday}
                >
                  {[
                    'MONDAY',
                    'TUESDAY',
                    'WEDNESDAY',
                    'THURSDAY',
                    'FRIDAY',
                    'SATURDAY',
                    'SUNDAY',
                  ].map((day) => (
                    <option key={day}>{day}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Start
                <input
                  className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                  onChange={(event) => setStartTime(event.target.value)}
                  type="time"
                  value={startTime}
                />
              </label>
              <label className="block text-sm font-medium">
                End
                <input
                  className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                  onChange={(event) => setEndTime(event.target.value)}
                  type="time"
                  value={endTime}
                />
              </label>
              <button
                className="min-h-11 rounded-md bg-zinc-950 px-4 text-white"
                disabled={busy}
                type="submit"
              >
                Save weekly hours
              </button>
            </form>
            <form className="space-y-4 rounded-xl border p-5" onSubmit={blockDate}>
              <h2 className="text-xl font-semibold">Unavailable date</h2>
              <label className="block text-sm font-medium">
                Date
                <input
                  className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                  min={isoDate()}
                  onChange={(event) => setUnavailableDate(event.target.value)}
                  required
                  type="date"
                  value={unavailableDate}
                />
              </label>
              <button
                className="min-h-11 rounded-md border px-4 font-semibold"
                disabled={busy}
                type="submit"
              >
                Mark unavailable
              </button>
              <p className="text-sm text-zinc-600">
                {availability?.schedule?.rules.length ?? 0} weekly rules and{' '}
                {availability?.schedule?.overrides.length ?? 0} date overrides configured.
              </p>
            </form>
          </div>
        ) : null}

        {mode === 'verification' ? (
          <section className="mt-8 max-w-2xl rounded-xl border p-5">
            <h2 className="text-xl font-semibold">Application status</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-zinc-500">Verification</dt>
                <dd className="font-semibold">
                  {verification?.status ?? profile?.verificationStatus ?? 'NOT_SUBMITTED'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Launch eligibility</dt>
                <dd className="font-semibold">
                  {profile?.launchEligibility.status ?? 'NOT_ASSESSED'}
                </dd>
              </div>
            </dl>
            {verification?.userSafeDecisionReason ? (
              <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                Admin feedback: {verification.userSafeDecisionReason}
              </p>
            ) : null}
            <button
              className="mt-5 min-h-11 rounded-md bg-zinc-950 px-4 font-semibold text-white disabled:opacity-50"
              disabled={
                busy ||
                (verification !== null &&
                  verification.status !== 'DRAFT' &&
                  !verification.correctionAllowed)
              }
              onClick={() => void applyForVerification()}
              type="button"
            >
              {verification?.correctionAllowed ? 'Resubmit for review' : 'Submit for verification'}
            </button>
          </section>
        ) : null}
      </main>
    </RoleGate>
  );
}
