import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertBookingTransition,
  calculateCommission,
  calculateCancellationRefund,
  clearanceAt,
  assertWithdrawalAllowed,
  deriveWalletBalances,
  rankAssignmentCandidates,
  isNewWebhook,
  assertOtpAttemptAllowed,
  BookingCreateSchema,
} from '../dist/index.js';

test('controlled booking state machine permits only declared transitions', () => {
  assert.doesNotThrow(() => assertBookingTransition('DRAFT', 'PAYMENT_PENDING'));
  assert.throws(() => assertBookingTransition('DRAFT', 'COMPLETED'));
});
test('assignment contract requires a Professional only for selected mode', () => {
  const base = {
    serviceId: crypto.randomUUID(),
    cityId: crypto.randomUUID(),
    serviceAreaId: crypto.randomUUID(),
    addressId: crypto.randomUUID(),
    availabilitySlotId: crypto.randomUUID(),
    idempotencyKey: 'idempotency-key-0001',
  };
  assert.equal(
    BookingCreateSchema.safeParse({ ...base, assignmentMode: 'SELECTED_PROFESSIONAL' }).success,
    false,
  );
  assert.equal(
    BookingCreateSchema.safeParse({ ...base, assignmentMode: 'BEST_AVAILABLE' }).success,
    true,
  );
});
test('commission calculation is integer-safe and capped at gross', () => {
  assert.deepEqual(calculateCommission(100_00, { rateBasisPoints: 2000, fixedFeePaise: 100 }), {
    grossPaise: 10000,
    commissionPaise: 2100,
    netPaise: 7900,
  });
});
test('six-hour clearance is exact', () => {
  assert.equal(
    clearanceAt(new Date('2026-01-01T00:00:00Z')).toISOString(),
    '2026-01-01T06:00:00.000Z',
  );
});
test('withdrawal enforces ₹500 and available balance', () => {
  assert.throws(() => assertWithdrawalAllowed(49_999, 100_000));
  assert.doesNotThrow(() => assertWithdrawalAllowed(50_000, 50_000));
  assert.throws(() => assertWithdrawalAllowed(60_000, 50_000));
});
test('wallet balances derive from immutable entries', () => {
  assert.deepEqual(
    deriveWalletBalances([
      { direction: 'CREDIT', amountPaise: 5000, state: 'PENDING' },
      { direction: 'CREDIT', amountPaise: 3000, state: 'AVAILABLE' },
      { direction: 'DEBIT', amountPaise: 1000, state: 'AVAILABLE' },
    ]),
    {
      pendingPaise: 5000,
      availablePaise: 2000,
      reservedPaise: 0,
      withdrawnPaise: 0,
      reversedPaise: 0,
    },
  );
});
test('cancellation policy applies exact configured bands', () => {
  const start = new Date('2026-01-02T00:00:00Z');
  assert.equal(
    calculateCancellationRefund(10000, start, new Date('2026-01-01T11:00:00Z')).refundPaise,
    10000,
  );
  assert.equal(
    calculateCancellationRefund(10000, start, new Date('2026-01-01T16:00:00Z')).refundPaise,
    7500,
  );
  assert.equal(
    calculateCancellationRefund(10000, start, new Date('2026-01-01T20:00:00Z')).refundPaise,
    5000,
  );
  assert.equal(
    calculateCancellationRefund(10000, start, new Date('2026-01-01T23:00:00Z')).refundPaise,
    0,
  );
});
test('automatic assignment filters ineligible candidates and ranks deterministically', () => {
  const base = {
    verified: true,
    active: true,
    serviceEnabled: true,
    slotAvailable: true,
    serviceAreaMatch: true,
    cityMatch: true,
    distanceKm: 2,
    rating: 4.8,
    acceptanceRateBasisPoints: 9000,
    pricePaise: 1000,
    maximumPricePaise: 2000,
  };
  const ranked = rankAssignmentCandidates([
    { ...base, id: 'b', score: 80 },
    { ...base, id: 'a', score: 90 },
    { ...base, id: 'x', score: 100, verified: false },
  ]);
  assert.deepEqual(
    ranked.map((candidate) => candidate.id),
    ['a', 'b'],
  );
});
test('payment webhook idempotency rejects a processed event', () => {
  assert.equal(isNewWebhook(new Set(['evt_1']), 'evt_1'), false);
  assert.equal(isNewWebhook(new Set(['evt_1']), 'evt_2'), true);
});
test('OTP limits reject expiry, exhaustion, and reuse', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  assert.throws(() =>
    assertOtpAttemptAllowed({ expiresAt: now, attempts: 0, consumedAt: null }, now),
  );
  assert.throws(() =>
    assertOtpAttemptAllowed(
      { expiresAt: new Date('2026-01-02'), attempts: 5, consumedAt: null },
      now,
    ),
  );
  assert.throws(() =>
    assertOtpAttemptAllowed(
      { expiresAt: new Date('2026-01-02'), attempts: 0, consumedAt: now },
      now,
    ),
  );
});
