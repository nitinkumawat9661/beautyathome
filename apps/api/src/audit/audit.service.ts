import {
  AdminAuditEventSummarySchema,
  AdminAuditEventDetailSchema,
  type AdminAuditListQuery,
} from '@beautyathome/marketplace';
import { AuditActorType, AuditOutcome, Prisma } from '@beautyathome/database';
import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '../common/errors/app.exception';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { CursorService } from '../common/pagination/cursor.service';
import { PrismaService } from '../database/prisma/prisma.service';

type AuditWriter = Pick<Prisma.TransactionClient, 'auditEvent'>;

type AuditRecord = {
  actor: AuthenticatedActor;
  action: string;
  targetType: string;
  targetId: string;
  requestId: string;
  reasonCode?: string;
  reason?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changedFields?: string[];
};

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cursors: CursorService,
  ) {}

  record(writer: AuditWriter, event: AuditRecord) {
    return writer.auditEvent.create({
      data: {
        actorType: AuditActorType.USER,
        actorUserId: event.actor.userId,
        actorRole: event.actor.activeRole,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        outcome: AuditOutcome.SUCCEEDED,
        reasonCode: event.reasonCode,
        reason: event.reason,
        requestId: event.requestId,
        changedFields: event.changedFields ?? [],
        beforeState: this.json(event.before),
        afterState: this.json(event.after),
      },
    });
  }

  async list(query: AdminAuditListQuery) {
    const limit = query.limit ?? 20;
    const fingerprint = this.cursors.fingerprint({
      ...query,
      after: undefined,
    });
    const cursor = this.cursors.decode(query.after, fingerprint);
    const ascending = query.sort === 'createdAtAsc';

    const events = await this.prisma.auditEvent.findMany({
      where: {
        actorUserId: query.actorId,
        actorRole: query.actorRole,
        action: query.action,
        targetType: query.targetType,
        targetId: query.targetId,
        outcome: query.outcome,
        createdAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
        ...(query.search
          ? {
              OR: [
                {
                  action: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  targetType: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  reasonCode: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [
        { createdAt: ascending ? 'asc' : 'desc' },
        { id: ascending ? 'asc' : 'desc' },
      ],
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      take: limit + 1,
    });

    const hasNextPage = events.length > limit;
    const page = events.slice(0, limit);
    const data = page.map((event) =>
      AdminAuditEventSummarySchema.parse({
        id: event.id,
        actorType: event.actorType,
        actorId: event.actorUserId,
        actorRole: event.actorRole,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        outcome: event.outcome,
        reasonCode: event.reasonCode,
        requestId: event.requestId,
        changedFields: event.changedFields,
        createdAt: event.createdAt.toISOString(),
      }),
    );
    const last = page.at(-1);

    return {
      data,
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? this.cursors.encode({
                id: last.id,
                sortValue: last.createdAt.toISOString(),
                fingerprint,
              })
            : null,
      },
    };
  }

  async get(eventId: string) {
    const event = await this.prisma.auditEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new AppException(
        'RESOURCE_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        'Audit event not found.',
      );
    }
    const summary = AdminAuditEventSummarySchema.parse({
      id: event.id,
      actorType: event.actorType,
      actorId: event.actorUserId,
      actorRole: event.actorRole,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      outcome: event.outcome,
      reasonCode: event.reasonCode,
      requestId: event.requestId,
      changedFields: event.changedFields,
      createdAt: event.createdAt.toISOString(),
    });
    return AdminAuditEventDetailSchema.parse({
      ...summary,
      reason: event.reason,
      beforeState: this.auditState(event.beforeState),
      afterState: this.auditState(event.afterState),
    });
  }

  private auditState(
    value: Prisma.JsonValue | null,
  ): Record<string, unknown> | null {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value;
  }

  private json(
    value: Record<string, unknown> | undefined,
  ): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
