'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type {
  PublicCity,
  PublicMasterService,
  PublicServiceCategory,
} from '@beautyathome/marketplace';

import { listCategories, listCities, listServices } from '@/lib/api/marketplace-client';

export function CustomerCatalogue() {
  const [cities, setCities] = useState<PublicCity[]>([]);
  const [categories, setCategories] = useState<PublicServiceCategory[]>([]);
  const [services, setServices] = useState<PublicMasterService[]>([]);
  const [cityId, setCityId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([listCities(controller.signal), listCategories(undefined, controller.signal)])
      .then(([cityPage, categoryPage]) => {
        setCities(cityPage.data);
        setCategories(categoryPage.data);
        setCityId(cityPage.data[0]?.id ?? '');
      })
      .catch(() => setError('The service catalogue is temporarily unavailable.'));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!cityId) return;
    const controller = new AbortController();
    // Reset request state when filter dependencies start a new fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    void listServices(
      {
        cityId,
        categoryId: categoryId || undefined,
        search: search.trim().length >= 2 ? search.trim() : undefined,
        sort: 'nameAsc',
        limit: 100,
      },
      controller.signal,
    )
      .then((page) => setServices(page.data))
      .catch(() => setError('We could not load services for this city.'))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [categoryId, cityId, search]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
        Sikar service catalogue
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Beauty services at home</h1>
      <p className="mt-3 max-w-2xl leading-7 text-zinc-600 dark:text-zinc-400">
        Browse platform-approved services and compare verified female Professionals.
      </p>

      <section
        aria-label="Catalogue filters"
        className="mt-8 grid gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-3"
      >
        <label className="text-sm font-medium">
          City
          <select
            className="mt-2 min-h-11 w-full rounded-md border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
            onChange={(event) => setCityId(event.target.value)}
            value={cityId}
          >
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}, {city.state}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Category
          <select
            className="mt-2 min-h-11 w-full rounded-md border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
            onChange={(event) => setCategoryId(event.target.value)}
            value={categoryId}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Search
          <input
            className="mt-2 min-h-11 w-full rounded-md border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Hair, facial, makeup…"
            type="search"
            value={search}
          />
        </label>
      </section>

      {error ? (
        <p className="mt-6 text-sm font-medium text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p aria-live="polite" className="mt-8 text-zinc-600 dark:text-zinc-400">
          Loading approved services…
        </p>
      ) : null}
      {!loading && services.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-zinc-300 p-6 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          No active services match these filters.
        </p>
      ) : null}

      <section aria-label="Services" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <article
            className="flex flex-col rounded-xl border border-zinc-200 p-5 shadow-sm dark:border-zinc-800"
            key={service.id}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {service.category.name}
            </p>
            <h2 className="mt-2 text-xl font-semibold">{service.name}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {service.description}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-zinc-500">Duration</dt>
                <dd className="font-medium">{service.defaultDurationMinutes} min</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Allowed price</dt>
                <dd className="font-medium">
                  ₹{Math.round(service.cityPricePolicy.minimumPricePaise / 100)}–₹
                  {Math.round(service.cityPricePolicy.maximumPricePaise / 100)}
                </dd>
              </div>
            </dl>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-950 px-4 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950"
              href={`/services/${service.id}/professionals?cityId=${cityId}`}
            >
              View Professionals
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
