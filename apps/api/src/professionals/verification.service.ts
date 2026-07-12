import {
  LaunchEligibilityStatus,
  UserStatus,
  VerificationApplicationStatus,
  VerificationStatus,
} from '@beautyathome/database';
import {
  AdminVerificationNoteSchema,
  type AdminVerificationDecision,
  type AdminVerificationNoteCreate,
  type ProfessionalVerificationSubmission,
} from '@beautyathome/marketplace';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuditService } from '../audit/audit.service';
import { runSerializable } from '../common/database/serializable';
import { AppException } from '../common/errors/app.exception';
import { CursorService } from '../common/pagination/cursor.service';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import type { Environment } from '../config/environment';
import { PrismaService } from '../database/prisma/prisma.service';
import {
  presentAdminApplication,
  presentOwnApplication,
} from './professionals.presenter';
import { ProfessionalsService } from './professionals.service';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly professionals: ProfessionalsService,
    private readonly config: ConfigService<Environment, true>,
    private readonly cursors: CursorService,
    private readonly audit: AuditService,
  ) {}

  async current(actor: AuthenticatedActor) {
    const application = await this.prisma.verificationApplication.findFirst({
      where: { professional: { userId: actor.userId } },
      orderBy: { version: 'desc' },
    });
    return application ? presentOwnApplication(application) : null;
  }

  async submit(
    actor: AuthenticatedActor,
    input: ProfessionalVerificationSubmission,
    requestId: string,
  ) {
    const policyVersion = this.policyVersion();
    if (input.eligibilityPolicyVersionAcknowledged !== policyVersion) {
      this.policyUnavailable();
    }
    const application = await runSerializable(
      this.prisma,
      async (transaction) => {
        const profile = await transaction.professionalProfile.findUnique({
          where: { userId: actor.userId },
          include: { serviceAreas: true },
        });
        if (!profile) this.notFound();
        if (profile.version !== input.expectedProfileVersion) {
          this.optimisticConflict();
        }
        if (
          !profile.displayName ||
          !profile.biography ||
          profile.experienceYears === null ||
          !profile.cityId ||
          profile.languages.length === 0 ||
          profile.serviceAreas.length === 0
        ) {
          this.incomplete();
        }

        const certificates = await transaction.professionalCertificate.findMany(
          {
            where: {
              professionalId: profile.id,
              id: { in: input.certificateIds },
            },
          },
        );
        if (certificates.length !== input.certificateIds.length) {
          this.incomplete();
        }

        const latest = await transaction.verificationApplication.findFirst({
          where: { professionalId: profile.id },
          orderBy: { version: 'desc' },
        });
        if (
          latest &&
          latest.status !== VerificationApplicationStatus.DRAFT &&
          !(
            latest.status === VerificationApplicationStatus.APPROVED &&
            profile.verificationStatus === VerificationStatus.DRAFT
          )
        ) {
          this.invalidTransition();
        }
        const now = new Date();
        const submitted =
          latest?.status === VerificationApplicationStatus.DRAFT
            ? await transaction.verificationApplication.update({
                where: { id: latest.id },
                data: {
                  status: VerificationApplicationStatus.SUBMITTED,
                  eligibilityPolicyVersionAcknowledged: policyVersion,
                  eligibilityDeclarationAcceptedAt: now,
                  submittedAt: now,
                  reviewedByUserId: null,
                  reviewedAt: null,
                  reasonCode: null,
                  userSafeDecisionReason: null,
                  internalNote: null,
                  correctionAllowed: false,
                },
              })
            : await transaction.verificationApplication.create({
                data: {
                  professionalId: profile.id,
                  version: (latest?.version ?? 0) + 1,
                  status: VerificationApplicationStatus.SUBMITTED,
                  eligibilityPolicyVersionAcknowledged: policyVersion,
                  eligibilityDeclarationAcceptedAt: now,
                  submittedAt: now,
                },
              });
        if (certificates.length > 0) {
          await transaction.verificationEvidenceSnapshot.createMany({
            data: certificates.map((certificate) => ({
              applicationId: submitted.id,
              sourceCertificateId: certificate.id,
              uploadId: certificate.uploadId,
              title: certificate.title,
              issuer: certificate.issuer,
              issuedOn: certificate.issuedOn,
              expiresOn: certificate.expiresOn,
              moderationStatus: certificate.moderationStatus,
              privateObjectKey: certificate.privateObjectKey,
            })),
          });
        }
        await transaction.verificationStatusHistory.create({
          data: {
            applicationId: submitted.id,
            fromStatus:
              latest?.status === VerificationApplicationStatus.DRAFT
                ? VerificationApplicationStatus.DRAFT
                : null,
            toStatus: VerificationApplicationStatus.SUBMITTED,
            actorUserId: actor.userId,
          },
        });
        const updatedProfile = await transaction.professionalProfile.updateMany(
          {
            where: { id: profile.id, version: input.expectedProfileVersion },
            data: {
              verificationStatus: VerificationStatus.SUBMITTED,
              launchEligibilityStatus: LaunchEligibilityStatus.NOT_ASSESSED,
              isServiceActive: false,
              version: { increment: 1 },
            },
          },
        );
        if (updatedProfile.count !== 1) this.optimisticConflict();
        await this.audit.record(transaction, {
          actor,
          action: 'verification.submit',
          targetType: 'VerificationApplication',
          targetId: submitted.id,
          requestId,
          before: { status: latest?.status ?? null },
          after: {
            status: submitted.status,
            version: submitted.version,
            evidenceCount: certificates.length,
          },
          changedFields: ['status', 'submittedAt', 'evidence'],
        });
        return submitted;
      },
    );
    return presentOwnApplication(application);
  }

  async resubmit(
    actor: AuthenticatedActor,
    applicationId: string,
    requestId: string,
  ) {
    const policyVersion = this.policyVersion();
    const application = await runSerializable(
      this.prisma,
      async (transaction) => {
        const rejected = await transaction.verificationApplication.findFirst({
          where: {
            id: applicationId,
            professional: { userId: actor.userId },
          },
        });
        if (
          !rejected ||
          rejected.status !== VerificationApplicationStatus.REJECTED ||
          !rejected.correctionAllowed
        ) {
          this.invalidTransition();
        }
        const latest = await transaction.verificationApplication.findFirst({
          where: { professionalId: rejected.professionalId },
          orderBy: { version: 'desc' },
        });
        if (!latest || latest.id !== rejected.id) this.invalidTransition();
        const draft = await transaction.verificationApplication.create({
          data: {
            professionalId: rejected.professionalId,
            version: rejected.version + 1,
            status: VerificationApplicationStatus.DRAFT,
            eligibilityPolicyVersionAcknowledged: policyVersion,
            eligibilityDeclarationAcceptedAt: new Date(),
          },
        });
        await transaction.verificationStatusHistory.create({
          data: {
            applicationId: draft.id,
            toStatus: VerificationApplicationStatus.DRAFT,
            actorUserId: actor.userId,
            reasonCode: 'CORRECTION_RESUBMISSION',
          },
        });
        await this.audit.record(transaction, {
          actor,
          action: 'verification.resubmit-draft',
          targetType: 'VerificationApplication',
          targetId: draft.id,
          requestId,
          reasonCode: 'CORRECTION_RESUBMISSION',
          after: { status: draft.status, version: draft.version },
          changedFields: ['status', 'version'],
        });
        return draft;
      },
    );
    return presentOwnApplication(application);
  }

  async listAdmin(query: {
    status?: (typeof VerificationApplicationStatus)[keyof typeof VerificationApplicationStatus];
    search?: string;
    after?: string;
    limit?: number;
  }) {
    const limit = query.limit ?? 20;
    const fingerprint = this.cursors.fingerprint({
      ...query,
      after: undefined,
      resource: 'verification-applications',
    });
    const cursor = this.cursors.decode(query.after, fingerprint);
    const applications = await this.prisma.verificationApplication.findMany({
      where: {
        status: query.status,
        professional: query.search
          ? {
              displayName: {
                contains: query.search,
                mode: 'insensitive',
              },
            }
          : undefined,
      },
      orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      take: limit + 1,
    });
    const hasNextPage = applications.length > limit;
    const page = applications.slice(0, limit);
    const last = page.at(-1);
    return {
      data: page.map(presentAdminApplication),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? this.cursors.encode({
                id: last.id,
                sortValue:
                  last.submittedAt?.toISOString() ??
                  last.createdAt.toISOString(),
                fingerprint,
              })
            : null,
      },
    };
  }

  async getAdmin(applicationId: string) {
    const application = await this.prisma.verificationApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application) this.notFound();
    return presentAdminApplication(application);
  }

  async listNotes(
    applicationId: string,
    query: { after?: string; limit?: number },
  ) {
    const application = await this.prisma.verificationApplication.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });
    if (!application) this.notFound();
    const limit = query.limit ?? 20;
    const fingerprint = this.cursors.fingerprint({
      applicationId,
      resource: 'verification-notes',
    });
    const cursor = this.cursors.decode(query.after, fingerprint);
    const notes = await this.prisma.verificationNote.findMany({
      where: { applicationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      take: limit + 1,
    });
    const hasNextPage = notes.length > limit;
    const page = notes.slice(0, limit);
    const last = page.at(-1);
    return {
      data: page.map((note) =>
        AdminVerificationNoteSchema.parse({
          id: note.id,
          applicationId: note.applicationId,
          authorAdminId: note.authorUserId,
          note: note.note,
          createdAt: note.createdAt.toISOString(),
        }),
      ),
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

  async startReview(
    actor: AuthenticatedActor,
    applicationId: string,
    expectedVersion: number,
    requestId: string,
  ) {
    return runSerializable(this.prisma, async (transaction) => {
      const application = await transaction.verificationApplication.findUnique({
        where: { id: applicationId },
      });
      if (
        !application ||
        application.version !== expectedVersion ||
        application.status !== VerificationApplicationStatus.SUBMITTED
      ) {
        this.invalidTransition();
      }
      const updated = await transaction.verificationApplication.update({
        where: { id: applicationId },
        data: {
          status: VerificationApplicationStatus.UNDER_REVIEW,
          reviewedByUserId: actor.userId,
        },
      });
      await transaction.verificationStatusHistory.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus: updated.status,
          actorUserId: actor.userId,
        },
      });
      await transaction.professionalProfile.update({
        where: { id: application.professionalId },
        data: {
          verificationStatus: VerificationStatus.UNDER_REVIEW,
          launchEligibilityStatus: LaunchEligibilityStatus.UNDER_REVIEW,
          isServiceActive: false,
          version: { increment: 1 },
        },
      });
      await this.audit.record(transaction, {
        actor,
        action: 'verification.start-review',
        targetType: 'VerificationApplication',
        targetId: applicationId,
        requestId,
        before: { status: application.status },
        after: { status: updated.status },
        changedFields: ['status', 'reviewedByUserId'],
      });
      return presentAdminApplication(updated);
    });
  }

  async decide(
    actor: AuthenticatedActor,
    applicationId: string,
    input: AdminVerificationDecision,
    requestId: string,
  ) {
    const approving = input.decision === 'APPROVE';
    const policyVersion = approving ? this.policyVersion() : null;
    return runSerializable(this.prisma, async (transaction) => {
      const application = await transaction.verificationApplication.findUnique({
        where: { id: applicationId },
        include: {
          evidence: true,
          professional: {
            include: {
              user: true,
              serviceAreas: true,
            },
          },
        },
      });
      if (
        !application ||
        application.version !== input.expectedVersion ||
        application.status !== VerificationApplicationStatus.UNDER_REVIEW ||
        application.reviewedByUserId !== actor.userId
      ) {
        this.invalidTransition();
      }
      if (application.professional.userId === actor.userId) {
        throw new AppException(
          'FORBIDDEN',
          HttpStatus.FORBIDDEN,
          'Self-approval of a Professional application is prohibited.',
        );
      }

      if (
        approving &&
        (input.eligibilityPolicyVersionReviewed !== policyVersion ||
          application.eligibilityPolicyVersionAcknowledged !== policyVersion)
      ) {
        this.policyUnavailable();
      }
      if (
        approving &&
        (!application.professional.displayName ||
          !application.professional.biography ||
          application.professional.experienceYears === null ||
          !application.professional.cityId ||
          application.professional.languages.length === 0 ||
          application.professional.serviceAreas.length === 0 ||
          application.professional.user.status !== UserStatus.ACTIVE)
      ) {
        this.incomplete();
      }

      const correction = input.decision === 'REQUEST_CHANGES';
      const status = approving
        ? VerificationApplicationStatus.APPROVED
        : VerificationApplicationStatus.REJECTED;
      const now = new Date();
      const updated = await transaction.verificationApplication.update({
        where: { id: applicationId },
        data: {
          status,
          reviewedAt: now,
          reasonCode: input.reasonCode,
          userSafeDecisionReason:
            input.decision === 'APPROVE' ? null : input.userMessage,
          internalNote: input.internalNote,
          correctionAllowed: correction,
        },
      });
      await transaction.verificationStatusHistory.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus: status,
          actorUserId: actor.userId,
          reasonCode: input.reasonCode,
        },
      });
      await transaction.professionalProfile.update({
        where: { id: application.professionalId },
        data: {
          verificationStatus: approving
            ? VerificationStatus.APPROVED
            : VerificationStatus.REJECTED,
          launchEligibilityStatus: approving
            ? LaunchEligibilityStatus.ELIGIBLE
            : correction
              ? LaunchEligibilityStatus.NOT_ASSESSED
              : LaunchEligibilityStatus.INELIGIBLE,
          eligibilityPolicyVersion: approving ? policyVersion : null,
          eligibilityReviewedByUserId: actor.userId,
          eligibilityReviewedAt: now,
          isServiceActive: approving,
          version: { increment: 1 },
        },
      });
      await this.audit.record(transaction, {
        actor,
        action: 'verification.decision',
        targetType: 'VerificationApplication',
        targetId: applicationId,
        requestId,
        reasonCode: input.reasonCode,
        before: { status: application.status },
        after: {
          status: updated.status,
          correctionAllowed: correction,
          evidenceCount: application.evidence.length,
        },
        changedFields: [
          'status',
          'reasonCode',
          'reviewedAt',
          'correctionAllowed',
        ],
      });
      return presentAdminApplication(updated);
    });
  }

  async addNote(
    actor: AuthenticatedActor,
    applicationId: string,
    input: AdminVerificationNoteCreate,
    requestId: string,
  ) {
    await runSerializable(this.prisma, async (transaction) => {
      const application = await transaction.verificationApplication.findUnique({
        where: { id: applicationId },
      });
      if (!application) this.notFound();
      if (application.version !== input.expectedVersion) {
        this.optimisticConflict();
      }
      const note = await transaction.verificationNote.create({
        data: {
          applicationId,
          authorUserId: actor.userId,
          note: input.note,
        },
      });
      await this.audit.record(transaction, {
        actor,
        action: 'verification.note.create',
        targetType: 'VerificationApplication',
        targetId: applicationId,
        requestId,
        after: { noteId: note.id },
        changedFields: ['notes'],
      });
    });
    return this.getAdmin(applicationId);
  }

  async changeProfessionalStatus(
    actor: AuthenticatedActor,
    professionalId: string,
    input: {
      action: 'SUSPEND' | 'REACTIVATE';
      reasonCode: string;
      reason: string;
      eligibilityPolicyVersionReviewed?: string;
      expectedProfileVersion: number;
    },
    requestId: string,
  ) {
    const reactivating = input.action === 'REACTIVATE';
    const policyVersion = reactivating ? this.policyVersion() : null;
    return runSerializable(this.prisma, async (transaction) => {
      const profile = await transaction.professionalProfile.findUnique({
        where: { id: professionalId },
        include: { user: true },
      });
      if (!profile || profile.version !== input.expectedProfileVersion) {
        this.optimisticConflict();
      }
      if (
        (reactivating &&
          (profile.verificationStatus !== VerificationStatus.SUSPENDED ||
            profile.user.status !== UserStatus.ACTIVE ||
            input.eligibilityPolicyVersionReviewed !== policyVersion)) ||
        (!reactivating &&
          profile.verificationStatus !== VerificationStatus.APPROVED)
      ) {
        this.invalidTransition();
      }
      const updated = await transaction.professionalProfile.update({
        where: { id: professionalId },
        data: {
          verificationStatus: reactivating
            ? VerificationStatus.APPROVED
            : VerificationStatus.SUSPENDED,
          launchEligibilityStatus: reactivating
            ? LaunchEligibilityStatus.ELIGIBLE
            : LaunchEligibilityStatus.SUSPENDED,
          eligibilityPolicyVersion: reactivating ? policyVersion : undefined,
          eligibilityReviewedByUserId: actor.userId,
          eligibilityReviewedAt: new Date(),
          isServiceActive: reactivating,
          version: { increment: 1 },
        },
      });
      await this.audit.record(transaction, {
        actor,
        action: reactivating
          ? 'professional.reactivate'
          : 'professional.suspend',
        targetType: 'ProfessionalProfile',
        targetId: professionalId,
        requestId,
        reasonCode: input.reasonCode,
        reason: input.reason,
        before: { verificationStatus: profile.verificationStatus },
        after: { verificationStatus: updated.verificationStatus },
        changedFields: [
          'verificationStatus',
          'launchEligibilityStatus',
          'isServiceActive',
        ],
      });
      return updated;
    });
  }

  private policyVersion(): string {
    const value = this.config.get('PROFESSIONAL_ELIGIBILITY_POLICY_VERSION', {
      infer: true,
    });
    if (!value) this.policyUnavailable();
    return value;
  }

  private policyUnavailable(): never {
    throw new AppException(
      'VERIFICATION_ELIGIBILITY_NOT_CONFIRMED',
      HttpStatus.SERVICE_UNAVAILABLE,
      'Professional approval is unavailable until the reviewed launch eligibility policy is configured.',
    );
  }

  private incomplete(): never {
    throw new AppException(
      'VERIFICATION_APPLICATION_INCOMPLETE',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'Complete the required profile, service areas, declarations, and reviewed evidence before submission.',
    );
  }

  private invalidTransition(): never {
    throw new AppException(
      'VERIFICATION_INVALID_TRANSITION',
      HttpStatus.CONFLICT,
      'The verification application changed or cannot move to that state.',
    );
  }

  private optimisticConflict(): never {
    throw new AppException(
      'OPTIMISTIC_LOCK_CONFLICT',
      HttpStatus.CONFLICT,
      'The Professional profile changed. Reload it and retry.',
    );
  }

  private notFound(): never {
    throw new AppException(
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      'Verification application not found.',
    );
  }
}
