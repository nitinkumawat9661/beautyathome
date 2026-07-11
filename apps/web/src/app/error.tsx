'use client';

import { Button } from '@beautyathome/ui';

export default function ApplicationError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 text-center sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        The page could not be completed safely. Try again, or return later if the problem continues.
      </p>
      <Button
        className="mt-6 min-h-12 rounded-md bg-zinc-950 px-5 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950"
        onClick={reset}
      >
        Try again
      </Button>
    </main>
  );
}
