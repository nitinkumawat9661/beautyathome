import { UserStatusSchema, VerificationStatusSchema } from '@beautyathome/auth';
import { z } from 'zod';

import { PublicMasterServiceSchema } from './catalogue.js';
import { PublicServiceAreaSchema } from './geography.js';
import {
  CertificateIdSchema,
  CityIdSchema,
  DescriptionSchema,
  InternalNoteSchema,
  IsoDateSchema,
  IsoUtcDateTimeSchema,
  MasterServiceIdSchema,
  NameSchema,
  PaiseSchema,
  PositiveDurationMinutesSchema,
  QueryPageLimitSchema,
  QueryPaiseSchema,
  ProfessionalIdSchema,
  ProfessionalServiceIdSchema,
  ReasonCodeSchema,
  SearchTermSchema,
  ServiceAreaIdSchema,
  ShortReasonSchema,
  UploadIdSchema,
  VerificationApplicationIdSchema,
  VersionSchema,
  createCursorPageSchema,
  createQueryArraySchema,
  hasMutableField,
  hasUniqueValues,
} from './primitives.js';

export const MEDIA_MODERATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const PROFESSIONAL_SERVICE_STATES = ['ENABLED', 'DISABLED', 'SUSPENDED'] as const;
export const LAUNCH_ELIGIBILITY_STATUSES = [
  'NOT_ASSESSED',
  'UNDER_REVIEW',
  'ELIGIBLE',
  'INELIGIBLE',
  'SUSPENDED',
] as const;
export const VERIFICATION_APPLICATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
] as const;
export const PROFESSIONAL_SORTS = ['ratingDesc', 'priceAsc', 'experienceDesc'] as const;

export const MediaModerationStatusSchema = z.enum(MEDIA_MODERATION_STATUSES);
export const ProfessionalServiceStateSchema = z.enum(PROFESSIONAL_SERVICE_STATES);
export const LaunchEligibilityStatusSchema = z.enum(LAUNCH_ELIGIBILITY_STATUSES);
export const VerificationApplicationStatusSchema = z.enum(VERIFICATION_APPLICATION_STATUSES);
export const ProfessionalSortSchema = z.enum(PROFESSIONAL_SORTS);

export const LanguageCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(35)
  .regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/, 'Language must use a BCP 47 tag');

export const MediaUploadInputSchema = z
  .object({
    uploadId: UploadIdSchema,
    altText: z.string().trim().min(1).max(180),
    displayOrder: z.number().int().nonnegative(),
  })
  .strict();

export const PublicMediaAssetSchema = z
  .object({
    id: z.string().uuid(),
    url: z
      .string()
      .url()
      .refine((value) => value.startsWith('https://'), 'Media URL must use HTTPS'),
    altText: z.string().trim().min(1).max(180),
    displayOrder: z.number().int().nonnegative(),
  })
  .strict();

export const ModeratedMediaAssetSchema = z
  .object({
    id: z.string().uuid(),
    uploadId: UploadIdSchema,
    moderationStatus: MediaModerationStatusSchema,
    publicAsset: PublicMediaAssetSchema.nullable(),
    userSafeRejectionReason: ShortReasonSchema.nullable(),
  })
  .strict();

export const ProfessionalCertificateInputSchema = z
  .object({
    uploadId: UploadIdSchema,
    title: NameSchema,
    issuer: NameSchema,
    issuedOn: IsoDateSchema,
    expiresOn: IsoDateSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (certificate) => certificate.expiresOn == null || certificate.expiresOn >= certificate.issuedOn,
    'Certificate expiry cannot precede issue date',
  );

export const ProfessionalCertificateSchema = z
  .object({
    id: CertificateIdSchema,
    title: NameSchema,
    issuer: NameSchema,
    issuedOn: IsoDateSchema,
    expiresOn: IsoDateSchema.nullable(),
    moderationStatus: MediaModerationStatusSchema,
    userSafeRejectionReason: ShortReasonSchema.nullable(),
  })
  .strict();

export const ProfessionalProfileUpdateSchema = z
  .object({
    displayName: NameSchema.optional(),
    profileImageUploadId: UploadIdSchema.nullable().optional(),
    biography: DescriptionSchema.nullable().optional(),
    experienceYears: z.number().int().min(0).max(80).optional(),
    languageCodes: z
      .array(LanguageCodeSchema)
      .min(1)
      .max(20)
      .refine(hasUniqueValues, 'Languages must be unique')
      .optional(),
    serviceAreaIds: z
      .array(ServiceAreaIdSchema)
      .min(1)
      .max(50)
      .refine(hasUniqueValues, 'Service areas must be unique')
      .optional(),
    expectedVersion: VersionSchema,
  })
  .strict()
  .refine(hasMutableField, 'At least one profile field is required');

export const ProfessionalPortfolioUpdateSchema = z
  .object({
    items: z
      .array(MediaUploadInputSchema)
      .max(30)
      .refine(
        (items) => hasUniqueValues(items.map((item) => item.uploadId)),
        'Portfolio uploads must be unique',
      ),
    expectedVersion: VersionSchema,
  })
  .strict();

export const ProfessionalCertificatesUpdateSchema = z
  .object({
    certificates: z
      .array(ProfessionalCertificateInputSchema)
      .max(30)
      .refine(
        (items) => hasUniqueValues(items.map((item) => item.uploadId)),
        'Certificate uploads must be unique',
      ),
    expectedVersion: VersionSchema,
  })
  .strict();

export const LaunchEligibilityAssessmentSchema = z
  .object({
    policyCode: z.literal('PHASE_1_VERIFIED_FEMALE_PROFESSIONAL'),
    policyVersion: z.string().trim().min(1).max(100).nullable(),
    status: LaunchEligibilityStatusSchema,
    reviewedAt: IsoUtcDateTimeSchema.nullable(),
  })
  .strict();

export const ProfessionalMetricsSchema = z
  .object({
    averageRating: z.number().min(1).max(5).nullable(),
    ratingCount: z.number().int().nonnegative(),
    completedJobs: z.number().int().nonnegative(),
  })
  .strict();

export const PublicProfessionalProfileSchema = z
  .object({
    id: ProfessionalIdSchema,
    displayName: NameSchema,
    profileImage: PublicMediaAssetSchema.nullable(),
    biography: DescriptionSchema.nullable(),
    experienceYears: z.number().int().min(0).max(80),
    languageCodes: z.array(LanguageCodeSchema),
    serviceAreas: z.array(PublicServiceAreaSchema),
    verificationStatus: z.literal('APPROVED'),
    portfolio: z.array(PublicMediaAssetSchema),
    certificates: z.array(
      ProfessionalCertificateSchema.pick({
        id: true,
        title: true,
        issuer: true,
        issuedOn: true,
        expiresOn: true,
      }).strict(),
    ),
    metrics: ProfessionalMetricsSchema,
  })
  .strict();

export const ProfessionalOwnProfileSchema = z
  .object({
    id: ProfessionalIdSchema,
    displayName: NameSchema.nullable(),
    profileImage: ModeratedMediaAssetSchema.nullable(),
    biography: DescriptionSchema.nullable(),
    experienceYears: z.number().int().min(0).max(80).nullable(),
    languageCodes: z.array(LanguageCodeSchema),
    serviceAreas: z.array(PublicServiceAreaSchema),
    verificationStatus: VerificationStatusSchema,
    launchEligibility: LaunchEligibilityAssessmentSchema,
    accountStatus: UserStatusSchema,
    isServiceActive: z.boolean(),
    portfolio: z.array(ModeratedMediaAssetSchema),
    certificates: z.array(ProfessionalCertificateSchema),
    metrics: ProfessionalMetricsSchema,
    userSafeVerificationReason: ShortReasonSchema.nullable(),
    version: VersionSchema,
    updatedAt: IsoUtcDateTimeSchema,
  })
  .strict();

export const InternalProfessionalScoreSchema = z
  .object({
    value: z.number().finite(),
    version: z.string().trim().min(1).max(100),
    updatedAt: IsoUtcDateTimeSchema,
    restricted: z.literal(true),
  })
  .strict();

export const AdminProfessionalProfileSchema = ProfessionalOwnProfileSchema.omit({
  userSafeVerificationReason: true,
})
  .extend({
    userSafeVerificationReason: ShortReasonSchema.nullable(),
    internalProfessionalScore: InternalProfessionalScoreSchema.nullable(),
    internalVerificationNotesCount: z.number().int().nonnegative(),
  })
  .strict();

export const ProfessionalVerificationSubmissionSchema = z
  .object({
    eligibilityPolicyVersionAcknowledged: z.string().trim().min(1).max(100),
    eligibilityDeclarationAccepted: z.literal(true),
    certificateIds: z
      .array(CertificateIdSchema)
      .max(30)
      .refine(hasUniqueValues, 'Certificates must be unique'),
    expectedProfileVersion: VersionSchema,
  })
  .strict();

export const ProfessionalVerificationApplicationSchema = z
  .object({
    id: VerificationApplicationIdSchema,
    version: VersionSchema,
    status: VerificationApplicationStatusSchema,
    submittedAt: IsoUtcDateTimeSchema.nullable(),
    reviewedAt: IsoUtcDateTimeSchema.nullable(),
    userSafeDecisionReason: ShortReasonSchema.nullable(),
    correctionAllowed: z.boolean(),
  })
  .strict();

export const AdminVerificationApplicationSchema = ProfessionalVerificationApplicationSchema.extend({
  professionalId: ProfessionalIdSchema,
  eligibilityPolicyVersionAcknowledged: z.string().trim().min(1).max(100),
  internalNote: InternalNoteSchema.nullable(),
  reviewerAdminId: z.string().uuid().nullable(),
}).strict();

export const VerificationStartReviewSchema = z.object({ expectedVersion: VersionSchema }).strict();

export const AdminVerificationDecisionSchema = z.discriminatedUnion('decision', [
  z
    .object({
      decision: z.literal('APPROVE'),
      eligibilityPolicyVersionReviewed: z.string().trim().min(1).max(100),
      reasonCode: ReasonCodeSchema,
      internalNote: InternalNoteSchema,
      expectedVersion: VersionSchema,
    })
    .strict(),
  z
    .object({
      decision: z.literal('REJECT'),
      reasonCode: ReasonCodeSchema,
      userMessage: ShortReasonSchema,
      internalNote: InternalNoteSchema.optional(),
      expectedVersion: VersionSchema,
    })
    .strict(),
  z
    .object({
      decision: z.literal('REQUEST_CHANGES'),
      reasonCode: z.literal('CORRECTION_REQUIRED'),
      userMessage: ShortReasonSchema,
      internalNote: InternalNoteSchema.optional(),
      expectedVersion: VersionSchema,
    })
    .strict(),
]);

export const AdminVerificationNoteCreateSchema = z
  .object({
    note: InternalNoteSchema,
    expectedVersion: VersionSchema,
  })
  .strict();

export const ProfessionalServiceUpsertSchema = z
  .object({
    cityId: CityIdSchema,
    pricePaise: PaiseSchema,
    estimatedDurationMinutes: PositiveDurationMinutesSchema,
    isEnabled: z.boolean(),
    portfolioImages: z
      .array(MediaUploadInputSchema)
      .max(10)
      .refine(
        (items) => hasUniqueValues(items.map((item) => item.uploadId)),
        'Service portfolio uploads must be unique',
      ),
    expectedVersion: VersionSchema.optional(),
  })
  .strict();

export const ProfessionalServiceStatusChangeSchema = z
  .object({
    action: z.enum(['SUSPEND', 'REACTIVATE']),
    reasonCode: ReasonCodeSchema,
    userMessage: ShortReasonSchema,
    internalNote: InternalNoteSchema.optional(),
    expectedVersion: VersionSchema,
  })
  .strict();

export const OwnProfessionalServiceSchema = z
  .object({
    id: ProfessionalServiceIdSchema,
    masterService: PublicMasterServiceSchema.omit({ status: true })
      .extend({
        status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
      })
      .strict(),
    pricePaise: PaiseSchema,
    estimatedDurationMinutes: PositiveDurationMinutesSchema,
    state: ProfessionalServiceStateSchema,
    portfolioImages: z.array(ModeratedMediaAssetSchema),
    userSafeAdminReason: ShortReasonSchema.nullable(),
    version: VersionSchema,
    updatedAt: IsoUtcDateTimeSchema,
  })
  .strict();

export const PublicProfessionalServiceSchema = z
  .object({
    id: ProfessionalServiceIdSchema,
    professionalId: ProfessionalIdSchema,
    masterServiceId: MasterServiceIdSchema,
    cityId: CityIdSchema,
    name: NameSchema,
    description: DescriptionSchema,
    pricePaise: PaiseSchema,
    estimatedDurationMinutes: PositiveDurationMinutesSchema,
    portfolioImages: z.array(PublicMediaAssetSchema),
  })
  .strict();

export const ProfessionalDiscoveryQuerySchema = z
  .object({
    serviceId: MasterServiceIdSchema.optional(),
    cityId: CityIdSchema,
    serviceAreaId: ServiceAreaIdSchema.optional(),
    date: IsoDateSchema.optional(),
    minimumRating: z.coerce.number().min(1).max(5).optional(),
    minimumPricePaise: QueryPaiseSchema.optional(),
    maximumPricePaise: QueryPaiseSchema.optional(),
    minimumExperienceYears: z.coerce.number().int().min(0).max(80).optional(),
    languageCodes: createQueryArraySchema(LanguageCodeSchema, 20).optional(),
    search: SearchTermSchema.optional(),
    sort: ProfessionalSortSchema.optional(),
    after: z.string().trim().min(1).max(512).optional(),
    limit: QueryPageLimitSchema.optional(),
  })
  .strict()
  .refine(
    (query) =>
      query.maximumPricePaise === undefined ||
      query.minimumPricePaise === undefined ||
      query.maximumPricePaise >= query.minimumPricePaise,
    'Maximum price must be greater than or equal to minimum price',
  );

export const AdminProfessionalListQuerySchema = z
  .object({
    verificationStatus: VerificationStatusSchema.optional(),
    accountStatus: UserStatusSchema.optional(),
    launchEligibilityStatus: LaunchEligibilityStatusSchema.optional(),
    serviceAreaId: ServiceAreaIdSchema.optional(),
    search: SearchTermSchema.optional(),
    sort: z.enum(['submittedAtAsc', 'submittedAtDesc', 'updatedAtDesc', 'ratingDesc']).optional(),
    after: z.string().trim().min(1).max(512).optional(),
    limit: QueryPageLimitSchema.optional(),
  })
  .strict();

export const PublicProfessionalPageSchema = createCursorPageSchema(PublicProfessionalProfileSchema);
export const AdminProfessionalPageSchema = createCursorPageSchema(AdminProfessionalProfileSchema);
export const OwnProfessionalServicePageSchema = createCursorPageSchema(
  OwnProfessionalServiceSchema,
);
export const VerificationApplicationPageSchema = createCursorPageSchema(
  AdminVerificationApplicationSchema,
);

export type ProfessionalProfileUpdate = z.infer<typeof ProfessionalProfileUpdateSchema>;
export type PublicProfessionalProfile = z.infer<typeof PublicProfessionalProfileSchema>;
export type ProfessionalOwnProfile = z.infer<typeof ProfessionalOwnProfileSchema>;
export type AdminProfessionalProfile = z.infer<typeof AdminProfessionalProfileSchema>;
export type ProfessionalServiceUpsert = z.infer<typeof ProfessionalServiceUpsertSchema>;
export type AdminVerificationDecision = z.infer<typeof AdminVerificationDecisionSchema>;
