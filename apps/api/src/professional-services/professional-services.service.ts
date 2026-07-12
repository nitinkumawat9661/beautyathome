import {
  LaunchEligibilityStatus,
  MasterServiceStatus,
  PricePolicyStatus,
  ProfessionalServiceState,
  ServiceCategoryStatus,
  ServiceCityStatus,
  UserStatus,
  VerificationStatus,
} from '@beautyathome/database';
import {
  type ProfessionalServiceStatusChange,
  type ProfessionalServiceUpsert,
  isPriceWithinPolicy,
} from '@beautyathome/marketplace';
import { HttpStatus, Injectable } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { runSerializable } from '../common/database/serializable';
import { AppException } from '../common/errors/app.exception';
import { CursorService } from '../common/pagination/cursor.service';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { PrismaService } from '../database/prisma/prisma.service';
import {
  presentOwnOffering,
  presentPublicOffering,
} from './professional-services.presenter';

const offeringInclude = {
  service: { include: { category: true, images: true } },
  pricePolicy: { include: { city: true } },
  assets: { include: { portfolioAsset: true } },
} as const;

@Injectable()
export class ProfessionalServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cursors: CursorService,
    private readonly audit: AuditService,
  ) {}

  async list(
    actor: AuthenticatedActor,
    after?: string,
    requestedLimit?: number,
  ) {
    const profile = await this.profile(actor.userId);
    const limit = requestedLimit ?? 20;
    const fingerprint = this.cursors.fingerprint({
      resource: 'professional-services',
      professionalId: profile.id,
    });
    const cursor = this.cursors.decode(after, fingerprint);
    const records = await this.prisma.professionalService.findMany({
      where: { professionalId: profile.id },
      include: offeringInclude,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      take: limit + 1,
    });
    const hasNextPage = records.length > limit;
    const page = records.slice(0, limit);
    const data = page.flatMap((record) => {
      const presented = presentOwnOffering(record);
      return presented ? [presented] : [];
    });
    const last = page.at(-1);
    return {
      data,
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? this.cursors.encode({
                id: last.id,
                sortValue: last.updatedAt.toISOString(),
                fingerprint,
              })
            : null,
      },
    };
  }

  async upsert(
    actor: AuthenticatedActor,
    serviceId: string,
    input: ProfessionalServiceUpsert,
  ) {
    const now = new Date();
    return runSerializable(this.prisma, async (transaction) => {
      const profile = await transaction.professionalProfile.findUnique({
        where: { userId: actor.userId },
        include: { user: true },
      });
      if (!profile) this.notFound();
      const service = await transaction.service.findFirst({
        where: {
          id: serviceId,
          status: MasterServiceStatus.ACTIVE,
          category: { status: ServiceCategoryStatus.ACTIVE },
          cityAvailability: {
            some: { cityId: input.cityId, status: ServiceCityStatus.ACTIVE },
          },
        },
        include: {
          pricePolicies: {
            where: {
              cityId: input.cityId,
              status: PricePolicyStatus.ACTIVE,
              effectiveFrom: { lte: now },
              OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
            },
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      });
      if (!service) {
        throw new AppException(
          'CATALOG_SERVICE_INACTIVE',
          HttpStatus.UNPROCESSABLE_ENTITY,
          'The selected master service is not active in this city.',
        );
      }
      const policy = service.pricePolicies[0];
      if (!policy) {
        throw new AppException(
          'CATALOG_PRICE_POLICY_MISSING',
          HttpStatus.UNPROCESSABLE_ENTITY,
          'No effective price policy is available for this service and city.',
        );
      }
      if (!isPriceWithinPolicy(input.pricePaise, policy)) {
        throw new AppException(
          'CATALOG_PRICE_OUT_OF_RANGE',
          HttpStatus.UNPROCESSABLE_ENTITY,
          'The service price must remain within the active platform boundaries.',
          [
            {
              field: 'pricePaise',
              reason: `Allowed range is ${String(policy.minimumPricePaise)}-${String(policy.maximumPricePaise)} paise.`,
            },
          ],
        );
      }
      if (input.isEnabled) this.assertCanEnable(profile);

      const uploadIds = input.portfolioImages.map((image) => image.uploadId);
      const assets =
        uploadIds.length === 0
          ? []
          : await transaction.portfolioAsset.findMany({
              where: {
                professionalId: profile.id,
                uploadId: { in: uploadIds },
              },
            });
      if (assets.length !== uploadIds.length) {
        throw new AppException(
          'UPLOAD_NOT_READY',
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Every service image must reference an owned portfolio upload.',
        );
      }

      const existing = await transaction.professionalService.findUnique({
        where: {
          professionalId_serviceId_cityId: {
            professionalId: profile.id,
            serviceId,
            cityId: input.cityId,
          },
        },
      });
      if (
        (existing && input.expectedVersion === undefined) ||
        (input.expectedVersion !== undefined &&
          existing?.version !== input.expectedVersion)
      ) {
        this.optimisticConflict();
      }
      if (
        existing?.state === ProfessionalServiceState.SUSPENDED &&
        input.isEnabled
      ) {
        throw new AppException(
          'PROFESSIONAL_SERVICE_SUSPENDED',
          HttpStatus.CONFLICT,
          'This offering is suspended. Review the administrator reason before retrying.',
        );
      }
      const offering = await transaction.professionalService.upsert({
        where: {
          professionalId_serviceId_cityId: {
            professionalId: profile.id,
            serviceId,
            cityId: input.cityId,
          },
        },
        create: {
          professionalId: profile.id,
          serviceId,
          cityId: input.cityId,
          pricePolicyId: policy.id,
          pricePaise: input.pricePaise,
          estimatedDurationMinutes: input.estimatedDurationMinutes,
          state: input.isEnabled
            ? ProfessionalServiceState.ENABLED
            : ProfessionalServiceState.DISABLED,
        },
        update: {
          pricePolicyId: policy.id,
          pricePaise: input.pricePaise,
          estimatedDurationMinutes: input.estimatedDurationMinutes,
          state:
            existing?.state === ProfessionalServiceState.SUSPENDED
              ? undefined
              : input.isEnabled
                ? ProfessionalServiceState.ENABLED
                : ProfessionalServiceState.DISABLED,
          adminReasonCode:
            existing?.state === ProfessionalServiceState.SUSPENDED
              ? undefined
              : null,
          userSafeAdminReason:
            existing?.state === ProfessionalServiceState.SUSPENDED
              ? undefined
              : null,
          version: { increment: 1 },
        },
      });
      await transaction.professionalServiceAsset.deleteMany({
        where: { professionalServiceId: offering.id },
      });
      if (assets.length > 0) {
        const orderByUpload = new Map<string, number>(
          input.portfolioImages.map((image) => [
            image.uploadId,
            image.displayOrder,
          ]),
        );
        await transaction.professionalServiceAsset.createMany({
          data: assets.map((asset) => ({
            professionalServiceId: offering.id,
            portfolioAssetId: asset.id,
            displayOrder: orderByUpload.get(asset.uploadId) ?? 0,
          })),
        });
      }
      const hydrated = await transaction.professionalService.findUniqueOrThrow({
        where: { id: offering.id },
        include: offeringInclude,
      });
      return presentOwnOffering(hydrated);
    });
  }

  async disable(
    actor: AuthenticatedActor,
    serviceId: string,
    cityId: string,
    expectedVersion: number,
  ) {
    return runSerializable(this.prisma, async (transaction) => {
      const profile = await transaction.professionalProfile.findUnique({
        where: { userId: actor.userId },
      });
      if (!profile) this.notFound();
      const offering = await transaction.professionalService.findUnique({
        where: {
          professionalId_serviceId_cityId: {
            professionalId: profile.id,
            serviceId,
            cityId,
          },
        },
      });
      if (!offering) this.notFound();
      if (offering.state === ProfessionalServiceState.SUSPENDED) {
        throw new AppException(
          'PROFESSIONAL_SERVICE_SUSPENDED',
          HttpStatus.CONFLICT,
          'A suspended offering cannot be changed by the Professional.',
        );
      }
      const changed = await transaction.professionalService.updateMany({
        where: {
          id: offering.id,
          version: expectedVersion,
          state: { not: ProfessionalServiceState.SUSPENDED },
        },
        data: {
          state: ProfessionalServiceState.DISABLED,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) this.optimisticConflict();
      const updated = await transaction.professionalService.findUniqueOrThrow({
        where: { id: offering.id },
        include: offeringInclude,
      });
      return presentOwnOffering(updated);
    });
  }

  async listPublic(
    professionalId: string,
    query: {
      cityId: string;
      serviceId?: string;
      after?: string;
      limit?: number;
    },
  ) {
    const now = new Date();
    const limit = query.limit ?? 20;
    const fingerprint = this.cursors.fingerprint({
      ...query,
      after: undefined,
      professionalId,
      resource: 'public-professional-services',
    });
    const cursor = this.cursors.decode(query.after, fingerprint);
    const records = await this.prisma.professionalService.findMany({
      where: {
        professionalId,
        cityId: query.cityId,
        serviceId: query.serviceId,
        state: ProfessionalServiceState.ENABLED,
        professional: {
          verificationStatus: VerificationStatus.APPROVED,
          launchEligibilityStatus: LaunchEligibilityStatus.ELIGIBLE,
          isServiceActive: true,
          user: { status: UserStatus.ACTIVE, deletedAt: null },
        },
        service: {
          status: MasterServiceStatus.ACTIVE,
          category: { status: ServiceCategoryStatus.ACTIVE },
          cityAvailability: {
            some: {
              cityId: query.cityId,
              status: ServiceCityStatus.ACTIVE,
            },
          },
        },
        pricePolicy: {
          cityId: query.cityId,
          status: PricePolicyStatus.ACTIVE,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
        },
      },
      include: offeringInclude,
      orderBy: [{ pricePaise: 'asc' }, { id: 'asc' }],
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      take: limit + 1,
    });
    const hasNextPage = records.length > limit;
    const page = records.slice(0, limit);
    const last = page.at(-1);
    return {
      data: page.map(presentPublicOffering),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? this.cursors.encode({
                id: last.id,
                sortValue: String(last.pricePaise),
                fingerprint,
              })
            : null,
      },
    };
  }

  async changeStatus(
    actor: AuthenticatedActor,
    offeringId: string,
    input: ProfessionalServiceStatusChange,
    requestId: string,
  ) {
    return runSerializable(this.prisma, async (transaction) => {
      const offering = await transaction.professionalService.findUnique({
        where: { id: offeringId },
        include: {
          professional: { include: { user: true } },
          service: { include: { category: true, cityAvailability: true } },
          pricePolicy: true,
        },
      });
      if (!offering) this.notFound();
      if (offering.version !== input.expectedVersion) {
        this.optimisticConflict();
      }
      const suspending = input.action === 'SUSPEND';
      if (
        (suspending && offering.state === ProfessionalServiceState.SUSPENDED) ||
        (!suspending && offering.state !== ProfessionalServiceState.SUSPENDED)
      ) {
        this.invalidTransition();
      }
      if (!suspending) {
        this.assertCanEnable(offering.professional);
        const now = new Date();
        const cityIsActive = offering.service.cityAvailability.some(
          (city) =>
            city.cityId === offering.cityId &&
            city.status === ServiceCityStatus.ACTIVE,
        );
        if (
          offering.service.status !== MasterServiceStatus.ACTIVE ||
          offering.service.category.status !== ServiceCategoryStatus.ACTIVE ||
          !cityIsActive ||
          !offering.pricePolicy ||
          offering.pricePolicy.status !== PricePolicyStatus.ACTIVE ||
          offering.pricePolicy.effectiveFrom > now ||
          (offering.pricePolicy.effectiveTo !== null &&
            offering.pricePolicy.effectiveTo <= now) ||
          !isPriceWithinPolicy(offering.pricePaise, offering.pricePolicy)
        ) {
          throw new AppException(
            'CATALOG_PRICE_OUT_OF_RANGE',
            HttpStatus.UNPROCESSABLE_ENTITY,
            'The offering must use an active service and a price within the current city policy before reactivation.',
          );
        }
      }

      await transaction.professionalService.update({
        where: { id: offering.id },
        data: suspending
          ? {
              state: ProfessionalServiceState.SUSPENDED,
              adminSuspendedByUserId: actor.userId,
              adminSuspendedAt: new Date(),
              adminReasonCode: input.reasonCode,
              userSafeAdminReason: input.userMessage,
              version: { increment: 1 },
            }
          : {
              state: ProfessionalServiceState.DISABLED,
              adminSuspendedByUserId: null,
              adminSuspendedAt: null,
              adminReasonCode: null,
              userSafeAdminReason: null,
              version: { increment: 1 },
            },
      });
      await this.audit.record(transaction, {
        actor,
        action: suspending
          ? 'professional-service.suspend'
          : 'professional-service.reactivate',
        targetType: 'ProfessionalService',
        targetId: offering.id,
        requestId,
        reasonCode: input.reasonCode,
        reason: input.internalNote,
        before: { state: offering.state, version: offering.version },
        after: {
          state: suspending
            ? ProfessionalServiceState.SUSPENDED
            : ProfessionalServiceState.DISABLED,
          version: offering.version + 1,
        },
        changedFields: [
          'state',
          'adminReasonCode',
          'userSafeAdminReason',
          'version',
        ],
      });
      const hydrated = await transaction.professionalService.findUniqueOrThrow({
        where: { id: offering.id },
        include: offeringInclude,
      });
      return presentOwnOffering(hydrated);
    });
  }

  private async profile(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!profile) this.notFound();
    return profile;
  }

  private assertCanEnable(profile: {
    user: { status: string };
    verificationStatus: string;
    launchEligibilityStatus: string;
    isServiceActive: boolean;
  }): void {
    if (
      profile.user.status !== UserStatus.ACTIVE ||
      profile.verificationStatus !== VerificationStatus.APPROVED ||
      profile.launchEligibilityStatus !== LaunchEligibilityStatus.ELIGIBLE ||
      !profile.isServiceActive
    ) {
      throw new AppException(
        'PROFESSIONAL_NOT_APPROVED',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Verification and launch eligibility approval are required before enabling services.',
      );
    }
  }

  private optimisticConflict(): never {
    throw new AppException(
      'OPTIMISTIC_LOCK_CONFLICT',
      HttpStatus.CONFLICT,
      'The offering changed. Reload it and retry.',
    );
  }

  private invalidTransition(): never {
    throw new AppException(
      'PROFESSIONAL_SERVICE_INVALID_TRANSITION',
      HttpStatus.CONFLICT,
      'The Professional service changed or cannot move to that state.',
    );
  }

  private notFound(): never {
    throw new AppException(
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      'Professional service not found.',
    );
  }
}
