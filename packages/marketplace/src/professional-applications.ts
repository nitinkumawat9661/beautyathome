import { IndiaMobileNumberSchema } from '@beautyathome/auth';
import { z } from 'zod';

export const PROFESSIONAL_APPLICATION_EXPERIENCE_BANDS = [
  'LESS_THAN_ONE',
  'ONE_TO_TWO',
  'THREE_TO_FIVE',
  'SIX_PLUS',
] as const;

export const PROFESSIONAL_APPLICATION_SERVICE_CODES = [
  'HAIR_CARE',
  'SKIN_FACIAL',
  'MAKEUP',
  'NAIL_CARE',
  'WAXING_GROOMING',
] as const;

export const ProfessionalApplicationExperienceBandSchema = z.enum(
  PROFESSIONAL_APPLICATION_EXPERIENCE_BANDS,
);
export const ProfessionalApplicationServiceCodeSchema = z.enum(
  PROFESSIONAL_APPLICATION_SERVICE_CODES,
);

function normalizeMobileNumber(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const compact = value.trim().replace(/[()\s-]/g, '');
  if (/^[6-9]\d{9}$/.test(compact)) return `+91${compact}`;
  if (/^91[6-9]\d{9}$/.test(compact)) return `+${compact}`;
  return compact;
}

const ProfessionalApplicationMobileNumberSchema = z.preprocess(
  normalizeMobileNumber,
  IndiaMobileNumberSchema,
);

export const ProfessionalApplicationInputSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    mobileNumber: ProfessionalApplicationMobileNumberSchema,
    city: z.string().trim().min(2).max(120),
    experienceBand: ProfessionalApplicationExperienceBandSchema,
    services: z
      .array(ProfessionalApplicationServiceCodeSchema)
      .min(1)
      .max(PROFESSIONAL_APPLICATION_SERVICE_CODES.length)
      .refine((values) => new Set(values).size === values.length, 'Services must be unique'),
    coverage: z.string().trim().min(3).max(500),
    workSummary: z.string().trim().min(20).max(2_000),
    consent: z.literal(true),
  })
  .strict();

export const ProfessionalApplicationAcceptedSchema = z
  .object({
    accepted: z.literal(true),
    referenceId: z.string().uuid(),
    submittedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type ProfessionalApplicationInput = z.infer<typeof ProfessionalApplicationInputSchema>;
export type ProfessionalApplicationAccepted = z.infer<typeof ProfessionalApplicationAcceptedSchema>;
