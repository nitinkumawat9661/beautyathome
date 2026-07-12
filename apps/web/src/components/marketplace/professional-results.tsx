'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import type {
  PublicProfessionalProfile,
  PublicProfessionalService,
} from '@beautyathome/marketplace';

import { listProfessionals, listPublicProfessionalServices } from '@/lib/api/marketplace-client';

type Result = {
  profile: PublicProfessionalProfile;
  offering: PublicProfessionalService | null;
};

export function ProfessionalResults() {
  const params = useParams<{ serviceId: string }>();
  const searchParams = useSearchParams();
  const cityId = searchParams.get('cityId') ?? '';
  const [sort, setSort] = useState<'ratingDesc' | 'priceAsc' | 'experienceDesc'>('ratingDesc');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cityId || !params.serviceId) {
      // Invalid route inputs are represented as local display state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Choose a supported city and service first.');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void listProfessionals(
      { cityId, serviceId: params.serviceId, sort, limit: 100 },
      controller.signal,
    )
      .then(async (page) => {
        const enriched = await Promise.all(
          page.data.map(async (profile) => {
            const offerings = await listPublicProfessionalServices(
              profile.id,
              cityId,
              params.serviceId,
              controller.signal,
            );
            return { profile, offering: offerings.data[0] ?? null };
          }),
        );
        setResults(enriched);
      })
      .catch(() => setError('We could not load Professionals for this service.'))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [cityId, params.serviceId, sort]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
        Verified Professionals
      </p>
      <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Choose a Professional</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Only active, approved offerings within current price limits are shown.
          </p>
        </div>
        <label className="text-sm font-medium">
          Sort by
          <select
            className="ml-2 min-h-11 rounded-md border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
            onChange={(event) => setSort(event.target.value as typeof sort)}
            value={sort}
          >
            <option value="ratingDesc">Rating</option>
            <option value="priceAsc">Price</option>
            <option value="experienceDesc">Experience</option>
          </select>
        </label>
      </div>
      {error ? (
        <p className="mt-6 text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p aria-live="polite" className="mt-8 text-zinc-600 dark:text-zinc-400">
          Checking current eligibility and prices…
        </p>
      ) : null}
      {!loading && results.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
          No Professionals are currently available for this service.
        </p>
      ) : null}
      <section aria-label="Professional results" className="mt-8 space-y-4">
        {results.map(({ profile, offering }) => (
          <article
            className="rounded-xl border border-zinc-200 p-5 shadow-sm dark:border-zinc-800"
            key={profile.id}
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <h2 className="text-xl font-semibold">{profile.displayName}</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {profile.experienceYears} years experience · {profile.languageCodes.join(', ')}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {profile.biography}
                </p>
              </div>
              <dl className="grid min-w-40 grid-cols-2 gap-3 text-sm sm:block sm:space-y-2">
                <div>
                  <dt className="text-zinc-500">Rating</dt>
                  <dd className="font-semibold">
                    {profile.metrics.averageRating?.toFixed(1) ?? 'New'}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Completed</dt>
                  <dd className="font-semibold">{profile.metrics.completedJobs}</dd>
                </div>
                {offering ? (
                  <div>
                    <dt className="text-zinc-500">Price</dt>
                    <dd className="font-semibold">₹{(offering.pricePaise / 100).toFixed(0)}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
