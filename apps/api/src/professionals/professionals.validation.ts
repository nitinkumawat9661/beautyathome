import {
  CursorPaginationQuerySchema,
  ProfessionalIdSchema,
  QueryPageLimitSchema,
  ReasonCodeSchema,
  SearchTermSchema,
  ShortReasonSchema,
  VerificationApplicationIdSchema,
  VerificationApplicationStatusSchema,
  VersionSchema,
} from '@beautyathome/marketplace';
import { z } from 'zod';

export const VerificationApplicationListQuerySchema = z
  .object({
    status: VerificationApplicationStatusSchema.optional(),
    search: SearchTermSchema.optional(),
    after: z.string().trim().min(1).max(512).optional(),
    limit: QueryPageLimitSchema.optional(),
  })
  .strict();

export const ProfessionalStatusChangeSchema = z
  .object({
    action: z.enum(['SUSPEND', 'REACTIVATE']),
    reasonCode: ReasonCodeSchema,
    reason: ShortReasonSchema,
    eligibilityPolicyVersionReviewed: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),
    expectedProfileVersion: VersionSchema,
  })
  .strict();

export {
  CursorPaginationQuerySchema,
  ProfessionalIdSchema,
  VerificationApplicationIdSchema,
};
