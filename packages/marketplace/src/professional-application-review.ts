import { IndiaMobileNumberSchema, MaskedIndiaMobileNumberSchema } from '@beautyathome/auth';
import { z } from 'zod';

import {
  CursorSchema,
  InternalNoteSchema,
  IsoUtcDateTimeSchema,
  QueryPageLimitSchema,
  ReasonCodeSchema,
  VersionSchema,
  createCursorPageSchema,
} from './primitives.js';
import {
  ProfessionalApplicationExperienceBandSchema,
  ProfessionalApplicationServiceCodeSchema,
} from './professional-applications.js';

export const PROFESSIONAL_INTEREST_APPLICATION_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
] as const;

export const ProfessionalInterestApplicationStatusSchema = z.enum(
  PROFESSIONAL_INTEREST_APPLICATION_STATUSES,
);

export const ProfessionalApplicationIdSchema = z.string().uuid();

export const AdminProfessionalApplicationListQuerySchema = z
  .object({
    status: ProfessionalInterestApplicationStatusSchema.optional(),
    after: CursorSchema.optional(),
    limit: QueryPageLimitSchema.optional(),
  })
  .strict();

export const ProfessionalApplicationSummarySchema = z
  .object({
    id: ProfessionalApplicationIdSchema,
    referenceId: z.string().uuid(),
    fullName: z.string().trim().min(2).max(100),
    maskedMobileNumber: MaskedIndiaMobileNumberSchema,
    city: z.string().trim().min(2).max(120),
    experienceBand: ProfessionalApplicationExperienceBandSchema,
    services: z.array(ProfessionalApplicationServiceCodeSchema),
    status: ProfessionalInterestApplicationStatusSchema,
    version: VersionSchema,
    createdAt: IsoUtcDateTimeSchema,
    updatedAt: IsoUtcDateTimeSchema,
  })
  .strict();

export const ProfessionalApplicationDetailSchema = ProfessionalApplicationSummarySchema.extend({
  mobileNumber: IndiaMobileNumberSchema,
  coverage: z.string().trim().min(3).max(500),
  workSummary: z.string().trim().min(20).max(2_000),
  consentedAt: IsoUtcDateTimeSchema,
  reviewedAt: IsoUtcDateTimeSchema.nullable(),
  reviewedByUserId: z.string().uuid().nullable(),
  linkedUserId: z.string().uuid().nullable(),
  decisionReasonCode: ReasonCodeSchema.nullable(),
  decisionNote: InternalNoteSchema.nullable(),
}).strict();

export const AdminProfessionalApplicationPageSchema = createCursorPageSchema(
  ProfessionalApplicationSummarySchema,
);

export const ProfessionalApplicationStartReviewSchema = z
  .object({
    expectedVersion: VersionSchema,
  })
  .strict();

const decisionBase = {
  expectedVersion: VersionSchema,
  reasonCode: ReasonCodeSchema,
};

export const AdminProfessionalApplicationDecisionSchema = z.discriminatedUnion('decision', [
  z
    .object({
      ...decisionBase,
      decision: z.literal('APPROVE'),
      internalNote: InternalNoteSchema.optional(),
    })
    .strict(),
  z
    .object({
      ...decisionBase,
      decision: z.literal('REJECT'),
      internalNote: InternalNoteSchema,
    })
    .strict(),
]);

export type AdminProfessionalApplicationListQuery = z.infer<
  typeof AdminProfessionalApplicationListQuerySchema
>;
export type ProfessionalApplicationStartReview = z.infer<
  typeof ProfessionalApplicationStartReviewSchema
>;
export type AdminProfessionalApplicationDecision = z.infer<
  typeof AdminProfessionalApplicationDecisionSchema
>;
