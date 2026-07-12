import type { Brand } from '@beautyathome/types';
import { z } from 'zod';

export type CityId = Brand<string, 'CityId'>;
export type ServiceAreaId = Brand<string, 'ServiceAreaId'>;
export type ServiceCategoryId = Brand<string, 'ServiceCategoryId'>;
export type MasterServiceId = Brand<string, 'MasterServiceId'>;
export type ServicePricePolicyId = Brand<string, 'ServicePricePolicyId'>;
export type ServiceRequestId = Brand<string, 'ServiceRequestId'>;
export type ProfessionalId = Brand<string, 'ProfessionalId'>;
export type ProfessionalServiceId = Brand<string, 'ProfessionalServiceId'>;
export type VerificationApplicationId = Brand<string, 'VerificationApplicationId'>;
export type AvailabilityRuleId = Brand<string, 'AvailabilityRuleId'>;
export type AvailabilityOverrideId = Brand<string, 'AvailabilityOverrideId'>;
export type AvailabilitySlotId = Brand<string, 'AvailabilitySlotId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;
export type MediaAssetId = Brand<string, 'MediaAssetId'>;
export type UploadId = Brand<string, 'UploadId'>;
export type CertificateId = Brand<string, 'CertificateId'>;
export type Cursor = Brand<string, 'Cursor'>;

const brandedUuid = <T extends string>() =>
  z
    .string()
    .uuid()
    .transform((value): Brand<string, T> => value as Brand<string, T>);

export const CityIdSchema = brandedUuid<'CityId'>();
export const ServiceAreaIdSchema = brandedUuid<'ServiceAreaId'>();
export const ServiceCategoryIdSchema = brandedUuid<'ServiceCategoryId'>();
export const MasterServiceIdSchema = brandedUuid<'MasterServiceId'>();
export const ServicePricePolicyIdSchema = brandedUuid<'ServicePricePolicyId'>();
export const ServiceRequestIdSchema = brandedUuid<'ServiceRequestId'>();
export const ProfessionalIdSchema = brandedUuid<'ProfessionalId'>();
export const ProfessionalServiceIdSchema = brandedUuid<'ProfessionalServiceId'>();
export const VerificationApplicationIdSchema = brandedUuid<'VerificationApplicationId'>();
export const AvailabilityRuleIdSchema = brandedUuid<'AvailabilityRuleId'>();
export const AvailabilityOverrideIdSchema = brandedUuid<'AvailabilityOverrideId'>();
export const AvailabilitySlotIdSchema = brandedUuid<'AvailabilitySlotId'>();
export const AuditEventIdSchema = brandedUuid<'AuditEventId'>();
export const MediaAssetIdSchema = brandedUuid<'MediaAssetId'>();
export const UploadIdSchema = brandedUuid<'UploadId'>();
export const CertificateIdSchema = brandedUuid<'CertificateId'>();

export const INITIAL_CITY_SLUG = 'sikar-rajasthan' as const;
export const INITIAL_CITY_TIME_ZONE = 'Asia/Kolkata' as const;
export const PHASE_ONE_COUNTRY_CODE = 'IN' as const;
export const PHASE_ONE_CURRENCY = 'INR' as const;
export const MAX_CURSOR_PAGE_LIMIT = 100;

export const IsoUtcDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .refine((value) => value.endsWith('Z'), 'Timestamp must use UTC');

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD')
  .refine((value) => {
    const parsed = new Date(value + 'T00:00:00.000Z');
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Date must be a real calendar date');

export const LocalTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must use HH:mm');
export const IanaTimeZoneSchema = z
  .string()
  .trim()
  .min(3)
  .max(100)
  .regex(/^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)+$/, 'Invalid IANA timezone');
export const SlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must use lower-case kebab-case');
export const NameSchema = z.string().trim().min(2).max(120);
export const DescriptionSchema = z.string().trim().min(1).max(2_000);
export const ShortReasonSchema = z.string().trim().min(1).max(500);
export const InternalNoteSchema = z.string().trim().min(1).max(2_000);
export const ReasonCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/, 'Reason code must use upper snake case');
export const VersionSchema = z.number().int().positive();
export const PositiveDurationMinutesSchema = z
  .number()
  .int()
  .min(5)
  .max(24 * 60);
export const POSTGRES_INTEGER_MAX = 2_147_483_647;
export const PaiseSchema = z.number().int().nonnegative().max(POSTGRES_INTEGER_MAX);
export const PositivePaiseSchema = z.number().int().positive().max(POSTGRES_INTEGER_MAX);

export const CursorSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .transform((value): Cursor => value as Cursor);

export const SearchTermSchema = z.string().trim().min(2).max(100);

export const QueryPageLimitSchema = z.coerce.number().int().min(1).max(MAX_CURSOR_PAGE_LIMIT);
export const QueryPaiseSchema = z.coerce.number().int().nonnegative().max(POSTGRES_INTEGER_MAX);

export function createQueryArraySchema<T extends z.ZodType>(itemSchema: T, maximumItems: number) {
  return z.preprocess(
    (value) =>
      typeof value === 'string'
        ? value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : value,
    z.array(itemSchema).max(maximumItems),
  );
}

export const CursorPaginationQuerySchema = z
  .object({
    after: CursorSchema.optional(),
    limit: QueryPageLimitSchema.optional(),
  })
  .strict();

export const CursorPageInfoSchema = z
  .object({
    nextCursor: CursorSchema.nullable(),
    hasNextPage: z.boolean(),
  })
  .strict();

export function createCursorPageSchema<T extends z.ZodType>(itemSchema: T) {
  return z
    .object({
      data: z.array(itemSchema),
      pageInfo: CursorPageInfoSchema,
    })
    .strict();
}

export const MoneySchema = z
  .object({
    amountPaise: PaiseSchema,
    currency: z.literal(PHASE_ONE_CURRENCY),
  })
  .strict();

export function hasUniqueValues<T>(values: readonly T[]): boolean {
  return new Set(values).size === values.length;
}

export function hasMutableField(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) => key !== 'expectedVersion');
}

export function minutesFromLocalTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export type LocalInterval = {
  startLocalTime: string;
  endLocalTime: string;
};

export function intervalsDoNotOverlap(intervals: readonly LocalInterval[]): boolean {
  const sorted = [...intervals].sort(
    (left, right) =>
      minutesFromLocalTime(left.startLocalTime) - minutesFromLocalTime(right.startLocalTime),
  );

  return sorted.every((current, index) => {
    if (index === 0) return true;
    const previous = sorted[index - 1];
    return (
      previous === undefined ||
      minutesFromLocalTime(current.startLocalTime) >= minutesFromLocalTime(previous.endLocalTime)
    );
  });
}
