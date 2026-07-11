import { UserRoleSchema } from '@beautyathome/auth';
import { z } from 'zod';

import {
  AuditEventIdSchema,
  IsoUtcDateTimeSchema,
  QueryPageLimitSchema,
  ReasonCodeSchema,
  SearchTermSchema,
  createCursorPageSchema,
} from './primitives.js';

export const AUDIT_OUTCOMES = ['SUCCEEDED', 'FAILED', 'DENIED'] as const;
export const AUDIT_ACTOR_TYPES = ['USER', 'SYSTEM', 'JOB'] as const;
export const AuditOutcomeSchema = z.enum(AUDIT_OUTCOMES);
export const AuditActorTypeSchema = z.enum(AUDIT_ACTOR_TYPES);

export const AdminAuditEventSummarySchema = z
  .object({
    id: AuditEventIdSchema,
    actorType: AuditActorTypeSchema,
    actorId: z.string().uuid().nullable(),
    actorRole: UserRoleSchema.nullable(),
    action: z.string().trim().min(2).max(150),
    targetType: z.string().trim().min(2).max(100),
    targetId: z.string().uuid(),
    outcome: AuditOutcomeSchema,
    reasonCode: ReasonCodeSchema.nullable(),
    requestId: z.string().trim().min(1).max(128),
    changedFields: z.array(z.string().trim().min(1).max(100)).max(100),
    createdAt: IsoUtcDateTimeSchema,
  })
  .strict();

export const AdminAuditListQuerySchema = z
  .object({
    actorId: z.string().uuid().optional(),
    actorRole: UserRoleSchema.optional(),
    action: z.string().trim().min(2).max(150).optional(),
    targetType: z.string().trim().min(2).max(100).optional(),
    targetId: z.string().uuid().optional(),
    outcome: AuditOutcomeSchema.optional(),
    from: IsoUtcDateTimeSchema.optional(),
    to: IsoUtcDateTimeSchema.optional(),
    search: SearchTermSchema.optional(),
    sort: z.enum(['createdAtAsc', 'createdAtDesc']).optional(),
    after: z.string().trim().min(1).max(512).optional(),
    limit: QueryPageLimitSchema.optional(),
  })
  .strict()
  .refine(
    (query) =>
      query.to === undefined ||
      query.from === undefined ||
      Date.parse(query.to) >= Date.parse(query.from),
    'Audit range end cannot precede start',
  );

export const AdminAuditEventPageSchema = createCursorPageSchema(AdminAuditEventSummarySchema);

export type AdminAuditEventSummary = z.infer<typeof AdminAuditEventSummarySchema>;
export type AdminAuditListQuery = z.infer<typeof AdminAuditListQuerySchema>;
