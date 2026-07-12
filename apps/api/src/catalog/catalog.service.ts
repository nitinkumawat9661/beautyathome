import {
  MasterServiceStatus,
  PricePolicyStatus,
  Prisma,
  ServiceCategoryStatus,
  ServiceCityStatus,
  ServiceAreaStatus,
} from '@beautyathome/database';
import {
  type AdminServiceListQuery,
  type MasterServiceCreate,
  type MasterServiceUpdate,
  type MasterServiceStatus as MasterServiceStatusValue,
  type ServiceCategoryCreate,
  type ServiceCategoryUpdate,
  type ServiceAreaCreate,
  type ServiceAreaStatusChange,
  type ServiceAreaUpdate,
  type ServicePricePolicyCreate,
  type PublicServiceListQuery,
} from '@beautyathome/marketplace';
import { HttpStatus, Injectable } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { runSerializable } from '../common/database/serializable';
import { normalizeMarketplaceName } from '../common/domain/normalization';
import { AppException } from '../common/errors/app.exception';
import { CursorService } from '../common/pagination/cursor.service';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { PrismaService } from '../database/prisma/prisma.service';
import {
  presentAdminCategory,
  presentAdminServiceArea,
  presentAdminService,
  presentCity,
  presentCategory,
  presentPolicy,
  presentPublicService,
  presentServiceArea,
} from './catalog.presenter';
import type {
  CategoryListQuerySchema,
  AdminServiceAreaListQuerySchema,
  CityListQuerySchema,
  PricePolicyActivationSchema,
  ServiceAreaListQuerySchema,
} from './catalog.validation';
import type { z } from 'zod';

type CityListQuery = z.infer<typeof CityListQuerySchema>;
type ServiceAreaListQuery = z.infer<typeof ServiceAreaListQuerySchema>;
type CategoryListQuery = z.infer<typeof CategoryListQuerySchema>;
type AdminServiceAreaListQuery = z.infer<
  typeof AdminServiceAreaListQuerySchema
>;
type PricePolicyActivation = z.infer<typeof PricePolicyActivationSchema>;

const serviceInclude = {
  category: true,
  images: { orderBy: { displayOrder: 'asc' as const } },
  cityAvailability: {
    include: { city: true },
    orderBy: { cityId: 'asc' as const },
  },
  pricePolicies: {
    include: { city: true },
    orderBy: [{ cityId: 'asc' as const }, { version: 'desc' as const }],
  },
} satisfies Prisma.ServiceInclude;

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cursors: CursorService,
    private readonly audit: AuditService,
  ) {}

  async listCities(query: CityListQuery) {
    const limit = query.limit ?? 20;
    const fingerprint = this.cursors.fingerprint({ resource: 'cities' });
    const cursor = this.cursors.decode(query.after, fingerprint);
    const records = await this.prisma.city.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      take: limit + 1,
    });
    return this.page(
      records,
      limit,
      fingerprint,
      (city) => city.name,
      presentCity,
    );
  }

  async listServiceAreas(query: ServiceAreaListQuery) {
    const limit = query.limit ?? 20;
    const fingerprint = this.cursors.fingerprint({
      resource: 'service-areas',
      cityId: query.cityId,
    });
    const cursor = this.cursors.decode(query.after, fingerprint);
    const records = await this.prisma.serviceArea.findMany({
      where: {
        cityId: query.cityId,
        status: 'ACTIVE',
        city: { status: 'ACTIVE' },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      take: limit + 1,
    });
    return this.page(
      records,
      limit,
      fingerprint,
      (area) => area.name,
      presentServiceArea,
    );
  }

  async listAdminServiceAreas(query: AdminServiceAreaListQuery) {
    const limit = query.limit ?? 20;
    const fingerprint = this.cursors.fingerprint({
      ...query,
      after: undefined,
      resource: 'admin-service-areas',
    });
    const cursor = this.cursors.decode(query.after, fingerprint);
    const records = await this.prisma.serviceArea.findMany({
      where: {
        cityId: query.cityId,
        status: query.status,
        ...(query.search
          ? {
              OR: [
                {
                  name: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  slug: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      take: limit + 1,
    });
    return this.page(
      records,
      limit,
      fingerprint,
      (area) => area.name,
      presentAdminServiceArea,
    );
  }

  async createServiceArea(
    actor: AuthenticatedActor,
    input: ServiceAreaCreate,
    requestId: string,
  ) {
    try {
      const area = await runSerializable(this.prisma, async (transaction) => {
        const city = await transaction.city.findFirst({
          where: { id: input.cityId, status: 'ACTIVE' },
        });
        if (!city) this.notFound('City');
        const created = await transaction.serviceArea.create({
          data: {
            cityId: input.cityId,
            name: input.name,
            normalizedName: normalizeMarketplaceName(input.name),
            slug: input.slug,
          },
        });
        await this.audit.record(transaction, {
          actor,
          action: 'geography.service-area.create',
          targetType: 'ServiceArea',
          targetId: created.id,
          requestId,
          after: {
            cityId: created.cityId,
            name: created.name,
            status: created.status,
          },
          changedFields: ['cityId', 'name', 'slug', 'status'],
        });
        return created;
      });
      return presentAdminServiceArea(area);
    } catch (error: unknown) {
      this.translateServiceAreaUnique(error);
    }
  }

  async updateServiceArea(
    actor: AuthenticatedActor,
    serviceAreaId: string,
    input: ServiceAreaUpdate,
    requestId: string,
  ) {
    try {
      return await runSerializable(this.prisma, async (transaction) => {
        const before = await transaction.serviceArea.findUnique({
          where: { id: serviceAreaId },
        });
        if (!before) this.notFound('Service area');
        const changed = await transaction.serviceArea.updateMany({
          where: { id: serviceAreaId, version: input.expectedVersion },
          data: {
            name: input.name,
            normalizedName: input.name
              ? normalizeMarketplaceName(input.name)
              : undefined,
            slug: input.slug,
            version: { increment: 1 },
          },
        });
        if (changed.count !== 1) this.optimisticConflict();
        const after = await transaction.serviceArea.findUniqueOrThrow({
          where: { id: serviceAreaId },
        });
        await this.audit.record(transaction, {
          actor,
          action: 'geography.service-area.update',
          targetType: 'ServiceArea',
          targetId: serviceAreaId,
          requestId,
          before: {
            name: before.name,
            slug: before.slug,
            version: before.version,
          },
          after: {
            name: after.name,
            slug: after.slug,
            version: after.version,
          },
          changedFields: Object.keys(input).filter(
            (key) => key !== 'expectedVersion',
          ),
        });
        return presentAdminServiceArea(after);
      });
    } catch (error: unknown) {
      this.translateServiceAreaUnique(error);
    }
  }

  async changeServiceAreaStatus(
    actor: AuthenticatedActor,
    serviceAreaId: string,
    input: ServiceAreaStatusChange,
    requestId: string,
  ) {
    return runSerializable(this.prisma, async (transaction) => {
      const before = await transaction.serviceArea.findUnique({
        where: { id: serviceAreaId },
      });
      if (!before) this.notFound('Service area');
      const status =
        input.action === 'ACTIVATE'
          ? ServiceAreaStatus.ACTIVE
          : ServiceAreaStatus.INACTIVE;
      if (before.status === status) this.invalidTransition();
      const changed = await transaction.serviceArea.updateMany({
        where: { id: serviceAreaId, version: input.expectedVersion },
        data: { status, version: { increment: 1 } },
      });
      if (changed.count !== 1) this.optimisticConflict();
      const after = await transaction.serviceArea.findUniqueOrThrow({
        where: { id: serviceAreaId },
      });
      await this.audit.record(transaction, {
        actor,
        action: 'geography.service-area.status',
        targetType: 'ServiceArea',
        targetId: serviceAreaId,
        requestId,
        reasonCode: input.reasonCode,
        before: { status: before.status, version: before.version },
        after: { status: after.status, version: after.version },
        changedFields: ['status', 'version'],
      });
      return presentAdminServiceArea(after);
    });
  }

  async listCategories(query: CategoryListQuery, admin = false) {
    const limit = query.limit ?? 20;
    const fingerprint = this.cursors.fingerprint({
      ...query,
      after: undefined,
      admin,
    });
    const cursor = this.cursors.decode(query.after, fingerprint);
    const descending = query.sort === 'createdAtDesc';
    const records = await this.prisma.serviceCategory.findMany({
      where: {
        status: admin ? query.status : ServiceCategoryStatus.ACTIVE,
        ...(query.search
          ? {
              OR: [
                {
                  name: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  description: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy:
        query.sort === 'nameAsc'
          ? [{ name: 'asc' }, { id: 'asc' }]
          : descending
            ? [{ createdAt: 'desc' }, { id: 'desc' }]
            : [{ displayOrder: 'asc' }, { id: 'asc' }],
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      take: limit + 1,
    });
    const hasNextPage = records.length > limit;
    const page = records.slice(0, limit);
    const last = page.at(-1);
    return {
      data: page.map((category) =>
        admin ? presentAdminCategory(category) : presentCategory(category),
      ),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? this.cursors.encode({
                id: last.id,
                sortValue: descending
                  ? last.createdAt.toISOString()
                  : query.sort === 'nameAsc'
                    ? last.name
                    : String(last.displayOrder),
                fingerprint,
              })
            : null,
      },
    };
  }

  async listServices(
    query: PublicServiceListQuery | AdminServiceListQuery,
    admin = false,
  ) {
    const now = new Date();
    const limit = query.limit ?? 20;
    const fingerprint = this.cursors.fingerprint({
      ...query,
      after: undefined,
      admin,
    });
    const cursor = this.cursors.decode(query.after, fingerprint);
    const adminQuery = query as AdminServiceListQuery;
    const records = await this.prisma.service.findMany({
      where: {
        categoryId: query.categoryId,
        status: admin ? adminQuery.status : MasterServiceStatus.ACTIVE,
        ...(query.search
          ? {
              OR: [
                {
                  name: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  description: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
        ...(query.cityId
          ? {
              cityAvailability: {
                some: {
                  cityId: query.cityId,
                  ...(admin ? {} : { status: ServiceCityStatus.ACTIVE }),
                },
              },
              ...(admin
                ? {}
                : {
                    pricePolicies: {
                      some: {
                        cityId: query.cityId,
                        status: PricePolicyStatus.ACTIVE,
                        effectiveFrom: { lte: now },
                        OR: [
                          { effectiveTo: null },
                          { effectiveTo: { gt: now } },
                        ],
                      },
                    },
                  }),
            }
          : {}),
        ...(admin
          ? {}
          : { category: { status: ServiceCategoryStatus.ACTIVE } }),
      },
      include: serviceInclude,
      orderBy:
        query.sort === 'nameAsc'
          ? [{ name: 'asc' }, { id: 'asc' }]
          : query.sort === 'createdAtDesc'
            ? [{ createdAt: 'desc' }, { id: 'desc' }]
            : [
                { category: { displayOrder: 'asc' } },
                { name: 'asc' },
                { id: 'asc' },
              ],
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      take: limit + 1,
    });

    const data = admin
      ? records.slice(0, limit).map(presentAdminService)
      : records.slice(0, limit).flatMap((service) => {
          const policy = service.pricePolicies.find(
            (candidate) =>
              candidate.cityId === query.cityId &&
              candidate.status === PricePolicyStatus.ACTIVE &&
              candidate.effectiveFrom <= now &&
              (candidate.effectiveTo === null || candidate.effectiveTo > now),
          );
          return policy ? [presentPublicService(service, policy)] : [];
        });
    const hasNextPage = records.length > limit;
    const last = records.slice(0, limit).at(-1);

    return {
      data,
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? this.cursors.encode({
                id: last.id,
                sortValue:
                  query.sort === 'createdAtDesc'
                    ? last.createdAt.toISOString()
                    : last.name,
                fingerprint,
              })
            : null,
      },
    };
  }

  async getPublicService(serviceId: string, cityId: string) {
    const now = new Date();
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        status: MasterServiceStatus.ACTIVE,
        category: { status: ServiceCategoryStatus.ACTIVE },
        cityAvailability: {
          some: { cityId, status: ServiceCityStatus.ACTIVE },
        },
      },
      include: serviceInclude,
    });
    const policy = service?.pricePolicies.find(
      (candidate) =>
        candidate.cityId === cityId &&
        candidate.status === PricePolicyStatus.ACTIVE &&
        candidate.effectiveFrom <= now &&
        (candidate.effectiveTo === null || candidate.effectiveTo > now),
    );
    if (!service || !policy) this.notFound('Service');
    return presentPublicService(service, policy);
  }

  async createCategory(
    actor: AuthenticatedActor,
    input: ServiceCategoryCreate,
    requestId: string,
  ) {
    try {
      const category = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.serviceCategory.create({
          data: {
            name: input.name,
            normalizedName: normalizeMarketplaceName(input.name),
            slug: input.slug,
            description: input.description,
            displayOrder: input.displayOrder,
            createdByUserId: actor.userId,
          },
        });
        await this.audit.record(transaction, {
          actor,
          action: 'catalog.category.create',
          targetType: 'ServiceCategory',
          targetId: created.id,
          requestId,
          after: { ...created, createdAt: created.createdAt.toISOString() },
          changedFields: [
            'name',
            'slug',
            'description',
            'displayOrder',
            'status',
          ],
        });
        return created;
      });
      return presentAdminCategory(category);
    } catch (error: unknown) {
      this.translateUnique(
        error,
        'A category with that name or slug already exists.',
      );
    }
  }

  async updateCategory(
    actor: AuthenticatedActor,
    categoryId: string,
    input: ServiceCategoryUpdate,
    requestId: string,
  ) {
    return runSerializable(this.prisma, async (transaction) => {
      const before = await transaction.serviceCategory.findUnique({
        where: { id: categoryId },
      });
      if (!before) this.notFound('Category');
      const updated = await transaction.serviceCategory.updateMany({
        where: { id: categoryId, version: input.expectedVersion },
        data: {
          name: input.name,
          normalizedName: input.name
            ? normalizeMarketplaceName(input.name)
            : undefined,
          slug: input.slug,
          description: input.description,
          displayOrder: input.displayOrder,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) this.optimisticConflict();
      const after = await transaction.serviceCategory.findUniqueOrThrow({
        where: { id: categoryId },
      });
      await this.audit.record(transaction, {
        actor,
        action: 'catalog.category.update',
        targetType: 'ServiceCategory',
        targetId: categoryId,
        requestId,
        before: this.categoryAudit(before),
        after: this.categoryAudit(after),
        changedFields: Object.keys(input).filter(
          (key) => key !== 'expectedVersion',
        ),
      });
      return presentAdminCategory(after);
    });
  }

  async changeCategoryStatus(
    actor: AuthenticatedActor,
    categoryId: string,
    input: {
      action: 'ACTIVATE' | 'DEACTIVATE';
      reasonCode: string;
      reason: string;
      expectedVersion: number;
    },
    requestId: string,
  ) {
    return runSerializable(this.prisma, async (transaction) => {
      const before = await transaction.serviceCategory.findUnique({
        where: { id: categoryId },
      });
      if (!before) this.notFound('Category');
      const status =
        input.action === 'ACTIVATE'
          ? ServiceCategoryStatus.ACTIVE
          : ServiceCategoryStatus.INACTIVE;
      if (before.status === status) this.invalidTransition();
      const changed = await transaction.serviceCategory.updateMany({
        where: { id: categoryId, version: input.expectedVersion },
        data: { status, version: { increment: 1 } },
      });
      if (changed.count !== 1) this.optimisticConflict();
      const after = await transaction.serviceCategory.findUniqueOrThrow({
        where: { id: categoryId },
      });
      await this.audit.record(transaction, {
        actor,
        action: 'catalog.category.status',
        targetType: 'ServiceCategory',
        targetId: categoryId,
        requestId,
        reasonCode: input.reasonCode,
        reason: input.reason,
        before: { status: before.status, version: before.version },
        after: { status: after.status, version: after.version },
        changedFields: ['status', 'version'],
      });
      return presentAdminCategory(after);
    });
  }

  async createService(
    actor: AuthenticatedActor,
    input: MasterServiceCreate,
    requestId: string,
  ) {
    try {
      return await runSerializable(this.prisma, async (transaction) => {
        const created = await this.createInactiveService(
          transaction,
          actor.userId,
          input,
        );
        await this.audit.record(transaction, {
          actor,
          action: 'catalog.service.create',
          targetType: 'Service',
          targetId: created.id,
          requestId,
          after: { status: created.status, version: created.version },
          changedFields: [
            'categoryId',
            'name',
            'description',
            'defaultDurationMinutes',
            'cityAvailability',
            'pricePolicies',
          ],
        });
        return presentAdminService(created);
      });
    } catch (error: unknown) {
      this.translateUnique(
        error,
        'An equivalent master service already exists.',
      );
    }
  }

  async createInactiveService(
    transaction: Prisma.TransactionClient,
    creatorUserId: string,
    input: MasterServiceCreate,
  ) {
    const [category, cities] = await Promise.all([
      transaction.serviceCategory.findUnique({
        where: { id: input.categoryId },
      }),
      transaction.city.findMany({
        where: {
          id: { in: input.cityPolicies.map((policy) => policy.cityId) },
          status: 'ACTIVE',
        },
      }),
    ]);
    if (!category) this.notFound('Category');
    if (cities.length !== input.cityPolicies.length) {
      throw new AppException(
        'CATALOG_CITY_UNAVAILABLE',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Every service city must be active and supported.',
      );
    }
    return transaction.service.create({
      data: {
        categoryId: input.categoryId,
        name: input.name,
        normalizedName: normalizeMarketplaceName(input.name),
        slug: input.slug,
        description: input.description,
        defaultDurationMinutes: input.defaultDurationMinutes,
        createdByUserId: creatorUserId,
        images: {
          create: input.images.map((image) => ({
            uploadId: image.uploadId,
            altText: image.altText,
            displayOrder: image.displayOrder,
          })),
        },
        cityAvailability: {
          create: input.cityPolicies.map((policy) => ({
            cityId: policy.cityId,
          })),
        },
        pricePolicies: {
          create: input.cityPolicies.map((policy) => ({
            cityId: policy.cityId,
            version: 1,
            minimumPricePaise: policy.minimumPricePaise,
            maximumPricePaise: policy.maximumPricePaise,
            effectiveFrom: new Date(policy.effectiveFrom),
            createdByUserId: creatorUserId,
          })),
        },
      },
      include: serviceInclude,
    });
  }

  async updateService(
    actor: AuthenticatedActor,
    serviceId: string,
    input: MasterServiceUpdate,
    requestId: string,
  ) {
    return runSerializable(this.prisma, async (transaction) => {
      const before = await transaction.service.findUnique({
        where: { id: serviceId },
        include: serviceInclude,
      });
      if (!before) this.notFound('Service');
      if (before.version !== input.expectedVersion) this.optimisticConflict();
      if (before.status !== MasterServiceStatus.INACTIVE) {
        throw new AppException(
          'CATALOG_INVALID_TRANSITION',
          HttpStatus.CONFLICT,
          'Deactivate the master service before editing its published definition.',
        );
      }

      if (input.images) {
        await transaction.serviceImage.deleteMany({ where: { serviceId } });
        await transaction.serviceImage.createMany({
          data: input.images.map((image) => ({
            serviceId,
            uploadId: image.uploadId,
            altText: image.altText,
            displayOrder: image.displayOrder,
          })),
        });
      }
      await transaction.service.update({
        where: { id: serviceId },
        data: {
          categoryId: input.categoryId,
          name: input.name,
          normalizedName: input.name
            ? normalizeMarketplaceName(input.name)
            : undefined,
          slug: input.slug,
          description: input.description,
          defaultDurationMinutes: input.defaultDurationMinutes,
          version: { increment: 1 },
        },
      });
      const after = await transaction.service.findUniqueOrThrow({
        where: { id: serviceId },
        include: serviceInclude,
      });
      await this.audit.record(transaction, {
        actor,
        action: 'catalog.service.update',
        targetType: 'Service',
        targetId: serviceId,
        requestId,
        before: this.serviceAudit(before),
        after: this.serviceAudit(after),
        changedFields: Object.keys(input).filter(
          (key) => key !== 'expectedVersion',
        ),
      });
      return presentAdminService(after);
    });
  }

  async changeServiceStatus(
    actor: AuthenticatedActor,
    serviceId: string,
    input: {
      action: 'ACTIVATE' | 'DEACTIVATE' | 'SUSPEND' | 'REACTIVATE';
      reasonCode: string;
      reason: string;
      expectedVersion: number;
    },
    requestId: string,
  ) {
    return runSerializable(this.prisma, async (transaction) => {
      const before = await transaction.service.findUnique({
        where: { id: serviceId },
        include: serviceInclude,
      });
      if (!before) this.notFound('Service');
      if (before.version !== input.expectedVersion) this.optimisticConflict();
      const status = this.nextServiceStatus(before.status, input.action);
      if (status === MasterServiceStatus.ACTIVE) {
        if (before.createdByUserId === actor.userId) {
          throw new AppException(
            'FORBIDDEN',
            HttpStatus.FORBIDDEN,
            'A different administrator must review and activate this service.',
          );
        }
        if (before.category.status !== ServiceCategoryStatus.ACTIVE) {
          throw new AppException(
            'CATALOG_INVALID_TRANSITION',
            HttpStatus.CONFLICT,
            'Activate the service category before this service.',
          );
        }
        const now = new Date();
        const effectivePolicies = before.pricePolicies.filter(
          (policy) =>
            policy.effectiveFrom <= now &&
            (policy.effectiveTo === null || policy.effectiveTo > now),
        );
        if (before.cityAvailability.length === 0) {
          throw new AppException(
            'CATALOG_PRICE_POLICY_MISSING',
            HttpStatus.UNPROCESSABLE_ENTITY,
            'At least one configured service city is required.',
          );
        }
        const latestByCity = new Map<
          string,
          (typeof effectivePolicies)[number]
        >();
        for (const policy of effectivePolicies) {
          if (!latestByCity.has(policy.cityId))
            latestByCity.set(policy.cityId, policy);
        }
        for (const availability of before.cityAvailability) {
          const policy = latestByCity.get(availability.cityId);
          if (!policy) {
            throw new AppException(
              'CATALOG_PRICE_POLICY_MISSING',
              HttpStatus.UNPROCESSABLE_ENTITY,
              `A currently effective price policy is required for ${availability.city.name}.`,
            );
          }
          if (
            policy.status !== PricePolicyStatus.ACTIVE &&
            policy.createdByUserId === actor.userId
          ) {
            throw new AppException(
              'FORBIDDEN',
              HttpStatus.FORBIDDEN,
              'A different administrator must approve each city price policy.',
            );
          }
          await this.activatePolicyVersion(transaction, policy, actor.userId);
        }
      }

      await transaction.service.update({
        where: { id: serviceId },
        data: {
          status,
          reviewedByUserId:
            status === MasterServiceStatus.ACTIVE ? actor.userId : undefined,
          reviewedAt:
            status === MasterServiceStatus.ACTIVE ? new Date() : undefined,
          suspensionReasonCode:
            status === MasterServiceStatus.SUSPENDED ? input.reasonCode : null,
          suspensionReason:
            status === MasterServiceStatus.SUSPENDED ? input.reason : null,
          version: { increment: 1 },
        },
      });
      await transaction.serviceCityAvailability.updateMany({
        where: { serviceId },
        data: {
          status:
            status === MasterServiceStatus.ACTIVE
              ? ServiceCityStatus.ACTIVE
              : status === MasterServiceStatus.SUSPENDED
                ? ServiceCityStatus.SUSPENDED
                : ServiceCityStatus.INACTIVE,
          version: { increment: 1 },
        },
      });
      const after = await transaction.service.findUniqueOrThrow({
        where: { id: serviceId },
        include: serviceInclude,
      });
      await this.audit.record(transaction, {
        actor,
        action: 'catalog.service.status',
        targetType: 'Service',
        targetId: serviceId,
        requestId,
        reasonCode: input.reasonCode,
        reason: input.reason,
        before: { status: before.status, version: before.version },
        after: { status: after.status, version: after.version },
        changedFields: ['status', 'version'],
      });
      return presentAdminService(after);
    });
  }

  async createPricePolicy(
    actor: AuthenticatedActor,
    serviceId: string,
    input: ServicePricePolicyCreate,
    requestId: string,
  ) {
    return runSerializable(this.prisma, async (transaction) => {
      const service = await transaction.service.findUnique({
        where: { id: serviceId },
      });
      if (!service) this.notFound('Service');
      if (service.version !== input.expectedServiceVersion) {
        this.optimisticConflict();
      }
      const city = await transaction.city.findFirst({
        where: { id: input.cityId, status: 'ACTIVE' },
      });
      if (!city) this.notFound('City');
      const effectiveFrom = new Date(input.effectiveFrom);
      const [aggregate, latest] = await Promise.all([
        transaction.serviceCityPricePolicy.aggregate({
          where: { serviceId, cityId: input.cityId },
          _max: { version: true },
        }),
        transaction.serviceCityPricePolicy.findFirst({
          where: { serviceId, cityId: input.cityId },
          orderBy: [{ effectiveFrom: 'desc' }, { version: 'desc' }],
        }),
      ]);
      if (latest && effectiveFrom <= latest.effectiveFrom) {
        throw new AppException(
          'CATALOG_PRICE_POLICY_NOT_EFFECTIVE',
          HttpStatus.CONFLICT,
          'A new price policy must start after the latest policy for this city.',
        );
      }
      const policy = await transaction.serviceCityPricePolicy.create({
        data: {
          serviceId,
          cityId: input.cityId,
          version: (aggregate._max.version ?? 0) + 1,
          minimumPricePaise: input.minimumPricePaise,
          maximumPricePaise: input.maximumPricePaise,
          effectiveFrom,
          createdByUserId: actor.userId,
        },
        include: { city: true },
      });
      await transaction.serviceCityAvailability.upsert({
        where: {
          serviceId_cityId: { serviceId, cityId: input.cityId },
        },
        create: { serviceId, cityId: input.cityId },
        update: {},
      });
      await transaction.service.update({
        where: { id: serviceId },
        data: { version: { increment: 1 } },
      });
      await this.audit.record(transaction, {
        actor,
        action: 'catalog.price-policy.create',
        targetType: 'ServiceCityPricePolicy',
        targetId: policy.id,
        requestId,
        reasonCode: input.reasonCode,
        reason: input.reason,
        after: {
          minimumPricePaise: policy.minimumPricePaise,
          maximumPricePaise: policy.maximumPricePaise,
          effectiveFrom: policy.effectiveFrom.toISOString(),
        },
        changedFields: [
          'minimumPricePaise',
          'maximumPricePaise',
          'effectiveFrom',
        ],
      });
      return presentPolicy(policy);
    });
  }

  async activatePricePolicy(
    actor: AuthenticatedActor,
    serviceId: string,
    policyId: string,
    input: PricePolicyActivation,
    requestId: string,
  ) {
    return runSerializable(this.prisma, async (transaction) => {
      const service = await transaction.service.findUnique({
        where: { id: serviceId },
      });
      const policy = await transaction.serviceCityPricePolicy.findFirst({
        where: { id: policyId, serviceId },
        include: { city: true },
      });
      if (!service || !policy) this.notFound('Price policy');
      if (service.version !== input.expectedServiceVersion)
        this.optimisticConflict();
      if (policy.status === PricePolicyStatus.ACTIVE) {
        this.invalidTransition();
      }
      if (policy.effectiveFrom > new Date()) {
        throw new AppException(
          'CATALOG_PRICE_POLICY_NOT_EFFECTIVE',
          HttpStatus.CONFLICT,
          'A price policy can be activated only when its effective time has arrived.',
        );
      }
      if (policy.createdByUserId === actor.userId) {
        throw new AppException(
          'FORBIDDEN',
          HttpStatus.FORBIDDEN,
          'A different administrator must approve this price policy.',
        );
      }
      await this.activatePolicyVersion(transaction, policy, actor.userId);
      const activated =
        await transaction.serviceCityPricePolicy.findUniqueOrThrow({
          where: { id: policy.id },
          include: { city: true },
        });
      await transaction.service.update({
        where: { id: serviceId },
        data: { version: { increment: 1 } },
      });
      await this.audit.record(transaction, {
        actor,
        action: 'catalog.price-policy.activate',
        targetType: 'ServiceCityPricePolicy',
        targetId: policy.id,
        requestId,
        reasonCode: input.reasonCode,
        reason: input.reason,
        before: { status: policy.status },
        after: { status: activated.status },
        changedFields: ['status', 'reviewedByUserId'],
      });
      return presentPolicy(activated);
    });
  }

  private async activatePolicyVersion(
    transaction: Prisma.TransactionClient,
    policy: {
      id: string;
      serviceId: string;
      cityId: string;
      effectiveFrom: Date;
      effectiveTo: Date | null;
      minimumPricePaise: number;
      maximumPricePaise: number;
    },
    reviewerUserId: string,
  ) {
    const now = new Date();
    if (
      policy.effectiveFrom > now ||
      (policy.effectiveTo !== null && policy.effectiveTo <= now)
    ) {
      throw new AppException(
        'CATALOG_PRICE_POLICY_NOT_EFFECTIVE',
        HttpStatus.CONFLICT,
        'Only a currently effective price policy can be activated.',
      );
    }

    const current = await transaction.serviceCityPricePolicy.findFirst({
      where: {
        serviceId: policy.serviceId,
        cityId: policy.cityId,
        status: PricePolicyStatus.ACTIVE,
        id: { not: policy.id },
      },
      orderBy: [{ effectiveFrom: 'desc' }, { version: 'desc' }],
    });
    if (current && policy.effectiveFrom <= current.effectiveFrom) {
      throw new AppException(
        'CATALOG_PRICE_POLICY_NOT_EFFECTIVE',
        HttpStatus.CONFLICT,
        'Price policy activation must move forward in effective time.',
      );
    }
    if (current) {
      await transaction.serviceCityPricePolicy.update({
        where: { id: current.id },
        data: {
          status: PricePolicyStatus.INACTIVE,
          effectiveTo: policy.effectiveFrom,
        },
      });
    }

    await transaction.serviceCityPricePolicy.update({
      where: { id: policy.id },
      data: {
        status: PricePolicyStatus.ACTIVE,
        reviewedByUserId: reviewerUserId,
      },
    });
    await transaction.professionalService.updateMany({
      where: { serviceId: policy.serviceId, cityId: policy.cityId },
      data: { pricePolicyId: policy.id },
    });
    await transaction.professionalService.updateMany({
      where: {
        serviceId: policy.serviceId,
        cityId: policy.cityId,
        state: { not: 'SUSPENDED' },
        OR: [
          { pricePaise: { lt: policy.minimumPricePaise } },
          { pricePaise: { gt: policy.maximumPricePaise } },
        ],
      },
      data: {
        state: 'DISABLED',
        adminReasonCode: 'PRICE_POLICY_CHANGED',
        userSafeAdminReason:
          'Update the price to the current platform range before enabling this service.',
        version: { increment: 1 },
      },
    });
    await transaction.professionalService.updateMany({
      where: {
        serviceId: policy.serviceId,
        cityId: policy.cityId,
        adminReasonCode: 'PRICE_POLICY_CHANGED',
        pricePaise: {
          gte: policy.minimumPricePaise,
          lte: policy.maximumPricePaise,
        },
      },
      data: {
        adminReasonCode: null,
        userSafeAdminReason: null,
      },
    });
  }

  private page<T extends { id: string }, R>(
    records: T[],
    limit: number,
    fingerprint: string,
    sortValue: (record: T) => string,
    present: (record: T) => R,
  ) {
    const hasNextPage = records.length > limit;
    const page = records.slice(0, limit);
    const last = page.at(-1);
    return {
      data: page.map(present),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? this.cursors.encode({
                id: last.id,
                sortValue: sortValue(last),
                fingerprint,
              })
            : null,
      },
    };
  }

  private nextServiceStatus(
    current: MasterServiceStatusValue,
    action: 'ACTIVATE' | 'DEACTIVATE' | 'SUSPEND' | 'REACTIVATE',
  ): MasterServiceStatusValue {
    if (action === 'ACTIVATE' && current === MasterServiceStatus.INACTIVE) {
      return MasterServiceStatus.ACTIVE;
    }
    if (action === 'SUSPEND' && current === MasterServiceStatus.ACTIVE) {
      return MasterServiceStatus.SUSPENDED;
    }
    if (action === 'REACTIVATE' && current === MasterServiceStatus.SUSPENDED) {
      return MasterServiceStatus.ACTIVE;
    }
    if (
      action === 'DEACTIVATE' &&
      (current === MasterServiceStatus.ACTIVE ||
        current === MasterServiceStatus.SUSPENDED)
    ) {
      return MasterServiceStatus.INACTIVE;
    }
    this.invalidTransition();
  }

  private categoryAudit(category: {
    name: string;
    slug: string;
    description: string | null;
    displayOrder: number;
    status: string;
    version: number;
  }): Record<string, unknown> {
    return {
      name: category.name,
      slug: category.slug,
      description: category.description,
      displayOrder: category.displayOrder,
      status: category.status,
      version: category.version,
    };
  }

  private serviceAudit(service: {
    name: string;
    slug: string;
    description: string;
    defaultDurationMinutes: number;
    status: string;
    version: number;
  }): Record<string, unknown> {
    return {
      name: service.name,
      slug: service.slug,
      description: service.description,
      defaultDurationMinutes: service.defaultDurationMinutes,
      status: service.status,
      version: service.version,
    };
  }

  private translateUnique(error: unknown, message: string): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new AppException(
        'CATALOG_SERVICE_DUPLICATE',
        HttpStatus.CONFLICT,
        message,
      );
    }
    throw error;
  }

  private translateServiceAreaUnique(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new AppException(
        'CATALOG_SERVICE_AREA_DUPLICATE',
        HttpStatus.CONFLICT,
        'A service area with that name or slug already exists in the city.',
      );
    }
    throw error;
  }

  private notFound(resource: string): never {
    throw new AppException(
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      resource + ' not found.',
    );
  }

  private optimisticConflict(): never {
    throw new AppException(
      'OPTIMISTIC_LOCK_CONFLICT',
      HttpStatus.CONFLICT,
      'The resource changed. Reload it and retry.',
    );
  }

  private invalidTransition(): never {
    throw new AppException(
      'CATALOG_INVALID_TRANSITION',
      HttpStatus.CONFLICT,
      'The requested catalogue state transition is not allowed.',
    );
  }
}
