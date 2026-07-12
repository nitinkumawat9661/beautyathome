import {
  AdminServiceRequestSchema,
  ModeratedMediaAssetSchema,
  OwnProfessionalServiceSchema,
  PublicProfessionalServiceSchema,
  ProfessionalServiceRequestSchema,
} from '@beautyathome/marketplace';
import type { Prisma } from '@beautyathome/database';

import { presentCategory, presentPolicy } from '../catalog/catalog.presenter';

type OfferingRecord = Prisma.ProfessionalServiceGetPayload<{
  include: {
    service: { include: { category: true; images: true } };
    pricePolicy: { include: { city: true } };
    assets: { include: { portfolioAsset: true } };
  };
}>;

export function presentOwnOffering(offering: OfferingRecord) {
  if (!offering.pricePolicy) return null;
  return OwnProfessionalServiceSchema.parse({
    id: offering.id,
    masterService: {
      id: offering.service.id,
      category: presentCategory(offering.service.category),
      name: offering.service.name,
      slug: offering.service.slug,
      description: offering.service.description,
      defaultDurationMinutes: offering.service.defaultDurationMinutes,
      images: [],
      cityPricePolicy: presentPolicy(offering.pricePolicy),
      status: offering.service.status,
    },
    pricePaise: offering.pricePaise,
    estimatedDurationMinutes: offering.estimatedDurationMinutes,
    state: offering.state,
    portfolioImages: offering.assets.map(({ portfolioAsset }) =>
      ModeratedMediaAssetSchema.parse({
        id: portfolioAsset.id,
        uploadId: portfolioAsset.uploadId,
        moderationStatus: portfolioAsset.moderationStatus,
        publicAsset: null,
        userSafeRejectionReason: portfolioAsset.userSafeRejectionReason,
      }),
    ),
    userSafeAdminReason: offering.userSafeAdminReason,
    version: offering.version,
    updatedAt: offering.updatedAt.toISOString(),
  });
}

export function presentPublicOffering(offering: OfferingRecord) {
  return PublicProfessionalServiceSchema.parse({
    id: offering.id,
    professionalId: offering.professionalId,
    masterServiceId: offering.serviceId,
    cityId: offering.cityId,
    name: offering.service.name,
    description: offering.service.description,
    pricePaise: offering.pricePaise,
    estimatedDurationMinutes: offering.estimatedDurationMinutes,
    portfolioImages: [],
  });
}

type RequestRecord = Prisma.ProfessionalServiceRequestGetPayload<{
  include: { cities: true };
}>;

function requestCore(request: RequestRecord) {
  return {
    id: request.id,
    categoryId: request.categoryId,
    proposedName: request.proposedName,
    proposedDescription: request.proposedDescription,
    requestedCityIds: request.cities.map((city) => city.cityId),
    suggestedDurationMinutes: request.suggestedDurationMinutes,
    suggestedPricePaise: request.suggestedPricePaise,
    status: request.status,
    linkedMasterServiceId: request.linkedServiceId,
    version: request.version,
    submittedAt: request.submittedAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

export function presentOwnServiceRequest(request: RequestRecord) {
  return ProfessionalServiceRequestSchema.parse({
    ...requestCore(request),
    userSafeDecisionReason: request.userSafeDecisionReason,
  });
}

export function presentAdminServiceRequest(request: RequestRecord) {
  return AdminServiceRequestSchema.parse({
    ...requestCore(request),
    requestedByProfessionalId: request.professionalId,
    userSafeDecisionReason: request.userSafeDecisionReason,
    internalNote: request.internalNote,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    reviewedByAdminId: request.reviewedByUserId,
  });
}
