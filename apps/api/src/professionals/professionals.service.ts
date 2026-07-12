import {
  LaunchEligibilityStatus,
  MediaModerationStatus,
  Prisma,
  ProfessionalServiceState,
  UserStatus,
  VerificationStatus,
} from '@beautyathome/database';
import {
  type AdminProfessionalListQuery,
  type ProfessionalCertificatesUpdate,
  type ProfessionalDiscoveryQuery,
  type ProfessionalPortfolioUpdate,
  type ProfessionalProfileUpdate,
} from '@beautyathome/marketplace';
import { HttpStatus, Injectable } from '@nestjs/common';

import { runSerializable } from '../common/database/serializable';
import { AppException } from '../common/errors/app.exception';
import { CursorService } from '../common/pagination/cursor.service';
import { localDateBoundsUtc } from '../common/time/zoned-time';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { PrismaService } from '../database/prisma/prisma.service';
import {
  type HydratedProfessional,
  professionalProfileInclude,
  presentAdminProfessional,
  presentOwnProfessional,
  presentPublicProfessional,
} from './professionals.presenter';

@Injectable()
export class ProfessionalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cursors: CursorService,
  ) {}

  async getOwn(actor: AuthenticatedActor) {
    return presentOwnProfessional(await this.byUserId(actor.userId));
  }

  async updateOwn(actor: AuthenticatedActor, input: ProfessionalProfileUpdate) {
    await runSerializable(this.prisma, async (transaction) => {
      const profile = await transaction.professionalProfile.findUnique({
        where: { userId: actor.userId },
      });
      if (!profile) this.notFound();
      if (profile.version !== input.expectedVersion) this.optimisticConflict();
      this.assertProfileMutable(profile.verificationStatus);

      const city = await transaction.city.findFirst({
        where: { slug: 'sikar-rajasthan', status: 'ACTIVE' },
      });
      if (!city) {
        throw new AppException(
          'CATALOG_CITY_UNAVAILABLE',
          HttpStatus.SERVICE_UNAVAILABLE,
          'The Sikar launch city is not configured.',
        );
      }
      if (input.serviceAreaIds) {
        const areas = await transaction.serviceArea.findMany({
          where: {
            id: { in: input.serviceAreaIds },
            cityId: city.id,
            status: 'ACTIVE',
          },
        });
        if (areas.length !== input.serviceAreaIds.length) {
          throw new AppException(
            'CATALOG_CITY_UNAVAILABLE',
            HttpStatus.UNPROCESSABLE_ENTITY,
            'Every selected service area must be active in Sikar.',
          );
        }
        await transaction.professionalServiceArea.deleteMany({
          where: { professionalId: profile.id },
        });
        await transaction.professionalServiceArea.createMany({
          data: input.serviceAreaIds.map((serviceAreaId) => ({
            professionalId: profile.id,
            serviceAreaId,
          })),
        });
      }

      await transaction.professionalProfile.update({
        where: { id: profile.id },
        data: {
          cityId: city.id,
          displayName: input.displayName,
          biography: input.biography,
          experienceYears: input.experienceYears,
          languages: input.languageCodes,
          profileImageUploadId: input.profileImageUploadId,
          profileImageModerationStatus:
            input.profileImageUploadId === undefined
              ? undefined
              : input.profileImageUploadId === null
                ? null
                : MediaModerationStatus.PENDING,
          profileImageOriginObjectKey:
            input.profileImageUploadId === null ? null : undefined,
          profileImagePublicObjectKey:
            input.profileImageUploadId === null ? null : undefined,
          ...this.reverificationData(profile.verificationStatus),
          version: { increment: 1 },
        },
      });
    });
    return this.getOwn(actor);
  }

  async replacePortfolio(
    actor: AuthenticatedActor,
    input: ProfessionalPortfolioUpdate,
  ) {
    await runSerializable(this.prisma, async (transaction) => {
      const profile = await transaction.professionalProfile.findUnique({
        where: { userId: actor.userId },
      });
      if (!profile) this.notFound();
      if (profile.version !== input.expectedVersion) this.optimisticConflict();
      this.assertProfileMutable(profile.verificationStatus);
      await transaction.portfolioAsset.deleteMany({
        where: { professionalId: profile.id },
      });
      if (input.items.length > 0) {
        await transaction.portfolioAsset.createMany({
          data: input.items.map((item) => ({
            professionalId: profile.id,
            uploadId: item.uploadId,
            altText: item.altText,
            displayOrder: item.displayOrder,
          })),
        });
      }
      const changed = await transaction.professionalProfile.updateMany({
        where: { id: profile.id, version: input.expectedVersion },
        data: { version: { increment: 1 } },
      });
      if (changed.count !== 1) this.optimisticConflict();
    });
    return this.getOwn(actor);
  }

  async replaceCertificates(
    actor: AuthenticatedActor,
    input: ProfessionalCertificatesUpdate,
  ) {
    await runSerializable(this.prisma, async (transaction) => {
      const profile = await transaction.professionalProfile.findUnique({
        where: { userId: actor.userId },
      });
      if (!profile) this.notFound();
      if (profile.version !== input.expectedVersion) this.optimisticConflict();
      this.assertProfileMutable(profile.verificationStatus);
      await transaction.professionalCertificate.deleteMany({
        where: { professionalId: profile.id },
      });
      if (input.certificates.length > 0) {
        await transaction.professionalCertificate.createMany({
          data: input.certificates.map((certificate) => ({
            professionalId: profile.id,
            uploadId: certificate.uploadId,
            title: certificate.title,
            issuer: certificate.issuer,
            issuedOn: new Date(certificate.issuedOn + 'T00:00:00.000Z'),
            expiresOn: certificate.expiresOn
              ? new Date(certificate.expiresOn + 'T00:00:00.000Z')
              : null,
          })),
        });
      }
      const changed = await transaction.professionalProfile.updateMany({
        where: { id: profile.id, version: input.expectedVersion },
        data: {
          ...this.reverificationData(profile.verificationStatus),
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) this.optimisticConflict();
    });
    return this.getOwn(actor);
  }

  async listPublic(query: ProfessionalDiscoveryQuery) {
    const city = await this.prisma.city.findFirst({
      where: { id: query.cityId, status: 'ACTIVE' },
    });
    if (!city) this.notFound();
    const now = new Date();
    const dateBounds = query.date
      ? localDateBoundsUtc(query.date, city.timeZone)
      : null;
    const limit = query.limit ?? 20;
    const fingerprint = this.cursors.fingerprint({
      ...query,
      after: undefined,
    });
    const cursor = this.cursors.decode(query.after, fingerprint);
    const profileWhere: Prisma.ProfessionalProfileWhereInput = {
      cityId: query.cityId,
      verificationStatus: VerificationStatus.APPROVED,
      launchEligibilityStatus: LaunchEligibilityStatus.ELIGIBLE,
      isServiceActive: true,
      user: { status: UserStatus.ACTIVE, deletedAt: null },
      displayName: query.search
        ? { contains: query.search, mode: 'insensitive' }
        : { not: null },
      experienceYears: {
        not: null,
        gte: query.minimumExperienceYears,
      },
      averageRating: query.minimumRating
        ? { gte: query.minimumRating }
        : undefined,
      languages: query.languageCodes
        ? { hasEvery: query.languageCodes }
        : undefined,
      serviceAreas: query.serviceAreaId
        ? { some: { serviceAreaId: query.serviceAreaId } }
        : undefined,
      services: query.serviceId
        ? {
            some: {
              serviceId: query.serviceId,
              cityId: query.cityId,
              state: ProfessionalServiceState.ENABLED,
              pricePaise: {
                gte: query.minimumPricePaise,
                lte: query.maximumPricePaise,
              },
              service: {
                status: 'ACTIVE',
                category: { status: 'ACTIVE' },
                cityAvailability: {
                  some: { cityId: query.cityId, status: 'ACTIVE' },
                },
              },
              pricePolicy: {
                is: {
                  cityId: query.cityId,
                  status: 'ACTIVE',
                  effectiveFrom: { lte: now },
                  OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
                },
              },
            },
          }
        : undefined,
      availabilitySlots: dateBounds
        ? {
            some: {
              cityId: query.cityId,
              serviceId: query.serviceId,
              status: 'AVAILABLE',
              startsAt: {
                gte: dateBounds.startsAt,
                lt: dateBounds.endsAt,
              },
            },
          }
        : undefined,
    };

    if (query.sort === 'priceAsc' && query.serviceId) {
      const offerings = await this.prisma.professionalService.findMany({
        where: {
          serviceId: query.serviceId,
          cityId: query.cityId,
          state: ProfessionalServiceState.ENABLED,
          pricePaise: {
            gte: query.minimumPricePaise,
            lte: query.maximumPricePaise,
          },
          professional: profileWhere,
          service: {
            status: 'ACTIVE',
            category: { status: 'ACTIVE' },
            cityAvailability: {
              some: { cityId: query.cityId, status: 'ACTIVE' },
            },
          },
          pricePolicy: {
            is: {
              cityId: query.cityId,
              status: 'ACTIVE',
              effectiveFrom: { lte: now },
              OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
            },
          },
        },
        include: {
          professional: { include: professionalProfileInclude },
        },
        orderBy: [{ pricePaise: 'asc' }, { id: 'asc' }],
        ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
        take: limit + 1,
      });
      const hasNextPage = offerings.length > limit;
      const page = offerings.slice(0, limit);
      const data = page.flatMap(({ professional }) => {
        const presented = presentPublicProfessional(professional);
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
                  sortValue: String(last.pricePaise),
                  fingerprint,
                })
              : null,
        },
      };
    }

    const profiles = await this.prisma.professionalProfile.findMany({
      where: profileWhere,
      include: professionalProfileInclude,
      orderBy:
        query.sort === 'experienceDesc'
          ? [{ experienceYears: 'desc' }, { id: 'asc' }]
          : [{ averageRating: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      take: limit + 1,
    });
    return this.profilePage(profiles, limit, fingerprint, false);
  }

  async getPublic(professionalId: string) {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: {
        id: professionalId,
        verificationStatus: VerificationStatus.APPROVED,
        launchEligibilityStatus: LaunchEligibilityStatus.ELIGIBLE,
        isServiceActive: true,
        user: { status: UserStatus.ACTIVE, deletedAt: null },
      },
      include: professionalProfileInclude,
    });
    if (!profile) this.notFound();
    const result = presentPublicProfessional(profile);
    if (!result) this.notFound();
    return result;
  }

  async listAdmin(query: AdminProfessionalListQuery) {
    const limit = query.limit ?? 20;
    const fingerprint = this.cursors.fingerprint({
      ...query,
      after: undefined,
      resource: 'admin-professionals',
    });
    const cursor = this.cursors.decode(query.after, fingerprint);
    const profiles = await this.prisma.professionalProfile.findMany({
      where: {
        verificationStatus: query.verificationStatus,
        launchEligibilityStatus: query.launchEligibilityStatus,
        user: { status: query.accountStatus },
        serviceAreas: query.serviceAreaId
          ? { some: { serviceAreaId: query.serviceAreaId } }
          : undefined,
        displayName: query.search
          ? { contains: query.search, mode: 'insensitive' }
          : undefined,
      },
      include: professionalProfileInclude,
      orderBy:
        query.sort === 'ratingDesc'
          ? [{ averageRating: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }]
          : [{ updatedAt: 'desc' }, { id: 'desc' }],
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      take: limit + 1,
    });
    return this.profilePage(profiles, limit, fingerprint, true);
  }

  async byUserId(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: professionalProfileInclude,
    });
    if (!profile) this.notFound();
    return profile;
  }

  isComplete(
    profile: Awaited<ReturnType<ProfessionalsService['byUserId']>>,
  ): boolean {
    return Boolean(
      profile.displayName &&
      profile.biography &&
      profile.experienceYears !== null &&
      profile.cityId &&
      profile.languages.length > 0 &&
      profile.serviceAreas.length > 0,
    );
  }

  private profilePage(
    profiles: HydratedProfessional[],
    limit: number,
    fingerprint: string,
    admin: boolean,
  ) {
    const hasNextPage = profiles.length > limit;
    const page = profiles.slice(0, limit);
    const data = page.flatMap((profile) => {
      const presented = admin
        ? presentAdminProfessional(profile)
        : presentPublicProfessional(profile);
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

  private assertProfileMutable(status: string): void {
    if (
      status === VerificationStatus.SUBMITTED ||
      status === VerificationStatus.UNDER_REVIEW
    ) {
      throw new AppException(
        'VERIFICATION_PROFILE_LOCKED',
        HttpStatus.CONFLICT,
        'Profile and evidence changes are locked while verification is under review.',
      );
    }
  }

  private reverificationData(status: string) {
    if (status !== VerificationStatus.APPROVED) return {};
    return {
      verificationStatus: VerificationStatus.DRAFT,
      launchEligibilityStatus: LaunchEligibilityStatus.NOT_ASSESSED,
      eligibilityPolicyVersion: null,
      eligibilityReviewedByUserId: null,
      eligibilityReviewedAt: null,
      isServiceActive: false,
    } as const;
  }

  private optimisticConflict(): never {
    throw new AppException(
      'OPTIMISTIC_LOCK_CONFLICT',
      HttpStatus.CONFLICT,
      'The profile changed. Reload it and retry.',
    );
  }

  private notFound(): never {
    throw new AppException(
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      'Professional profile not found.',
    );
  }
}
