'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type {
  PublicCity,
  PublicMasterService,
  PublicServiceCategory,
} from '@beautyathome/marketplace';

import { listCategories, listCities, listServices } from '@/lib/api/marketplace-client';

const cardGradients = [
  'from-[#f8dce6] to-[#f2c3d3]',
  'from-[#f4e4d7] to-[#e8cbb7]',
  'from-[#e9dff5] to-[#d7c4eb]',
  'from-[#dfeee9] to-[#c7dfd6]',
];

export function CustomerCatalogue() {
  const [cities, setCities] = useState<PublicCity[]>([]);
  const [categories, setCategories] = useState<PublicServiceCategory[]>([]);
  const [services, setServices] = useState<PublicMasterService[]>([]);
  const [cityId, setCityId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogueVersion, setCatalogueVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    // Reset request state when reloading the catalogue.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    void Promise.all([listCities(controller.signal), listCategories(undefined, controller.signal)])
      .then(([cityPage, categoryPage]) => {
        setCities(cityPage.data);
        setCategories(categoryPage.data);
        setCityId(cityPage.data[0]?.id ?? '');
        if (cityPage.data.length === 0) setLoading(false);
      })
      .catch(() => {
        setError('The service catalogue is temporarily unavailable.');
        setLoading(false);
      });

    return () => controller.abort();
  }, [catalogueVersion]);

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
  }, [categoryId, catalogueVersion, cityId, search]);

  function clearFilters(): void {
    setCategoryId('');
    setSearch('');
  }

  return (
    <main className="flex-1 bg-[#fffaf8] text-[#2f1b28] dark:bg-[#171014] dark:text-[#fff7fa]">
      <section className="border-b border-[#eadde3] bg-gradient-to-b from-[#f8e3eb] to-[#fffaf8] dark:border-[#3a2932] dark:from-[#351f2a] dark:to-[#171014]">
        <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a5d76] dark:text-[#e1a8bf]">
              Sikar service catalogue
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-6xl">
              Find the right care for your day.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#6c5661] dark:text-[#d7c4cc]">
              Browse approved at-home services, review duration and price guidance, then choose an
              eligible beauty professional.
            </p>
          </div>

          <section
            aria-label="Catalogue filters"
            className="mt-10 grid gap-4 rounded-[1.75rem] border border-white/80 bg-white/85 p-4 shadow-[0_20px_55px_rgba(76,43,58,0.1)] backdrop-blur sm:grid-cols-[0.8fr_0.9fr_1.3fr] sm:p-5 dark:border-[#513542] dark:bg-[#251820]/90"
          >
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#80566a] dark:text-[#d4a8ba]">
              City
              <select
                className="mt-2 min-h-12 w-full rounded-2xl border border-[#e0ccd5] bg-[#fffaf8] px-4 text-sm font-medium normal-case tracking-normal outline-none transition focus:border-[#a95c7a] dark:border-[#533945] dark:bg-[#1d1318]"
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

            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#80566a] dark:text-[#d4a8ba]">
              Category
              <select
                className="mt-2 min-h-12 w-full rounded-2xl border border-[#e0ccd5] bg-[#fffaf8] px-4 text-sm font-medium normal-case tracking-normal outline-none transition focus:border-[#a95c7a] dark:border-[#533945] dark:bg-[#1d1318]"
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

            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#80566a] dark:text-[#d4a8ba]">
              Search services
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a8798c]">
                  ⌕
                </span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-[#e0ccd5] bg-[#fffaf8] pl-10 pr-4 text-sm font-medium normal-case tracking-normal outline-none transition placeholder:text-[#a68b96] focus:border-[#a95c7a] dark:border-[#533945] dark:bg-[#1d1318]"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Hair, facial, makeup…"
                  type="search"
                  value={search}
                />
              </div>
            </label>
          </section>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a5d76] dark:text-[#e1a8bf]">
              Available services
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
              {loading
                ? 'Preparing your catalogue'
                : `${services.length} service${services.length === 1 ? '' : 's'} found`}
            </h2>
          </div>
          {categoryId || search ? (
            <button
              className="rounded-full border border-[#d9c1cb] px-4 py-2 text-sm font-semibold text-[#6f354e] transition hover:bg-[#f7e8ee] dark:border-[#583c49] dark:text-[#efb8cd] dark:hover:bg-[#302029]"
              onClick={clearFilters}
              type="button"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        {error ? (
          <div
            className="mt-8 flex flex-col gap-4 rounded-[1.5rem] border border-red-200 bg-red-50 p-6 text-red-800 sm:flex-row sm:items-center sm:justify-between dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
            role="alert"
          >
            <div>
              <p className="font-semibold">Catalogue could not be loaded</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
            <button
              className="rounded-full bg-red-800 px-5 py-2.5 text-sm font-semibold text-white dark:bg-red-200 dark:text-red-950"
              onClick={() => setCatalogueVersion((value) => value + 1)}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : null}

        {loading ? (
          <div
            aria-label="Loading approved services"
            className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div
                className="overflow-hidden rounded-[1.75rem] border border-[#eadde3] bg-white dark:border-[#3d2b34] dark:bg-[#21161c]"
                key={index}
              >
                <div className="h-32 animate-pulse bg-[#f3dfe7] dark:bg-[#3c2731]" />
                <div className="space-y-4 p-6">
                  <div className="h-3 w-24 animate-pulse rounded-full bg-[#ead9e0] dark:bg-[#49313c]" />
                  <div className="h-6 w-3/4 animate-pulse rounded-full bg-[#ead9e0] dark:bg-[#49313c]" />
                  <div className="h-16 animate-pulse rounded-2xl bg-[#f5e9ee] dark:bg-[#33222a]" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!loading && !error && services.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border border-dashed border-[#d8bdc8] bg-white p-8 text-center shadow-sm sm:p-12 dark:border-[#583c49] dark:bg-[#21161c]">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f5e2e9] text-xl text-[#7b3853] dark:bg-[#4b2c3a] dark:text-[#f2bfd3]">
              ✦
            </span>
            <h3 className="mt-5 text-xl font-semibold">No matching services yet</h3>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-[#715d67] dark:text-[#cdbac3]">
              We are onboarding the Sikar catalogue carefully. Try a broader search or remove the
              selected category.
            </p>
            <button
              className="mt-6 rounded-full bg-[#3b1d2d] px-6 py-3 text-sm font-semibold text-white dark:bg-[#f2c9d9] dark:text-[#321d28]"
              onClick={clearFilters}
              type="button"
            >
              Show all services
            </button>
          </div>
        ) : null}

        {!loading && services.length > 0 ? (
          <section aria-label="Services" className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <article
                className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-[#eadde3] bg-white shadow-[0_14px_40px_rgba(76,43,58,0.06)] transition hover:-translate-y-1 hover:border-[#d9b4c3] hover:shadow-[0_20px_48px_rgba(76,43,58,0.12)] dark:border-[#3d2b34] dark:bg-[#21161c]"
                key={service.id}
              >
                <div
                  className={`relative h-32 bg-gradient-to-br ${cardGradients[index % cardGradients.length]}`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.8),transparent_36%)]" />
                  <span className="absolute bottom-4 left-5 rounded-full bg-white/75 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#704254] backdrop-blur">
                    {service.category.name}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-xl font-semibold tracking-[-0.02em]">{service.name}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-[#715d67] dark:text-[#cdbac3]">
                    {service.description}
                  </p>

                  <dl className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-[#fff7fa] p-4 text-sm dark:bg-[#2c1d24]">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.1em] text-[#9a7484]">
                        Duration
                      </dt>
                      <dd className="mt-1 font-semibold">{service.defaultDurationMinutes} min</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.1em] text-[#9a7484]">
                        Price range
                      </dt>
                      <dd className="mt-1 font-semibold">
                        ₹{Math.round(service.cityPricePolicy.minimumPricePaise / 100)}
                        –₹
                        {Math.round(service.cityPricePolicy.maximumPricePaise / 100)}
                      </dd>
                    </div>
                  </dl>

                  <Link
                    className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-[#3b1d2d] px-5 text-sm font-semibold text-white transition group-hover:bg-[#54283d] dark:bg-[#f2c9d9] dark:text-[#321d28]"
                    href={`/services/${service.id}/professionals?cityId=${cityId}`}
                  >
                    View eligible professionals
                  </Link>
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </section>
    </main>
  );
}
