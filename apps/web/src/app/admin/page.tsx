import Link from 'next/link';
import type { Metadata } from 'next';

import { RoleGate } from '@/components/role-gate';

export const metadata: Metadata = {
  title: 'Admin workspace',
};

const adminTasks = [
  {
    href: '/admin/services',
    title: 'Service catalogue',
    description: 'Manage categories, master services, city access, and price boundaries.',
  },
  {
    href: '/admin/service-requests',
    title: 'Service requests',
    description: 'Review missing-service requests and record approval or rejection decisions.',
  },
  {
    href: '/admin/professionals',
    title: 'Professional verification',
    description: 'Review applications, request corrections, and manage verification status.',
  },
] as const;

export default function AdminWorkspacePage() {
  return (
    <RoleGate allowedRoles={['ADMIN']} signInPath="/admin/sign-in">
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Admin workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Marketplace controls</h1>
        <p className="mt-3 max-w-2xl leading-7 text-zinc-600 dark:text-zinc-400">
          Privileged actions require an explicit reason and are recorded in the audit history.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {adminTasks.map((task) => (
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
