import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-16 sm:px-8 lg:py-24">
      <section aria-labelledby="home-title" className="max-w-3xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400">
          Sikar pilot
        </p>
        <h1 id="home-title" className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Beauty services at home, with clear platform safeguards.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
          Customers can book at-home beauty services, and beauty professionals can complete their
          onboarding and manage their profile through one secure account.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-zinc-950 px-5 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            href="/auth"
          >
            Customer or professional access
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-zinc-300 px-5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            href="/admin/sign-in"
          >
            Admin sign in
          </Link>
        </div>
      </section>
      <aside className="mt-12 border-l-4 border-zinc-900 pl-4 text-sm leading-6 text-zinc-600 dark:border-zinc-100 dark:text-zinc-400">
        Phase 1 is limited to Sikar. Professional applications require platform verification before
        services can be offered.
      </aside>
    </main>
  );
}
