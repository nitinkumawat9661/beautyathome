import {
  AdminMasterServiceSchema,
  AdminServiceAreaSchema,
  AdminServiceCategorySchema,
  PublicCitySchema,
  PublicMasterServiceSchema,
  PublicServiceAreaSchema,
  PublicServiceCategorySchema,
  ServiceCityPricePolicySchema,
} from '@beautyathome/marketplace';
import type { Prisma } from '@beautyathome/database';

export function presentCity(city: {
  id: string;
  name: string;
  slug: string;
  state: string;
  countryCode: string;
  timeZone: string;
}) {
  return PublicCitySchema.parse(city);
}

export function presentServiceArea(area: {
  id: string;
  cityId: string;
  name: string;
  slug: string;
}) {
  return PublicServiceAreaSchema.parse(area);
}

export function presentAdminServiceArea(area: {
  id: string;
  cityId: string;
  name: string;
  slug: string;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return AdminServiceAreaSchema.parse({
    ...presentServiceArea(area),
    status: area.status,
    version: area.version,
    createdAt: area.createdAt.toISOString(),
    updatedAt: area.updatedAt.toISOString(),
  });
}

export function presentCategory(category: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
}) {
  return PublicServiceCategorySchema.parse(category);
}

export function presentAdminCategory(category: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return AdminServiceCategorySchema.parse({
    ...presentCategory(category),
    status: category.status,
    version: category.version,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  });
}

type PolicyRecord = {
  id: string;
  serviceId: string;
  version: number;
  minimumPricePaise: number;
  maximumPricePaise: number;
  status: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  city: {
    id: string;
    name: string;
    slug: string;
    state: string;
    countryCode: string;
    timeZone: string;
  };
};

export function presentPolicy(policy: PolicyRecord) {
  return ServiceCityPricePolicySchema.parse({
    id: policy.id,
    serviceId: policy.serviceId,
    city: presentCity(policy.city),
    version: policy.version,
    minimumPricePaise: policy.minimumPricePaise,
    maximumPricePaise: policy.maximumPricePaise,
    status: policy.status,
    effectiveFrom: policy.effectiveFrom.toISOString(),
    effectiveTo: policy.effectiveTo?.toISOString() ?? null,
  });
}

type ServiceRecord = Prisma.ServiceGetPayload<{
  include: {
    category: true;
    images: true;
    pricePolicies: { include: { city: true } };
  };
}>;

export function presentPublicService(
  service: ServiceRecord,
  policy: PolicyRecord,
) {
  return PublicMasterServiceSchema.parse({
    id: service.id,
    category: presentCategory(service.category),
    name: service.name,
    slug: service.slug,
    description: service.description,
    defaultDurationMinutes: service.defaultDurationMinutes,
    images: [],
    status: 'ACTIVE',
    cityPricePolicy: presentPolicy(policy),
  });
}

export function presentAdminService(service: ServiceRecord) {
  return AdminMasterServiceSchema.parse({
    id: service.id,
    category: presentCategory(service.category),
    name: service.name,
    slug: service.slug,
    description: service.description,
    defaultDurationMinutes: service.defaultDurationMinutes,
    images: [],
    status: service.status,
    cityPricePolicies: service.pricePolicies.map(presentPolicy),
    createdByAdminId: service.createdByUserId,
    version: service.version,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  });
}
