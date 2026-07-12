import { z } from 'zod';

export const BOOKING_STATUSES = [
  'DRAFT',
  'PAYMENT_PENDING',
  'REQUESTED',
  'ACCEPTED',
  'REJECTED',
  'CONFIRMED',
  'EN_ROUTE',
  'ARRIVED',
  'START_OTP_PENDING',
  'IN_PROGRESS',
  'COMPLETION_OTP_PENDING',
  'COMPLETED',
  'CANCELLED',
  'REFUND_PENDING',
  'REFUNDED',
  'DISPUTED',
  'NO_SHOW',
] as const;
export const BookingStatusSchema = z.enum(BOOKING_STATUSES);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

const TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  DRAFT: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['REQUESTED', 'CANCELLED'],
  REQUESTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['CONFIRMED', 'CANCELLED'],
  REJECTED: ['REQUESTED', 'REFUND_PENDING', 'CANCELLED'],
  CONFIRMED: ['EN_ROUTE', 'CANCELLED', 'NO_SHOW', 'DISPUTED'],
  EN_ROUTE: ['ARRIVED', 'CANCELLED', 'NO_SHOW'],
  ARRIVED: ['START_OTP_PENDING', 'CANCELLED', 'NO_SHOW'],
  START_OTP_PENDING: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETION_OTP_PENDING', 'DISPUTED'],
  COMPLETION_OTP_PENDING: ['COMPLETED', 'IN_PROGRESS', 'DISPUTED'],
  COMPLETED: ['DISPUTED', 'REFUND_PENDING'],
  CANCELLED: ['REFUND_PENDING'],
  REFUND_PENDING: ['REFUNDED', 'DISPUTED'],
  REFUNDED: ['DISPUTED'],
  DISPUTED: ['COMPLETED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED'],
  NO_SHOW: ['CANCELLED', 'REFUND_PENDING', 'DISPUTED'],
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertBookingTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransitionBooking(from, to))
    throw new Error(`Invalid booking transition: ${from} -> ${to}`);
}

export const PaiseSchema = z.number().int().nonnegative().max(2_147_483_647);
export const PercentageBasisPointsSchema = z.number().int().min(0).max(10_000);
export const AssignmentModeSchema = z.enum(['SELECTED_PROFESSIONAL', 'BEST_AVAILABLE']);
export const BookingIdSchema = z.string().uuid().brand<'BookingId'>();
export const IdempotencyKeySchema = z.string().trim().min(16).max(128);

export const BookingCreateSchema = z
  .object({
    serviceId: z.string().uuid(),
    cityId: z.string().uuid(),
    serviceAreaId: z.string().uuid(),
    addressId: z.string().uuid(),
    availabilitySlotId: z.string().uuid(),
    assignmentMode: AssignmentModeSchema,
    selectedProfessionalId: z.string().uuid().optional(),
    idempotencyKey: IdempotencyKeySchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.assignmentMode === 'SELECTED_PROFESSIONAL') !==
      Boolean(value.selectedProfessionalId)
    )
      context.addIssue({
        code: 'custom',
        path: ['selectedProfessionalId'],
        message: 'Selected assignment requires exactly one Professional',
      });
  });

export const BookingTransitionSchema = z
  .object({
    toStatus: BookingStatusSchema,
    reasonCode: z.string().trim().min(2).max(80),
    reason: z.string().trim().min(2).max(500).optional(),
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const CommissionRuleInputSchema = z
  .object({
    rateBasisPoints: PercentageBasisPointsSchema,
    fixedFeePaise: PaiseSchema.default(0),
  })
  .strict();
export type CommissionRuleInput = z.infer<typeof CommissionRuleInputSchema>;

export function calculateCommission(basePaise: number, rule: CommissionRuleInput) {
  PaiseSchema.parse(basePaise);
  const parsed = CommissionRuleInputSchema.parse(rule);
  const commissionPaise = Math.min(
    basePaise,
    Math.round((basePaise * parsed.rateBasisPoints) / 10_000) + parsed.fixedFeePaise,
  );
  return { grossPaise: basePaise, commissionPaise, netPaise: basePaise - commissionPaise };
}

export const CANCELLATION_BANDS = [
  { minimumMinutesBeforeStart: 12 * 60, refundBasisPoints: 10_000 },
  { minimumMinutesBeforeStart: 6 * 60, refundBasisPoints: 7_500 },
  { minimumMinutesBeforeStart: 2 * 60, refundBasisPoints: 5_000 },
  { minimumMinutesBeforeStart: 0, refundBasisPoints: 0 },
] as const;

export function calculateCancellationRefund(
  paidPaise: number,
  scheduledAt: Date,
  cancelledAt: Date,
  bands = CANCELLATION_BANDS,
) {
  PaiseSchema.parse(paidPaise);
  const minutes = Math.max(0, (scheduledAt.getTime() - cancelledAt.getTime()) / 60_000);
  const band =
    bands.find((candidate) => minutes > candidate.minimumMinutesBeforeStart) ??
    bands[bands.length - 1];
  if (!band) throw new Error('Cancellation policy requires at least one band');
  return {
    refundPaise: Math.round((paidPaise * band.refundBasisPoints) / 10_000),
    refundBasisPoints: band.refundBasisPoints,
  };
}

export const WALLET_CLEARANCE_HOURS = 6;
export const MINIMUM_WITHDRAWAL_PAISE = 50_000;
export function clearanceAt(completedAt: Date) {
  return new Date(completedAt.getTime() + WALLET_CLEARANCE_HOURS * 3_600_000);
}
export function assertWithdrawalAllowed(amountPaise: number, availablePaise: number): void {
  if (!Number.isInteger(amountPaise) || amountPaise < MINIMUM_WITHDRAWAL_PAISE)
    throw new Error('Withdrawal must be at least 50000 paise');
  if (amountPaise > availablePaise) throw new Error('Insufficient available balance');
}

export type LedgerEntry = {
  direction: 'CREDIT' | 'DEBIT';
  amountPaise: number;
  state: 'PENDING' | 'AVAILABLE' | 'RESERVED' | 'SETTLED' | 'REVERSED';
};
export function deriveWalletBalances(entries: readonly LedgerEntry[]) {
  return entries.reduce(
    (balance, entry) => {
      const signed = entry.direction === 'CREDIT' ? entry.amountPaise : -entry.amountPaise;
      if (entry.state === 'PENDING') balance.pendingPaise += signed;
      if (entry.state === 'AVAILABLE') balance.availablePaise += signed;
      if (entry.state === 'RESERVED') balance.reservedPaise += signed;
      if (entry.state === 'SETTLED') balance.withdrawnPaise += Math.abs(signed);
      if (entry.state === 'REVERSED') balance.reversedPaise += Math.abs(signed);
      return balance;
    },
    { pendingPaise: 0, availablePaise: 0, reservedPaise: 0, withdrawnPaise: 0, reversedPaise: 0 },
  );
}

export type AssignmentCandidate = {
  id: string;
  verified: boolean;
  active: boolean;
  serviceEnabled: boolean;
  slotAvailable: boolean;
  serviceAreaMatch: boolean;
  cityMatch: boolean;
  distanceKm: number | null;
  score: number;
  rating: number;
  acceptanceRateBasisPoints: number;
  pricePaise: number;
  maximumPricePaise: number;
};
export function rankAssignmentCandidates(candidates: readonly AssignmentCandidate[]) {
  return candidates
    .filter(
      (c) =>
        c.verified &&
        c.active &&
        c.serviceEnabled &&
        c.slotAvailable &&
        c.serviceAreaMatch &&
        c.cityMatch &&
        c.pricePaise <= c.maximumPricePaise,
    )
    .toSorted(
      (a, b) =>
        (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER) ||
        b.score - a.score ||
        b.rating - a.rating ||
        b.acceptanceRateBasisPoints - a.acceptanceRateBasisPoints ||
        a.pricePaise - b.pricePaise ||
        a.id.localeCompare(b.id),
    );
}

export const PaymentWebhookSchema = z
  .object({
    eventId: z.string().min(1).max(200),
    eventType: z.string().min(1).max(100),
    gatewayPaymentId: z.string().min(1).max(200),
    occurredAt: z.string().datetime(),
    payloadHash: z.string().length(64),
  })
  .strict();
export function isNewWebhook(processedEventIds: ReadonlySet<string>, eventId: string) {
  return !processedEventIds.has(eventId);
}

export const OTP_MAX_ATTEMPTS = 5;
export const OTP_TTL_SECONDS = 300;
export type OtpChallengeState = { expiresAt: Date; attempts: number; consumedAt: Date | null };
export function assertOtpAttemptAllowed(challenge: OtpChallengeState, now: Date): void {
  if (challenge.consumedAt) throw new Error('OTP already consumed');
  if (challenge.expiresAt <= now) throw new Error('OTP expired');
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) throw new Error('OTP attempts exhausted');
}

export const ReviewCreateSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).optional(),
  })
  .strict();
export const ReminderCreateSchema = z.discriminatedUnion('schedule', [
  z.object({ schedule: z.enum(['DAYS_15', 'DAYS_30', 'DAYS_45']) }).strict(),
  z.object({ schedule: z.literal('CUSTOM'), remindAt: z.string().datetime() }).strict(),
]);
