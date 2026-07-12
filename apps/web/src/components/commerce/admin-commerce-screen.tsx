'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { BookingStatus, BookingView } from '@beautyathome/booking';
import { RoleGate } from '@/components/role-gate';
import {
  adminRecords,
  createCommissionRule,
  decideAdminRecord,
  listBookings,
  overrideBooking,
} from '@/lib/api/commerce-client';

type Mode =
  | 'bookings'
  | 'payment-attempts'
  | 'refunds'
  | 'wallet-entries'
  | 'withdrawals'
  | 'commission-rules'
  | 'disputes';
export function AdminCommerceScreen({ mode }: Readonly<{ mode: Mode }>) {
  const [bookings, setBookings] = useState<BookingView[]>([]);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [message, setMessage] = useState('');
  const [rate, setRate] = useState('20');
  const [fixedFee, setFixedFee] = useState('0');
  const load = useCallback(async () => {
    if (mode === 'bookings') setBookings(await listBookings('admin'));
    else if (mode === 'disputes') setBookings(await listBookings('admin', 'DISPUTED'));
    else setRecords(await adminRecords(mode));
  }, [mode]);
  useEffect(() => {
    const timeout = window.setTimeout(
      () => void load().catch(() => setMessage('Unable to load this admin commerce view.')),
      0,
    );
    return () => window.clearTimeout(timeout);
  }, [load]);
  async function decide(
    resource: 'refunds' | 'withdrawals',
    record: Record<string, unknown>,
    action: 'APPROVE' | 'REJECT' | 'RETRY',
  ) {
    try {
      await decideAdminRecord(resource, String(record.id), action, String(record.status));
      setMessage(`${resource} decision recorded.`);
      await load();
    } catch {
      setMessage('Decision failed or requires recent admin verification.');
    }
  }
  async function commission(event: FormEvent) {
    event.preventDefault();
    try {
      await createCommissionRule({
        rateBasisPoints: Math.round(Number(rate) * 100),
        fixedFeePaise: Math.round(Number(fixedFee) * 100),
        effectiveFrom: new Date().toISOString(),
        priority: 0,
      });
      setMessage('Commission rule created with an effective-date snapshot.');
      await load();
    } catch {
      setMessage('Commission rule could not be created.');
    }
  }
  async function override(item: BookingView, toStatus: BookingStatus) {
    try {
      await overrideBooking(item.id, toStatus, item.version);
      setMessage('Audited booking override recorded.');
      await load();
    } catch {
      setMessage('Invalid transition or recent verification required.');
    }
  }
  const title: Record<Mode, string> = {
    bookings: 'Booking management and timelines',
    'payment-attempts': 'Payment attempts',
    refunds: 'Refund management',
    'wallet-entries': 'Wallet ledger',
    withdrawals: 'Withdrawal review',
    'commission-rules': 'Commission rules',
    disputes: 'Disputed bookings',
  };
  return (
    <RoleGate allowedRoles={['ADMIN']} signInPath="/admin/sign-in">
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Admin commerce
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{title[mode]}</h1>
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Commerce administration">
          {Object.entries(title).map(([key, label]) => (
            <Link
              className="rounded-md border px-3 py-2 text-sm"
              href={`/admin/${key === 'payment-attempts' ? 'payments' : key === 'wallet-entries' ? 'wallet' : key}`}
              key={key}
            >
              {label}
            </Link>
          ))}
        </nav>
        {message ? (
          <p className="mt-4 rounded-md bg-zinc-100 p-3 text-sm" role="status">
            {message}
          </p>
        ) : null}
        {mode === 'bookings' || mode === 'disputes' ? (
          <section className="mt-8 space-y-3">
            {bookings.map((item) => (
              <article className="rounded-xl border p-4" key={item.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{item.serviceNameSnapshot}</h2>
                    <p className="text-sm text-zinc-600">
                      {item.status} · {item.scheduledStart.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <Link className="rounded-md border px-3 py-2" href={`/admin/bookings/${item.id}`}>
                    Audit timeline
                  </Link>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    className="min-h-11 rounded-md border px-3"
                    onClick={() => void override(item, 'DISPUTED')}
                  >
                    Mark disputed
                  </button>
                  {item.status === 'REFUND_PENDING' ? (
                    <button
                      className="min-h-11 rounded-md border px-3"
                      onClick={() => void override(item, 'REFUNDED')}
                    >
                      Mark refunded
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        ) : null}
        {mode === 'commission-rules' ? (
          <form className="mt-8 grid max-w-xl gap-4 rounded-xl border p-5" onSubmit={commission}>
            <label>
              Commission percentage
              <input
                className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                max="100"
                min="0"
                onChange={(e) => setRate(e.target.value)}
                type="number"
                value={rate}
              />
            </label>
            <label>
              Fixed fee (₹)
              <input
                className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                min="0"
                onChange={(e) => setFixedFee(e.target.value)}
                type="number"
                value={fixedFee}
              />
            </label>
            <button className="min-h-11 rounded-md bg-zinc-950 px-3 text-white">
              Create effective rule
            </button>
          </form>
        ) : null}
        {mode !== 'bookings' && mode !== 'disputes' ? (
          <section className="mt-8 space-y-3">
            {records.map((record, index) => (
              <article className="rounded-xl border p-4" key={String(record.id ?? index)}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <pre className="max-w-full overflow-auto text-xs">
                    {JSON.stringify(record, null, 2)}
                  </pre>
                  {mode === 'refunds' || mode === 'withdrawals' ? (
                    <div className="flex gap-2">
                      <button
                        className="min-h-11 rounded-md bg-zinc-950 px-3 text-white"
                        onClick={() => void decide(mode, record, 'APPROVE')}
                      >
                        Approve
                      </button>
                      <button
                        className="min-h-11 rounded-md border px-3"
                        onClick={() => void decide(mode, record, 'REJECT')}
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </main>
    </RoleGate>
  );
}
