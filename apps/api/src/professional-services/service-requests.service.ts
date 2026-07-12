import { ServiceRequestStatus, Prisma } from '@beautyathome/database';
import {
  type AdminServiceRequestDecision,
  type ProfessionalServiceRequestCreate,
  type ServiceRequestListQuery,
} from '@beautyathome/marketplace';
import { HttpStatus, Injectable } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { CatalogService } from '../catalog/catalog.service';
import { runSerializable } from '../common/database/serializable';
import { normalizeMarketplaceName } from '../common/domain/normalization';
import { AppException } from '../common/errors/app.exception';
import { CursorService } from '../common/pagination/cursor.service';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { PrismaService } from '../database/prisma/prisma.service';
import {
  presentAdminServiceRequest,
  presentOwnServiceRequest,
} from './professional-services.presenter';

const requestInclude = {
  cities: true,
} satisfies Prisma.ProfessionalServiceRequestInclude;

@Injectable()
export class ServiceRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly cursors: CursorService,
    private readonly audit: AuditService,
  ) {}

  async create(
    actor: AuthenticatedActor,
    input: ProfessionalServiceRequestCreate,
    requestId: string,
  ) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId: actor.userId },
    });
    if (!profile) this.notFound();
    const normalizedName = normalizeMarketplaceName(input.proposedName);

    try {
      const created = await runSerializable(
        this.prisma,
        async (transaction) => {
          const [category, cities, duplicateService, openRequest] =
            await Promise.all([
              transaction.serviceCategory.findFirst({
                where: { id: input.categoryId, status: 'ACTIVE' },
              }),
              transaction.city.findMany({
                where: {
                  id: { in: input.requestedCityIds },
                  status: 'ACTIVE',
                },
              }),
              transaction.service.findFirst({
                where: { categoryId: input.categoryId, normalizedName },
              }),
              transaction.professionalServiceRequest.findFirst({
                where: {
                  professionalId: profile.id,
                  categoryId: input.categoryId,
                  normalizedName,
                  status: {
                    in: [
                      ServiceRequestStatus.SUBMITTED,
                      ServiceRequestStatus.UNDER_REVIEW,
                    ],
                  },
                },
              }),
            ]);
          if (!category) this.notFound();
          if (cities.length !== input.requestedCityIds.length) {
            throw new AppException(
              'CATALOG_CITY_UNAVAILABLE',
              HttpStatus.UNPROCESSABLE_ENTITY,
              'Every requested city must be active and supported.',
            );
          }
          if (duplicateService) {
            throw new AppException(
              'CATALOG_SERVICE_DUPLICATE',
              HttpStatus.CONFLICT,
              'Select the existing master service instead of requesting a duplicate.',
            );
          }
          if (openRequest) this.duplicateRequest();

          const request = await transaction.professionalServiceRequest.create({
            data: {
              professionalId: profile.id,
              categoryId: input.categoryId,
              proposedName: input.proposedName,
              normalizedName,
              proposedDescription: input.proposedDescription,
              suggestedDurationMinutes: input.suggestedDurationMinutes,
              suggestedPricePaise: input.suggestedPricePaise,
              cities: {
                create: input.requestedCityIds.map((cityId) => ({ cityId })),
              },
              history: {
                create: {
                  toStatus: ServiceRequestStatus.SUBMITTED,
                  actorUserId: actor.userId,
                },
              },
            },
            include: requestInclude,
          });
          await this.audit.record(transaction, {
            actor,
            action: 'service-request.submit',
            targetType: 'ProfessionalServiceRequest',
            targetId: request.id,
            requestId,
            after: {
              status: request.status,
              proposedName: request.proposedName,
            },
            changedFields: ['status', 'proposedName', 'proposedDescription'],
          });
          return request;
        },
      );
      return presentOwnServiceRequest(created);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        this.duplicateRequest();
      }
      throw error;
    }
  }

  async listOwn(actor: AuthenticatedActor, query: ServiceRequestListQuery) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId: actor.userId },
    });
    if (!profile) this.notFound();
    return this.listPage(profile.id, query, false);
  }

  listAdmin(query: ServiceRequestListQuery) {
    return this.listPage(undefined, query, true);
  }

  async getOwn(actor: AuthenticatedActor, requestId: string) {
    const request = await this.prisma.professionalServiceRequest.findFirst({
      where: {
        id: requestId,
        professional: { userId: actor.userId },
      },
      include: requestInclude,
    });
    if (!request) this.notFound();
    return presentOwnServiceRequest(request);
  }

  async startReview(
    actor: AuthenticatedActor,
    requestId: string,
    expectedVersion: number,
    correlationId: string,
  ) {
    return runSerializable(this.prisma, async (transaction) => {
      const request = await transaction.professionalServiceRequest.findUnique({
        where: { id: requestId },
      });
      if (!request) this.notFound();
      if (
        request.version !== expectedVersion ||
        request.status !== ServiceRequestStatus.SUBMITTED
      ) {
        this.invalidTransition();
      }
      await transaction.professionalServiceRequest.update({
        where: { id: requestId },
        data: {
          status: ServiceRequestStatus.UNDER_REVIEW,
          reviewedByUserId: actor.userId,
          version: { increment: 1 },
        },
      });
      await transaction.serviceRequestStatusHistory.create({
        data: {
          requestId,
          fromStatus: request.status,
          toStatus: ServiceRequestStatus.UNDER_REVIEW,
          actorUserId: actor.userId,
        },
      });
      const after =
        await transaction.professionalServiceRequest.findUniqueOrThrow({
          where: { id: requestId },
          include: requestInclude,
        });
      await this.audit.record(transaction, {
        actor,
        action: 'service-request.start-review',
        targetType: 'ProfessionalServiceRequest',
        targetId: requestId,
        requestId: correlationId,
        before: { status: request.status, version: request.version },
        after: { status: after.status, version: after.version },
        changedFields: ['status', 'reviewedByUserId', 'version'],
      });
      return presentAdminServiceRequest(after);
    });
  }

  async decide(
    actor: AuthenticatedActor,
    requestId: string,
    input: AdminServiceRequestDecision,
    correlationId: string,
  ) {
    try {
      return await runSerializable(this.prisma, async (transaction) => {
        const request = await transaction.professionalServiceRequest.findUnique(
          {
            where: { id: requestId },
            include: { cities: true },
          },
        );
        if (!request) this.notFound();
        if (
          request.version !== input.expectedVersion ||
          request.status !== ServiceRequestStatus.UNDER_REVIEW ||
          request.reviewedByUserId !== actor.userId
        ) {
          this.invalidTransition();
        }

        let linkedServiceId: string | null = null;
        if (input.decision === 'APPROVE') {
          const requestedCityIds = new Set<string>(
            request.cities.map((city) => city.cityId),
          );
          if (input.resolution.mode === 'LINK_EXISTING') {
            const service = await transaction.service.findUnique({
              where: { id: input.resolution.masterServiceId },
              include: { cityAvailability: true },
            });
            if (!service) this.notFound();
            const configuredCityIds = new Set<string>(
              service.cityAvailability.map((city) => city.cityId),
            );
            if (
              service.categoryId !== request.categoryId ||
              [...requestedCityIds].some(
                (cityId) => !configuredCityIds.has(cityId),
              )
            ) {
              this.resolutionMismatch();
            }
            linkedServiceId = service.id;
          } else {
            const resolutionCityIds = new Set<string>(
              input.resolution.service.cityPolicies.map(
                (policy) => policy.cityId,
              ),
            );
            if (
              input.resolution.service.categoryId !== request.categoryId ||
              normalizeMarketplaceName(input.resolution.service.name) !==
                request.normalizedName ||
              [...requestedCityIds].some(
                (cityId) => !resolutionCityIds.has(cityId),
              )
            ) {
              this.resolutionMismatch();
            }
            const service = await this.catalog.createInactiveService(
              transaction,
              actor.userId,
              input.resolution.service,
            );
            linkedServiceId = service.id;
          }
        }

        const status =
          input.decision === 'APPROVE'
            ? ServiceRequestStatus.APPROVED
            : ServiceRequestStatus.REJECTED;
        const updated = await transaction.professionalServiceRequest.update({
          where: { id: requestId },
          data: {
            status,
            linkedServiceId,
            reviewedAt: new Date(),
            reasonCode: input.reasonCode,
            userSafeDecisionReason:
              input.decision === 'REJECT' ? input.userMessage : null,
            internalNote: input.internalNote,
            version: { increment: 1 },
          },
          include: requestInclude,
        });
        await transaction.serviceRequestStatusHistory.create({
          data: {
            requestId,
            fromStatus: request.status,
            toStatus: status,
            actorUserId: actor.userId,
            reasonCode: input.reasonCode,
          },
        });
        await this.audit.record(transaction, {
          actor,
          action: 'service-request.decision',
          targetType: 'ProfessionalServiceRequest',
          targetId: requestId,
          requestId: correlationId,
          reasonCode: input.reasonCode,
          before: { status: request.status, version: request.version },
          after: {
            status: updated.status,
            version: updated.version,
            linkedServiceId,
          },
          changedFields: [
            'status',
            'linkedServiceId',
            'reasonCode',
            'reviewedAt',
            'version',
          ],
        });
        return presentAdminServiceRequest(updated);
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new AppException(
          'CATALOG_SERVICE_DUPLICATE',
          HttpStatus.CONFLICT,
          'An equivalent master service was created concurrently. Reload and link it.',
        );
      }
      throw error;
    }
  }

  private async listPage(
    professionalId: string | undefined,
    query: ServiceRequestListQuery,
    admin: boolean,
  ) {
    const limit = query.limit ?? 20;
    const fingerprint = this.cursors.fingerprint({
      ...query,
      after: undefined,
      professionalId,
      admin,
    });
    const cursor = this.cursors.decode(query.after, fingerprint);
    const ascending = query.sort === 'submittedAtAsc';
    const records = await this.prisma.professionalServiceRequest.findMany({
      where: {
        professionalId,
        status: query.status,
        categoryId: query.categoryId,
        cities: query.cityId ? { some: { cityId: query.cityId } } : undefined,
        ...(query.search
          ? {
              OR: [
                {
                  proposedName: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  proposedDescription: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
      include: requestInclude,
      orderBy:
        query.sort === 'updatedAtDesc'
          ? [{ updatedAt: 'desc' }, { id: 'desc' }]
          : [
              { submittedAt: ascending ? 'asc' : 'desc' },
              { id: ascending ? 'asc' : 'desc' },
            ],
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      take: limit + 1,
    });
    const hasNextPage = records.length > limit;
    const page = records.slice(0, limit);
    const last = page.at(-1);
    return {
      data: page.map(
        admin ? presentAdminServiceRequest : presentOwnServiceRequest,
      ),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? this.cursors.encode({
                id: last.id,
                sortValue:
                  query.sort === 'updatedAtDesc'
                    ? last.updatedAt.toISOString()
                    : last.submittedAt.toISOString(),
                fingerprint,
              })
            : null,
      },
    };
  }

  private duplicateRequest(): never {
    throw new AppException(
      'SERVICE_REQUEST_DUPLICATE',
      HttpStatus.CONFLICT,
      'An equivalent service request is already under review.',
    );
  }

  private invalidTransition(): never {
    throw new AppException(
      'SERVICE_REQUEST_INVALID_TRANSITION',
      HttpStatus.CONFLICT,
      'The service request changed or cannot move to that state.',
    );
  }

  private resolutionMismatch(): never {
    throw new AppException(
      'SERVICE_REQUEST_RESOLUTION_MISMATCH',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'The approved service resolution must match the requested category, name, and supported cities.',
    );
  }

  private notFound(): never {
    throw new AppException(
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      'Service request not found.',
    );
  }
}
