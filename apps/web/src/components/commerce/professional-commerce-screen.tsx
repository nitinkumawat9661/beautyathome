'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { BookingView, WalletView } from '@beautyathome/booking';
import { RoleGate } from '@/components/role-gate';
import {
  createPayoutAccount,
  getWallet,
  issueServiceOtp,
  listBookings,
  listPayoutAccounts,
  listWithdrawals,
  professionalAction,
  professionalDecision,
  requestWithdrawal,
  verifyServiceOtp,
} from '@/lib/api/commerce-client';

export function ProfessionalCommerceScreen({ mode }: Readonly<{ mode: 'bookings' | 'earnings' }>) {
  const [bookings, setBookings] = useState<BookingView[]>([]);
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [payouts, setPayouts] = useState<Record<string, unknown>[]>([]);
  const [withdrawals, setWithdrawals] = useState<Record<string, unknown>[]>([]);
  const [accountReference, setAccountReference] = useState('');
  const [maskedLabel, setMaskedLabel] = useState('Bank account ending 0000');
  const [amount, setAmount] = useState('500');
  const [challengeId, setChallengeId] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const load = useCallback(async () => {
    if (mode === 'bookings') setBookings(await listBookings('professional'));
    else {
      const [walletView, payoutList, withdrawalList] = await Promise.all([
        getWallet(),
        listPayoutAccounts(),
        listWithdrawals('professional'),
      ]);
      setWallet(walletView);
      setPayouts(payoutList);
      setWithdrawals(withdrawalList);
    }
  }, [mode]);
  useEffect(() => {
    const timeout = window.setTimeout(
      () =>
        void load().catch(() => setMessage('Unable to load the Professional commerce workspace.')),
      0,
    );
    return () => window.clearTimeout(timeout);
  }, [load]);
  async function decide(item: BookingView, action: 'accept' | 'reject') {
    setBusyId(item.id);
    try {
      await professionalDecision(item.id, action, item.version);
      setMessage(`Request ${action}ed.`);
      await load();
    } catch {
      setMessage('The request changed or is no longer actionable.');
    } finally {
      setBusyId('');
    }
  }
  async function advance(item: BookingView, action: 'en-route' | 'arrived') {
    setBusyId(item.id);
    try {
      await professionalAction(item.id, action, item.version);
      await load();
    } catch {
      setMessage('This status action is not allowed yet.');
    } finally {
      setBusyId('');
    }
  }
  async function issue(item: BookingView, purpose: 'start' | 'completion') {
    const response = await issueServiceOtp(item.id, purpose);
    setChallengeId(String(response.id ?? ''));
    setMessage(`${purpose} OTP sent to the customer secure channel.`);
  }
  async function verify(item: BookingView, purpose: 'start' | 'completion') {
    try {
      await verifyServiceOtp(item.id, purpose, {
        challengeId,
        code: otp,
        expectedVersion: item.version,
      });
      setMessage(`${purpose} OTP verified.`);
      await load();
    } catch {
      setMessage('OTP is invalid, expired, used, or attempt-limited.');
    }
  }
  async function addPayout(event: FormEvent) {
    event.preventDefault();
    try {
      await createPayoutAccount(accountReference, maskedLabel);
      setMessage('Mock payout account verified and tokenized.');
      await load();
    } catch {
      setMessage('Payout account could not be added.');
    }
  }
  async function withdraw(event: FormEvent) {
    event.preventDefault();
    const payoutId = String(payouts[0]?.id ?? '');
    try {
      await requestWithdrawal(payoutId, Math.round(Number(amount) * 100), crypto.randomUUID());
      setMessage('Withdrawal requested and available funds reserved.');
      await load();
    } catch {
      setMessage('Withdrawal requires at least ₹500 and sufficient available balance.');
    }
  }
  return (
    <RoleGate allowedRoles={['PROFESSIONAL']}>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Professional commerce
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {mode === 'bookings'
            ? 'Incoming requests and schedule'
            : 'Earnings, wallet and withdrawals'}
        </h1>
        {message ? (
          <p className="mt-4 rounded-md bg-zinc-100 p-3 text-sm" role="status">
            {message}
          </p>
        ) : null}
        {mode === 'bookings' ? (
          <section className="mt-8 space-y-4">
            {bookings.map((item) => (
              <article className="rounded-xl border p-5" key={item.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{item.serviceNameSnapshot}</h2>
                    <p className="text-sm text-zinc-600">
                      {item.status} · {item.scheduledStart.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <p>₹{item.servicePricePaise / 100}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.status === 'REQUESTED' ? (
                    <>
                      <button
                        className="min-h-11 rounded-md bg-zinc-950 px-3 text-white"
                        disabled={busyId === item.id}
                        onClick={() => void decide(item, 'accept')}
                      >
                        Accept
                      </button>
                      <button
                        className="min-h-11 rounded-md border px-3"
                        disabled={busyId === item.id}
                        onClick={() => void decide(item, 'reject')}
                      >
                        Decline
                      </button>
                    </>
                  ) : null}
                  {item.status === 'CONFIRMED' ? (
                    <button
                      className="min-h-11 rounded-md border px-3"
                      onClick={() => void advance(item, 'en-route')}
                    >
                      Mark en route
                    </button>
                  ) : null}
                  {item.status === 'EN_ROUTE' ? (
                    <button
                      className="min-h-11 rounded-md border px-3"
                      onClick={() => void advance(item, 'arrived')}
                    >
                      Mark arrived
                    </button>
                  ) : null}
                  {item.status === 'ARRIVED' ? (
                    <button
                      className="min-h-11 rounded-md border px-3"
                      onClick={() => void issue(item, 'start')}
                    >
                      Send start OTP
                    </button>
                  ) : null}
                  {item.status === 'IN_PROGRESS' ? (
                    <button
                      className="min-h-11 rounded-md border px-3"
                      onClick={() => void issue(item, 'completion')}
                    >
                      Send completion OTP
                    </button>
                  ) : null}
                </div>
                {item.status === 'START_OTP_PENDING' || item.status === 'COMPLETION_OTP_PENDING' ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <input
                      className="min-h-11 rounded-md border bg-transparent px-3"
                      onChange={(e) => setChallengeId(e.target.value)}
                      placeholder="Challenge ID"
                      value={challengeId}
                    />
                    <input
                      className="min-h-11 rounded-md border bg-transparent px-3"
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Customer OTP"
                      value={otp}
                    />
                    <button
                      className="min-h-11 rounded-md bg-zinc-950 px-3 text-white"
                      onClick={() =>
                        void verify(
                          item,
                          item.status === 'START_OTP_PENDING' ? 'start' : 'completion',
                        )
                      }
                    >
                      Verify OTP
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}
        {mode === 'earnings' ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border p-5">
              <h2 className="text-xl font-semibold">Wallet</h2>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-zinc-500">Pending clearance</dt>
                  <dd className="text-2xl font-semibold">₹{(wallet?.pendingPaise ?? 0) / 100}</dd>
                </div>
                <div>
                  <dt className="text-sm text-zinc-500">Available</dt>
                  <dd className="text-2xl font-semibold">₹{(wallet?.availablePaise ?? 0) / 100}</dd>
                </div>
              </dl>
              <h3 className="mt-6 font-semibold">Transaction history</h3>
              <div className="mt-3 space-y-2">
                {wallet?.entries.map((entry) => (
                  <p className="rounded-md border p-3 text-sm" key={entry.id}>
                    {entry.entryType} · {entry.state} · ₹{entry.amountPaise / 100}
                  </p>
                ))}
              </div>
            </section>
            <div className="space-y-6">
              <form className="grid gap-3 rounded-xl border p-5" onSubmit={addPayout}>
                <h2 className="text-xl font-semibold">Payout account</h2>
                <input
                  className="min-h-11 rounded-md border bg-transparent px-3"
                  onChange={(e) => setAccountReference(e.target.value)}
                  placeholder="Sandbox account reference"
                  required
                  value={accountReference}
                />
                <input
                  className="min-h-11 rounded-md border bg-transparent px-3"
                  onChange={(e) => setMaskedLabel(e.target.value)}
                  required
                  value={maskedLabel}
                />
                <button className="min-h-11 rounded-md border px-3">
                  Add verified mock account
                </button>
              </form>
              <form className="grid gap-3 rounded-xl border p-5" onSubmit={withdraw}>
                <h2 className="text-xl font-semibold">Request withdrawal</h2>
                <input
                  className="min-h-11 rounded-md border bg-transparent px-3"
                  min="500"
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  value={amount}
                />
                <button
                  className="min-h-11 rounded-md bg-zinc-950 px-3 text-white"
                  disabled={!payouts.length}
                >
                  Withdraw available earnings
                </button>
                <p className="text-sm text-zinc-600">Minimum ₹500. No security reserve.</p>
              </form>
              <section className="rounded-xl border p-5">
                <h2 className="font-semibold">Withdrawal history</h2>
                {withdrawals.map((entry, index) => (
                  <pre className="mt-2 overflow-auto text-xs" key={String(entry.id ?? index)}>
                    {JSON.stringify(entry, null, 2)}
                  </pre>
                ))}
              </section>
            </div>
          </div>
        ) : null}
      </main>
    </RoleGate>
  );
}
