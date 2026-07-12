'use client';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import type { BookingView } from '@beautyathome/booking';
import { RoleGate } from '@/components/role-gate';
import {
  cancelBooking,
  confirmPayment,
  createBooking,
  createPaymentOrder,
  createReminder,
  getBooking,
  listBookings,
  reviewBooking,
} from '@/lib/api/commerce-client';

export function CustomerCommerceScreen({
  mode,
}: Readonly<{ mode: 'checkout' | 'history' | 'detail' | 'payment' }>) {
  const params = useParams<{ bookingId?: string }>();
  const query = useSearchParams();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingView[]>([]);
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [serviceAreaId, setServiceAreaId] = useState('');
  const [addressId, setAddressId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [assignment, setAssignment] = useState<'SELECTED_PROFESSIONAL' | 'BEST_AVAILABLE'>(
    query.get('professionalId') ? 'SELECTED_PROFESSIONAL' : 'BEST_AVAILABLE',
  );
  const [paymentId, setPaymentId] = useState('');
  const [signature, setSignature] = useState('');
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode === 'history')
      void listBookings('customer')
        .then(setBookings)
        .catch(() => setMessage('Unable to load booking history.'));
    if ((mode === 'detail' || mode === 'payment') && params.bookingId)
      void getBooking(params.bookingId, 'customer')
        .then(setBooking)
        .catch(() => setMessage('Unable to load this booking.'));
  }, [mode, params.bookingId]);

  async function checkout(event: FormEvent) {
    event.preventDefault();
    const serviceId = query.get('serviceId') ?? '';
    const cityId = query.get('cityId') ?? '';
    const professionalId = query.get('professionalId') ?? undefined;
    setBusy(true);
    try {
      const created = await createBooking(
        {
          serviceId,
          cityId,
          serviceAreaId,
          addressId,
          availabilitySlotId: slotId,
          assignmentMode: assignment,
          ...(assignment === 'SELECTED_PROFESSIONAL'
            ? { selectedProfessionalId: professionalId }
            : {}),
        },
        crypto.randomUUID(),
      );
      router.push(`/bookings/${created.id}/payment`);
    } catch {
      setMessage('Checkout could not be created. Verify the saved address and available slot.');
    } finally {
      setBusy(false);
    }
  }
  async function makeOrder() {
    if (!booking) return;
    setBusy(true);
    try {
      const order = await createPaymentOrder(booking.id, crypto.randomUUID());
      setMessage(
        `Sandbox order ready: ${String((order.order as Record<string, unknown> | undefined)?.orderId ?? 'created')}`,
      );
    } catch {
      setMessage('Payment order could not be created.');
    } finally {
      setBusy(false);
    }
  }
  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!booking) return;
    setBusy(true);
    try {
      await confirmPayment(booking.id, {
        paymentId,
        signature,
        idempotencyKey: crypto.randomUUID(),
      });
      setMessage('Payment verified. Your booking request is now active.');
      setBooking(await getBooking(booking.id, 'customer'));
    } catch {
      setMessage('Payment verification failed. No duplicate charge was created.');
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!booking) return;
    setBusy(true);
    try {
      setBooking(await cancelBooking(booking.id, booking.version));
      setMessage('Cancellation recorded and refund policy applied.');
    } catch {
      setMessage('This booking cannot be cancelled in its current state.');
    } finally {
      setBusy(false);
    }
  }
  async function review(event: FormEvent) {
    event.preventDefault();
    if (!booking) return;
    try {
      await reviewBooking(booking.id, Number(rating), comment || undefined);
      setMessage('Verified review submitted for moderation.');
    } catch {
      setMessage('Review is available only after verified completion.');
    }
  }

  return (
    <RoleGate allowedRoles={['CUSTOMER']}>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Customer bookings
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {mode === 'checkout'
            ? 'Booking checkout'
            : mode === 'history'
              ? 'Booking history'
              : mode === 'payment'
                ? 'Payment result'
                : 'Booking details and tracking'}
        </h1>
        {message ? (
          <p className="mt-4 rounded-md bg-zinc-100 p-3 text-sm" role="status">
            {message}
          </p>
        ) : null}
        {mode === 'checkout' ? (
          <form
            className="mt-8 grid gap-5 rounded-xl border p-5 sm:grid-cols-2"
            onSubmit={checkout}
          >
            <p className="sm:col-span-2 text-sm text-zinc-600">
              Service and Professional come from discovery. Enter identifiers from your saved
              address and selected available slot.
            </p>
            <label className="text-sm font-medium">
              Service area ID
              <input
                className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                onChange={(e) => setServiceAreaId(e.target.value)}
                required
                value={serviceAreaId}
              />
            </label>
            <label className="text-sm font-medium">
              Saved address ID
              <input
                className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                onChange={(e) => setAddressId(e.target.value)}
                required
                value={addressId}
              />
            </label>
            <label className="text-sm font-medium">
              Available slot ID
              <input
                className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                onChange={(e) => setSlotId(e.target.value)}
                required
                value={slotId}
              />
            </label>
            <label className="text-sm font-medium">
              Assignment
              <select
                className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                onChange={(e) => setAssignment(e.target.value as typeof assignment)}
                value={assignment}
              >
                <option value="SELECTED_PROFESSIONAL">Selected Professional</option>
                <option value="BEST_AVAILABLE">Assign Best Professional</option>
              </select>
            </label>
            <button
              className="min-h-11 rounded-md bg-zinc-950 px-4 font-semibold text-white sm:col-span-2"
              disabled={busy}
              type="submit"
            >
              Review price and create booking
            </button>
          </form>
        ) : null}
        {mode === 'history' ? (
          <section className="mt-8 space-y-3">
            {bookings.map((item) => (
              <Link
                className="block rounded-xl border p-4"
                href={`/bookings/${item.id}`}
                key={item.id}
              >
                <h2 className="font-semibold">{item.serviceNameSnapshot}</h2>
                <p className="text-sm text-zinc-600">
                  {item.status} · {item.scheduledStart.toLocaleString('en-IN')} · ₹
                  {item.totalPaise / 100}
                </p>
              </Link>
            ))}
          </section>
        ) : null}
        {booking && mode !== 'history' ? (
          <section className="mt-8 rounded-xl border p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{booking.serviceNameSnapshot}</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {booking.status} · {booking.assignmentMode}
                </p>
              </div>
              <p className="font-semibold">₹{booking.totalPaise / 100}</p>
            </div>
            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-zinc-500">Scheduled</dt>
                <dd>{booking.scheduledStart.toLocaleString('en-IN')}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Advance</dt>
                <dd>₹{booking.advancePaise / 100}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Remaining</dt>
                <dd>₹{booking.remainingPaise / 100}</dd>
              </div>
            </dl>
            {mode === 'detail' ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  className="min-h-11 rounded-md border px-4"
                  disabled={busy}
                  onClick={() => void cancel()}
                  type="button"
                >
                  Cancel under policy
                </button>
                <button
                  className="min-h-11 rounded-md border px-4"
                  onClick={() =>
                    void createReminder(booking.id, 'DAYS_30').then(() =>
                      setMessage('30-day reminder scheduled.'),
                    )
                  }
                  type="button"
                >
                  Remind me in 30 days
                </button>
                <Link
                  className="inline-flex min-h-11 items-center rounded-md border px-4"
                  href={`/bookings/checkout?serviceId=${query.get('serviceId') ?? ''}&professionalId=${booking.assignedProfessionalId ?? ''}`}
                >
                  Rebook Professional
                </Link>
              </div>
            ) : null}
            {mode === 'detail' && booking.status === 'COMPLETED' ? (
              <form className="mt-6 grid gap-3 border-t pt-5" onSubmit={review}>
                <h3 className="font-semibold">Verified review</h3>
                <label>
                  Rating
                  <select
                    className="ml-3 rounded-md border p-2"
                    onChange={(e) => setRating(e.target.value)}
                    value={rating}
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <textarea
                  className="rounded-md border bg-transparent p-3"
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience"
                  value={comment}
                />
                <button className="min-h-11 rounded-md bg-zinc-950 px-4 text-white" type="submit">
                  Submit review
                </button>
              </form>
            ) : null}
          </section>
        ) : null}
        {booking && mode === 'payment' ? (
          <div className="mt-5 grid gap-4">
            <button
              className="min-h-11 rounded-md border px-4"
              disabled={busy}
              onClick={() => void makeOrder()}
              type="button"
            >
              Create sandbox payment order
            </button>
            <form className="grid gap-3 rounded-xl border p-5" onSubmit={pay}>
              <label>
                Gateway payment ID
                <input
                  className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                  onChange={(e) => setPaymentId(e.target.value)}
                  required
                  value={paymentId}
                />
              </label>
              <label>
                Gateway signature
                <input
                  className="mt-2 min-h-11 w-full rounded-md border bg-transparent px-3"
                  onChange={(e) => setSignature(e.target.value)}
                  required
                  value={signature}
                />
              </label>
              <button
                className="min-h-11 rounded-md bg-zinc-950 px-4 text-white"
                disabled={busy}
                type="submit"
              >
                Verify payment
              </button>
            </form>
          </div>
        ) : null}
      </main>
    </RoleGate>
  );
}
