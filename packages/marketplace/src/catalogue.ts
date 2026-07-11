import { z } from 'zod';

import { PublicCitySchema } from './geography.js';
import {
  CityIdSchema,
  DescriptionSchema,
  InternalNoteSchema,
  IsoUtcDateTimeSchema,
  MasterServiceIdSchema,
  NameSchema,
  PaiseSchema,
  PositiveDurationMinutesSchema,
  QueryPageLimitSchema,
  ReasonCodeSchema,
  SearchTermSchema,
  ServiceCategoryIdSchema,
  ServicePricePolicyIdSchema,
  ServiceRequestIdSchema,
  ShortReasonSchema,
  SlugSchema,
  UploadIdSchema,
  VersionSchema,
  createCursorPageSchema,
  hasMutableField,
  hasUniqueValues,
} from './primitives.js';

export const SERVICE_CATEGORY_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const MASTER_SERVICE_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export const PRICE_POLICY_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const SERVICE_REQUEST_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
] as const;
export const SERVICE_SORTS = ['displayOrderAsc', 'nameAsc', 'createdAtDesc'] as const;

export const ServiceCategoryStatusSchema = z.enum(SERVICE_CATEGORY_STATUSES);
export const MasterServiceStatusSchema = z.enum(MASTER_SERVICE_STATUSES);
export const PricePolicyStatusSchema = z.enum(PRICE_POLICY_STATUSES);
export const ServiceRequestStatusSchema = z.enum(SERVICE_REQUEST_STATUSES);
export const ServiceSortSchema = z.enum(SERVICE_SORTS);

export const ServiceImageInputSchema = z
  .object({
    uploadId: UploadIdSchema,
    altText: z.string().trim().min(1).max(180),
    displayOrder: z.number().int().nonnegative(),
  })
  .strict();

export const PublicServiceImageSchema = z
  .object({
    id: z.string().uuid(),
    url: z
      .string()
      .url()
      .refine((value) => value.startsWith('https://'), 'Image URL must use HTTPS'),
    altText: z.string().trim().min(1).max(180),
    displayOrder: z.number().int().nonnegative(),
  })
  .strict();

export const PublicServiceCategorySchema = z
  .object({
    id: ServiceCategoryIdSchema,
    name: NameSchema,
    slug: SlugSchema,
    description: DescriptionSchema.nullable(),
    displayOrder: z.number().int().nonnegative(),
  })
  .strict();

export const AdminServiceCategorySchema = PublicServiceCategorySchema.extend({
  status: ServiceCategoryStatusSchema,
  version: VersionSchema,
  createdAt: IsoUtcDateTimeSchema,
  updatedAt: IsoUtcDateTimeSchema,
}).strict();

export const ServiceCategoryCreateSchema = z
  .object({
    name: NameSchema,
    slug: SlugSchema,
    description: DescriptionSchema.nullable().optional(),
    displayOrder: z.number().int().nonnegative(),
  })
  .strict();

export const ServiceCategoryUpdateSchema = ServiceCategoryCreateSchema.partial()
  .extend({ expectedVersion: VersionSchema })
  .strict()
  .refine(hasMutableField, 'At least one category field is required');

export const ServiceCategoryStatusChangeSchema = z
  .object({
    action: z.enum(['ACTIVATE', 'DEACTIVATE']),
    reasonCode: ReasonCodeSchema,
    reason: ShortReasonSchema,
    expectedVersion: VersionSchema,
  })
  .strict();

const PriceBoundsShape = {
  minimumPricePaise: PaiseSchema,
  maximumPricePaise: PaiseSchema,
};

export const ServiceCityPricePolicyInputSchema = z
  .object({
    cityId: CityIdSchema,
    ...PriceBoundsShape,
    effectiveFrom: IsoUtcDateTimeSchema,
  })
  .strict()
  .refine(
    (policy) => policy.maximumPricePaise >= policy.minimumPricePaise,
    'Maximum price must be greater than or equal to minimum price',
  );

export const ServiceCityPricePolicySchema = z
  .object({
    id: ServicePricePolicyIdSchema,
    serviceId: MasterServiceIdSchema,
    city: PublicCitySchema,
    version: VersionSchema,
    ...PriceBoundsShape,
    status: PricePolicyStatusSchema,
    effectiveFrom: IsoUtcDateTimeSchema,
    effectiveTo: IsoUtcDateTimeSchema.nullable(),
  })
  .strict()
  .superRefine((policy, context) => {
    if (policy.maximumPricePaise < policy.minimumPricePaise) {
      context.addIssue({
        code: 'custom',
        path: ['maximumPricePaise'],
        message: 'Maximum price is below minimum price',
      });
    }
    if (
      policy.effectiveTo !== null &&
      Date.parse(policy.effectiveTo) <= Date.parse(policy.effectiveFrom)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['effectiveTo'],
        message: 'Policy end must be after its start',
      });
    }
  });

export const ServicePricePolicyCreateSchema = ServiceCityPricePolicyInputSchema.extend({
  reasonCode: ReasonCodeSchema,
  reason: ShortReasonSchema,
  expectedServiceVersion: VersionSchema,
}).strict();

export const MasterServiceCreateSchema = z
  .object({
    categoryId: ServiceCategoryIdSchema,
    name: NameSchema,
    slug: SlugSchema,
    description: DescriptionSchema,
    defaultDurationMinutes: PositiveDurationMinutesSchema,
    images: z.array(ServiceImageInputSchema).max(10).default([]),
    cityPolicies: z.array(ServiceCityPricePolicyInputSchema).min(1).max(50),
  })
  .strict()
  .superRefine((service, context) => {
    if (!hasUniqueValues(service.images.map((image) => image.uploadId))) {
      context.addIssue({
        code: 'custom',
        path: ['images'],
        message: 'Image uploads must be unique',
      });
    }
    if (!hasUniqueValues(service.cityPolicies.map((policy) => policy.cityId))) {
      context.addIssue({
        code: 'custom',
        path: ['cityPolicies'],
        message: 'Only one initial policy is allowed per city',
      });
    }
  });

export const MasterServiceUpdateSchema = z
  .object({
    categoryId: ServiceCategoryIdSchema.optional(),
    name: NameSchema.optional(),
    slug: SlugSchema.optional(),
    description: DescriptionSchema.optional(),
    defaultDurationMinutes: PositiveDurationMinutesSchema.optional(),
    images: z.array(ServiceImageInputSchema).max(10).optional(),
    expectedVersion: VersionSchema,
  })
  .strict()
  .refine(hasMutableField, 'At least one service field is required');

export const MasterServiceStatusChangeSchema = z
  .object({
    action: z.enum(['ACTIVATE', 'DEACTIVATE', 'SUSPEND', 'REACTIVATE']),
    reasonCode: ReasonCodeSchema,
    reason: ShortReasonSchema,
    expectedVersion: VersionSchema,
  })
  .strict();

const MasterServiceCoreShape = {
  id: MasterServiceIdSchema,
  category: PublicServiceCategorySchema,
  name: NameSchema,
  slug: SlugSchema,
  description: DescriptionSchema,
  defaultDurationMinutes: PositiveDurationMinutesSchema,
  images: z.array(PublicServiceImageSchema).max(10),
};

export const PublicMasterServiceSchema = z
  .object({
    ...MasterServiceCoreShape,
    status: z.literal('ACTIVE'),
    cityPricePolicy: ServiceCityPricePolicySchema,
  })
  .strict();

export const AdminMasterServiceSchema = z
  .object({
    ...MasterServiceCoreShape,
    status: MasterServiceStatusSchema,
    cityPricePolicies: z.array(ServiceCityPricePolicySchema),
    createdByAdminId: z.string().uuid(),
    version: VersionSchema,
    createdAt: IsoUtcDateTimeSchema,
    updatedAt: IsoUtcDateTimeSchema,
  })
  .strict();

export const PublicServiceListQuerySchema = z
  .object({
    categoryId: ServiceCategoryIdSchema.optional(),
    cityId: CityIdSchema,
    search: SearchTermSchema.optional(),
    sort: ServiceSortSchema.optional(),
    after: z.string().trim().min(1).max(512).optional(),
    limit: QueryPageLimitSchema.optional(),
  })
  .strict();

export const AdminServiceListQuerySchema = PublicServiceListQuerySchema.omit({ cityId: true })
  .extend({
    cityId: CityIdSchema.optional(),
    status: MasterServiceStatusSchema.optional(),
  })
  .strict();

export const ProfessionalServiceRequestCreateSchema = z
  .object({
    categoryId: ServiceCategoryIdSchema,
    proposedName: NameSchema,
    proposedDescription: DescriptionSchema,
    requestedCityIds: z
      .array(CityIdSchema)
      .min(1)
      .max(50)
      .refine(hasUniqueValues, 'Cities must be unique'),
    suggestedDurationMinutes: PositiveDurationMinutesSchema.optional(),
    suggestedPricePaise: PaiseSchema.optional(),
  })
  .strict();

const ServiceRequestCoreShape = {
  id: ServiceRequestIdSchema,
  categoryId: ServiceCategoryIdSchema,
  proposedName: NameSchema,
  proposedDescription: DescriptionSchema,
  requestedCityIds: z.array(CityIdSchema).min(1),
  suggestedDurationMinutes: PositiveDurationMinutesSchema.nullable(),
  suggestedPricePaise: PaiseSchema.nullable(),
  status: ServiceRequestStatusSchema,
  linkedMasterServiceId: MasterServiceIdSchema.nullable(),
  version: VersionSchema,
  submittedAt: IsoUtcDateTimeSchema,
  updatedAt: IsoUtcDateTimeSchema,
};

export const ProfessionalServiceRequestSchema = z
  .object({
    ...ServiceRequestCoreShape,
    userSafeDecisionReason: ShortReasonSchema.nullable(),
  })
  .strict();

export const AdminServiceRequestSchema = z
  .object({
    ...ServiceRequestCoreShape,
    requestedByProfessionalId: z.string().uuid(),
    userSafeDecisionReason: ShortReasonSchema.nullable(),
    internalNote: InternalNoteSchema.nullable(),
    reviewedAt: IsoUtcDateTimeSchema.nullable(),
    reviewedByAdminId: z.string().uuid().nullable(),
  })
  .strict();

export const ServiceRequestStartReviewSchema = z
  .object({
    expectedVersion: VersionSchema,
  })
  .strict();

const LinkExistingResolutionSchema = z
  .object({
    mode: z.literal('LINK_EXISTING'),
    masterServiceId: MasterServiceIdSchema,
  })
  .strict();

const CreateInactiveResolutionSchema = z
  .object({
    mode: z.literal('CREATE_INACTIVE_MASTER_SERVICE'),
    service: MasterServiceCreateSchema,
  })
  .strict();

export const AdminServiceRequestDecisionSchema = z.discriminatedUnion('decision', [
  z
    .object({
      decision: z.literal('APPROVE'),
      resolution: z.discriminatedUnion('mode', [
        LinkExistingResolutionSchema,
        CreateInactiveResolutionSchema,
      ]),
      reasonCode: ReasonCodeSchema,
      internalNote: InternalNoteSchema.optional(),
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
]);

export const ServiceRequestListQuerySchema = z
  .object({
    status: ServiceRequestStatusSchema.optional(),
    categoryId: ServiceCategoryIdSchema.optional(),
    cityId: CityIdSchema.optional(),
    search: SearchTermSchema.optional(),
    sort: z.enum(['submittedAtAsc', 'submittedAtDesc', 'updatedAtDesc']).optional(),
    after: z.string().trim().min(1).max(512).optional(),
    limit: QueryPageLimitSchema.optional(),
  })
  .strict();

export const PublicServiceCategoryPageSchema = createCursorPageSchema(PublicServiceCategorySchema);
export const PublicMasterServicePageSchema = createCursorPageSchema(PublicMasterServiceSchema);
export const ProfessionalServiceRequestPageSchema = createCursorPageSchema(
  ProfessionalServiceRequestSchema,
);
export const AdminServiceRequestPageSchema = createCursorPageSchema(AdminServiceRequestSchema);

export function isPriceWithinPolicy(
  pricePaise: number,
  policy: Pick<
    z.infer<typeof ServiceCityPricePolicySchema>,
    'minimumPricePaise' | 'maximumPricePaise'
  >,
): boolean {
  return (
    Number.isInteger(pricePaise) &&
    pricePaise >= policy.minimumPricePaise &&
    pricePaise <= policy.maximumPricePaise
  );
}

export type ServiceCategoryStatus = z.infer<typeof ServiceCategoryStatusSchema>;
export type MasterServiceStatus = z.infer<typeof MasterServiceStatusSchema>;
export type ServiceCityPricePolicy = z.infer<typeof ServiceCityPricePolicySchema>;
export type MasterServiceCreate = z.infer<typeof MasterServiceCreateSchema>;
export type PublicMasterService = z.infer<typeof PublicMasterServiceSchema>;
export type ProfessionalServiceRequestCreate = z.infer<
  typeof ProfessionalServiceRequestCreateSchema
>;
export type AdminServiceRequestDecision = z.infer<typeof AdminServiceRequestDecisionSchema>;
