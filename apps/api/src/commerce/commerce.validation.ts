import {
  BookingCreateRequestSchema as SharedBookingCreateRequestSchema,
  BookingStatusSchema,
  IdempotencyKeySchema,
  PaiseSchema,
  ReminderCreateSchema,
  ReviewCreateSchema,
} from '@beautyathome/booking';
import { z } from 'zod';

export const BookingIdSchema = z.string().uuid();
export const PaymentIdSchema = z.string().uuid();
export const WithdrawalIdSchema = z.string().uuid();
export const RefundIdSchema = z.string().uuid();
export const BookingCreateRequestSchema = SharedBookingCreateRequestSchema;
export const IdempotencyHeaderSchema = IdempotencyKeySchema;
export const BookingListQuerySchema = z
  .object({
    status: BookingStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export const BookingCancelSchema = z
  .object({
    reasonCode: z.string().trim().min(2).max(80),
    reason: z.string().trim().min(2).max(500).optional(),
    expectedVersion: z.number().int().positive(),
  })
  .strict();
export const PaymentOrderCreateSchema = z
  .object({ idempotencyKey: IdempotencyKeySchema })
  .strict();
export const PaymentConfirmSchema = z
  .object({
    paymentId: z.string().trim().min(1).max(200),
    signature: z.string().trim().min(16).max(500),
    idempotencyKey: IdempotencyKeySchema,
  })
  .strict();
export const WebhookSchema = z
  .object({
    eventId: z.string().min(1).max(200),
    eventType: z.string().min(1).max(100),
    orderId: z.string().min(1).max(200),
    paymentId: z.string().min(1).max(200),
    signature: z.string().min(16).max(500),
    payloadHash: z.string().length(64),
  })
  .strict();
export const BookingDecisionSchema = z
  .object({
    reasonCode: z.string().trim().min(2).max(80).optional(),
    expectedVersion: z.number().int().positive(),
  })
  .strict();
export const BookingActionSchema = z
  .object({ expectedVersion: z.number().int().positive() })
  .strict();
export const OtpVerifySchema = z
  .object({
    challengeId: z.string().uuid(),
    code: z.string().regex(/^\d{6}$/),
    expectedVersion: z.number().int().positive(),
  })
  .strict();
export const WithdrawalCreateSchema = z
  .object({
    payoutAccountId: z.string().uuid(),
    amountPaise: PaiseSchema,
    idempotencyKey: IdempotencyKeySchema,
  })
  .strict();
export const PayoutAccountCreateSchema = z
  .object({
    provider: z.literal('mock'),
    accountReference: z.string().trim().min(4).max(200),
    maskedLabel: z.string().trim().min(4).max(100),
  })
  .strict();
export const AdminDecisionSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT', 'RETRY']),
    internalNote: z.string().trim().min(2).max(2000),
    expectedStatus: z.string().min(2).max(50),
  })
  .strict();
export const AdminOverrideSchema = z
  .object({
    toStatus: BookingStatusSchema,
    reasonCode: z.string().trim().min(2).max(80),
    reason: z.string().trim().min(2).max(500),
    expectedVersion: z.number().int().positive(),
  })
  .strict();
export const CommissionRuleCreateSchema = z
  .object({
    level: z.string().max(50).optional(),
    packageCode: z.string().max(80).optional(),
    minimumCompletedJobs: z.number().int().nonnegative().optional(),
    categoryId: z.string().uuid().optional(),
    cityId: z.string().uuid().optional(),
    promotionalOverride: z.boolean().default(false),
    rateBasisPoints: z.number().int().min(0).max(10_000),
    fixedFeePaise: PaiseSchema.default(0),
    effectiveFrom: z.string().datetime(),
    effectiveTo: z.string().datetime().optional(),
    priority: z.number().int().default(0),
  })
  .strict();
export const ReviewRequestSchema = ReviewCreateSchema;
export const ReminderRequestSchema = ReminderCreateSchema;

export type BookingCreateRequest = z.infer<typeof BookingCreateRequestSchema>;
export type BookingListQuery = z.infer<typeof BookingListQuerySchema>;
export type BookingCancel = z.infer<typeof BookingCancelSchema>;
export type PaymentConfirm = z.infer<typeof PaymentConfirmSchema>;
export type WebhookInput = z.infer<typeof WebhookSchema>;
export type BookingDecision = z.infer<typeof BookingDecisionSchema>;
export type BookingAction = z.infer<typeof BookingActionSchema>;
export type OtpVerify = z.infer<typeof OtpVerifySchema>;
export type WithdrawalCreate = z.infer<typeof WithdrawalCreateSchema>;
export type PayoutAccountCreate = z.infer<typeof PayoutAccountCreateSchema>;
export type AdminDecision = z.infer<typeof AdminDecisionSchema>;
export type AdminOverride = z.infer<typeof AdminOverrideSchema>;
export type CommissionRuleCreate = z.infer<typeof CommissionRuleCreateSchema>;
export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;
export type ReminderRequest = z.infer<typeof ReminderRequestSchema>;
