import { z } from 'zod';

import {
  AvailabilityOverrideIdSchema,
  AvailabilityRuleIdSchema,
  AvailabilitySlotIdSchema,
  IanaTimeZoneSchema,
  IsoDateSchema,
  IsoUtcDateTimeSchema,
  LocalTimeSchema,
  MasterServiceIdSchema,
  ProfessionalIdSchema,
  QueryPageLimitSchema,
  VersionSchema,
  createCursorPageSchema,
  hasUniqueValues,
  intervalsDoNotOverlap,
  minutesFromLocalTime,
} from './primitives.js';

export const ISO_WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;
export const AVAILABILITY_STATUSES = ['AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED', 'EXPIRED'] as const;
export const DATE_OVERRIDE_KINDS = ['AVAILABLE', 'UNAVAILABLE'] as const;

export const IsoWeekdaySchema = z.enum(ISO_WEEKDAYS);
export const AvailabilityStatusSchema = z.enum(AVAILABILITY_STATUSES);
export const DateOverrideKindSchema = z.enum(DATE_OVERRIDE_KINDS);

export const LocalTimeIntervalSchema = z
  .object({
    startLocalTime: LocalTimeSchema,
    endLocalTime: LocalTimeSchema,
  })
  .strict()
  .refine(
    (interval) =>
      minutesFromLocalTime(interval.endLocalTime) > minutesFromLocalTime(interval.startLocalTime),
    'Availability interval must end after it starts and cannot cross midnight',
  );

export const WeeklyAvailabilityRuleInputSchema = LocalTimeIntervalSchema.extend({
  weekday: IsoWeekdaySchema,
}).strict();

export const WeeklyAvailabilityReplaceSchema = z
  .object({
    timeZone: IanaTimeZoneSchema,
    rules: z.array(WeeklyAvailabilityRuleInputSchema).max(100),
    expectedVersion: VersionSchema.optional(),
  })
  .strict()
  .superRefine((schedule, context) => {
    for (const weekday of ISO_WEEKDAYS) {
      const intervals = schedule.rules.filter((rule) => rule.weekday === weekday);
      if (!intervalsDoNotOverlap(intervals)) {
        context.addIssue({
          code: 'custom',
          path: ['rules'],
          message: 'Weekly rules cannot overlap on the same day',
        });
      }
    }
    const keys = schedule.rules.map(
      (rule) => rule.weekday + ':' + rule.startLocalTime + ':' + rule.endLocalTime,
    );
    if (!hasUniqueValues(keys)) {
      context.addIssue({
        code: 'custom',
        path: ['rules'],
        message: 'Duplicate weekly rules are not allowed',
      });
    }
  });

export const WeeklyAvailabilityRuleSchema = WeeklyAvailabilityRuleInputSchema.extend({
  id: AvailabilityRuleIdSchema,
  timeZone: IanaTimeZoneSchema,
  version: VersionSchema,
}).strict();

const AvailableDateOverrideInputSchema = z
  .object({
    date: IsoDateSchema,
    kind: z.literal('AVAILABLE'),
    intervals: z
      .array(LocalTimeIntervalSchema)
      .min(1)
      .max(20)
      .refine(intervalsDoNotOverlap, 'Override intervals cannot overlap'),
  })
  .strict();

const UnavailableDateOverrideInputSchema = z
  .object({
    date: IsoDateSchema,
    kind: z.literal('UNAVAILABLE'),
    reason: z.string().trim().min(1).max(300).optional(),
  })
  .strict();

export const DateAvailabilityOverrideInputSchema = z.discriminatedUnion('kind', [
  AvailableDateOverrideInputSchema,
  UnavailableDateOverrideInputSchema,
]);

export const DateAvailabilityOverridesReplaceSchema = z
  .object({
    timeZone: IanaTimeZoneSchema,
    overrides: z
      .array(DateAvailabilityOverrideInputSchema)
      .max(366)
      .refine(
        (overrides) => hasUniqueValues(overrides.map((override) => override.date)),
        'Only one override is allowed per date',
      ),
    expectedVersion: VersionSchema.optional(),
  })
  .strict();

export const DateAvailabilityOverrideSchema = z
  .object({
    id: AvailabilityOverrideIdSchema,
    date: IsoDateSchema,
    kind: DateOverrideKindSchema,
    intervals: z.array(LocalTimeIntervalSchema),
    reason: z.string().trim().min(1).max(300).nullable(),
    timeZone: IanaTimeZoneSchema,
    version: VersionSchema,
  })
  .strict()
  .superRefine((override, context) => {
    if (override.kind === 'UNAVAILABLE' && override.intervals.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['intervals'],
        message: 'Unavailable dates cannot contain intervals',
      });
    }
    if (
      override.kind === 'AVAILABLE' &&
      (override.intervals.length === 0 || !intervalsDoNotOverlap(override.intervals))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['intervals'],
        message: 'Available overrides require non-overlapping intervals',
      });
    }
  });

export const AvailabilitySlotSchema = z
  .object({
    id: AvailabilitySlotIdSchema,
    professionalId: ProfessionalIdSchema,
    serviceId: MasterServiceIdSchema,
    startsAt: IsoUtcDateTimeSchema,
    endsAt: IsoUtcDateTimeSchema,
    displayTimeZone: IanaTimeZoneSchema,
    status: AvailabilityStatusSchema,
    version: VersionSchema,
  })
  .strict()
  .refine(
    (slot) => Date.parse(slot.endsAt) > Date.parse(slot.startsAt),
    'Slot must end after it starts',
  );

export const AvailabilityRangeQuerySchema = z
  .object({
    fromDate: IsoDateSchema,
    toDate: IsoDateSchema,
    serviceId: MasterServiceIdSchema.optional(),
    after: z.string().trim().min(1).max(512).optional(),
    limit: QueryPageLimitSchema.optional(),
  })
  .strict()
  .refine((range) => range.toDate >= range.fromDate, 'Range end cannot precede range start')
  .refine(
    (range) =>
      Date.parse(range.toDate + 'T00:00:00.000Z') - Date.parse(range.fromDate + 'T00:00:00.000Z') <=
      92 * 24 * 60 * 60 * 1_000,
    'Availability query range cannot exceed 92 days',
  );

export const WeeklyAvailabilityRulePageSchema = createCursorPageSchema(
  WeeklyAvailabilityRuleSchema,
);
export const DateAvailabilityOverridePageSchema = createCursorPageSchema(
  DateAvailabilityOverrideSchema,
);
export const AvailabilitySlotPageSchema = createCursorPageSchema(AvailabilitySlotSchema);

export type WeeklyAvailabilityReplace = z.infer<typeof WeeklyAvailabilityReplaceSchema>;
export type DateAvailabilityOverridesReplace = z.infer<
  typeof DateAvailabilityOverridesReplaceSchema
>;
export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;
