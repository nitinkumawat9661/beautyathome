import Link from 'next/link';
import type { Metadata } from 'next';

import { RoleGate } from '@/components/role-gate';

export const metadata: Metadata = {
  title: 'Professional workspace',
};

const professionalTasks = [
  {
    href: '/profile',
    title: 'Profile setup',
    description: 'Complete your professional details, service areas, portfolio, and certificates.',
  },
  {
    href: '/professional/services',
    title: 'Service management',
    description:
      'Choose approved services and keep your price, duration, and availability current.',
  },
  {
    href: '/professional/availability',
    title: 'Availability',
    description: 'Set weekly hours, date overrides, and unavailable dates.',
  },
  {
    href: '/professional/verification',
    title: 'Verification progress',
    description: 'Submit your application and review platform decisions or requested corrections.',
  },
] as const;

export default function ProfessionalWorkspacePage() {
  return (
    <RoleGate allowedRoles={['PROFESSIONAL']}>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Professional workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Prepare for marketplace work</h1>
        <p className="mt-3 max-w-2xl leading-7 text-zinc-600 dark:text-zinc-400">
          Complete each area below. Your services remain hidden until the platform approves your
          verification and service setup.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {professionalTasks.map((task) => (
            <Link
              className="rounded-xl border border-zinc-200 p-5 shadow-sm hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              href={task.href}
              key={task.href}
            >
              <h2 className="text-lg font-semibold">{task.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {task.description}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </RoleGate>
  );
}
