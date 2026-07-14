import { randomUUID } from 'node:crypto';

import { Prisma, Role, UserStatus } from '@beautyathome/database';
import {
  AdminProfessionalApplicationPageSchema,
  ProfessionalApplicationAcceptedSchema,
  ProfessionalApplicationDetailSchema,
  ProfessionalApplicationSummarySchema,
  type AdminProfessionalApplicationDecision,
  type AdminProfessionalApplicationListQuery,
  type ProfessionalApplicationAccepted,
  type ProfessionalApplicationInput,
  type ProfessionalApplicationStartReview,
} from '@beautyathome/marketplace';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuditService } from '../audit/audit.service';
import { AuthCryptoService } from '../auth/auth-crypto.service';
import { AppException } from '../common/errors/app.exception';
import { CursorService } from '../common/pagination/cursor.service';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import type { Environment } from '../config/environment';
import { PrismaService } from '../database/prisma/prisma.service';

interface StoredApplication {
  referenceId: string;
  submittedAt: Date;
}

interface ApplicationRow {
  id: string;
  referenceId: string;
  fullName: string;
  mobileNumberCiphertext: string;
  mobileNumberLookupHash: string;
  mobileNumberEncryptionKeyVersion: string;
  city: string;
  experienceBand: string;
  services: unknown;
  coverage: string;
  workSummary: string;
  consentedAt: Date;
  status: string;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  linkedUserId: string | null;
  decisionReasonCode: string | null;
  decisionNote: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const APPLICATION_SELECT = Prisma.sql`
  id,
  public_reference_id AS "referenceId",
  full_name AS "fullName",
  mobile_number_ciphertext AS "mobileNumberCiphertext",
  mobile_number_lookup_hash AS "mobileNumberLookupHash",
  mobile_number_encryption_key_version AS "mobileNumberEncryptionKeyVersion",
  city,
  experience_band::text AS "experienceBand",
  services,
  coverage,
  work_summary AS "workSummary",
  consented_at AS "consentedAt",
  status::text,
  reviewed_at AS "reviewedAt",
  reviewed_by_user_id AS "reviewedByUserId",
  linked_user_id AS "linkedUserId",
  decision_reason_code AS "decisionReasonCode",
  decision_note AS "decisionNote",
  version,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

@Injectable()
export class ProfessionalApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: AuthCryptoService,
    private readonly config: ConfigService<Environment, true>,
    private readonly cursors: CursorService,
    private readonly audit: AuditService,
  ) {}

  async submit(input: ProfessionalApplicationInput): Promise<ProfessionalApplicationAccepted> {
    const referenceId = randomUUID();
    const mobileLookupHash = this.crypto.mobileLookup(input.mobileNumber);
    const mobileNumberCiphertext = this.crypto.encryptMobile(input.mobileNumber);
    const mobileNumberEncryptionKeyVersion = this.config.get('PII_ENCRYPTION_KEY_VERSION', {
      infer: true,
    });
    const servicesJson = JSON.stringify(input.services);

    const applications = await this.prisma.$queryRaw<StoredApplication[]>`
      WITH inserted AS (
        INSERT INTO professional_interest_applications (
          public_reference_id,
          full_name,
          mobile_number_ciphertext,
          mobile_number_lookup_hash,
          mobile_number_encryption_key_version,
          city,
          experience_band,
          services,
          coverage,
          work_summary,
          consented_at,
          status,
          created_at,
          updated_at
        ) VALUES (
          ${referenceId}::uuid,
          ${input.fullName},
          ${mobileNumberCiphertext},
          ${mobileLookupHash},
          ${mobileNumberEncryptionKeyVersion},
          ${input.city},
          ${input.experienceBand}::professional_experience_band,
          CAST(${servicesJson} AS jsonb),
          ${input.coverage},
          ${input.workSummary},
          CURRENT_TIMESTAMP,
          'SUBMITTED'::professional_interest_status,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (mobile_number_lookup_hash) DO UPDATE
        SET
          public_reference_id = EXCLUDED.public_reference_id,
          updated_at = CURRENT_TIMESTAMP
        RETURNING public_reference_id, updated_at
      )
      SELECT public_reference_id AS "referenceId", updated_at AS "submittedAt"
      FROM inserted
    `;

    const application = applications[0];
    if (!application) {
      throw new Error('Professional application could not be persisted');
    }

    return ProfessionalApplicationAcceptedSchema.parse({
      accepted: true,
      referenceId: application.referenceId,
      submittedAt: application.submittedAt.toISOString(),
    });
  }

  async listAdmin(query: AdminProfessionalApplicationListQuery) {
    const limit = query.limit ?? 20;
    const fingerprint = this.cursors.fingerprint({ status: query.status });
    const cursor = this.cursors.decode(query.after, fingerprint);
    const status = query.status ?? null;
    const cursorSort = cursor?.sortValue ?? null;
    const cursorId = cursor?.id ?? null;

    const rows = await this.prisma.$queryRaw<ApplicationRow[]>`
      SELECT ${APPLICATION_SELECT}
      FROM professional_interest_applications
      WHERE (
        CAST(${status} AS text) IS NULL
        OR status::text = CAST(${status} AS text)
      )
      AND (
        CAST(${cursorSort} AS timestamptz) IS NULL
        OR created_at < CAST(${cursorSort} AS timestamptz)
        OR (
          created_at = CAST(${cursorSort} AS timestamptz)
          AND id < CAST(${cursorId} AS uuid)
        )
      )
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit + 1}
    `;

    const hasNextPage = rows.length > limit;
    const page = rows.slice(0, limit);
    const last = page.at(-1);

    return AdminProfessionalApplicationPageSchema.parse({
      data: page.map((row) => this.summary(row)),
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
    });
  }

  async getAdmin(applicationId: string) {
    const rows = await this.prisma.$queryRaw<ApplicationRow[]>`
      SELECT ${APPLICATION_SELECT}
      FROM professional_interest_applications
      WHERE id = ${applicationId}::uuid
      LIMIT 1
    `;

    return this.detail(this.requireApplication(rows[0]));
  }

  async startReview(
    actor: AuthenticatedActor,
    applicationId: string,
    input: ProfessionalApplicationStartReview,
    requestId: string,
  ) {
    return this.runSerializable(async (transaction) => {
      const currentRows = await transaction.$queryRaw<ApplicationRow[]>`
        SELECT ${APPLICATION_SELECT}
        FROM professional_interest_applications
        WHERE id = ${applicationId}::uuid
        FOR UPDATE
      `;
      const current = this.requireApplication(currentRows[0]);
      this.assertVersion(current, input.expectedVersion);

      if (current.status !== 'SUBMITTED') {
        throw new AppException(
          'CONFLICT',
          HttpStatus.CONFLICT,
          'This application cannot enter review from its current status.',
        );
      }

      const updatedRows = await transaction.$queryRaw<ApplicationRow[]>`
        UPDATE professional_interest_applications
        SET
          status = 'UNDER_REVIEW'::professional_interest_status,
          reviewed_by_user_id = ${actor.userId}::uuid,
          reviewed_at = CURRENT_TIMESTAMP,
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${applicationId}::uuid
        RETURNING ${APPLICATION_SELECT}
      `;
      const updated = this.requireApplication(updatedRows[0]);

      await this.audit.record(transaction, {
        actor,
        action: 'professional_application.start_review',
        targetType: 'professional_interest_application',
        targetId: current.id,
        requestId,
        before: { status: current.status, version: current.version },
        after: { status: updated.status, version: updated.version },
        changedFields: ['status', 'reviewedByUserId', 'reviewedAt', 'version'],
      });

      return this.detail(updated);
    });
  }

  async decide(
    actor: AuthenticatedActor,
    applicationId: string,
    input: AdminProfessionalApplicationDecision,
    requestId: string,
  ) {
    return this.runSerializable(async (transaction) => {
      const currentRows = await transaction.$queryRaw<ApplicationRow[]>`
        SELECT ${APPLICATION_SELECT}
        FROM professional_interest_applications
        WHERE id = ${applicationId}::uuid
        FOR UPDATE
      `;
      const current = this.requireApplication(currentRows[0]);
      this.assertVersion(current, input.expectedVersion);

      if (!['SUBMITTED', 'UNDER_REVIEW'].includes(current.status)) {
        throw new AppException(
          'CONFLICT',
          HttpStatus.CONFLICT,
          'This application already has a final decision.',
        );
      }

      const linkedUserId =
        input.decision === 'APPROVE'
          ? await this.provisionProfessional(transaction, current)
          : null;
      const nextStatus = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const decisionNote = input.internalNote ?? null;

      const updatedRows = await transaction.$queryRaw<ApplicationRow[]>`
        UPDATE professional_interest_applications
        SET
          status = ${nextStatus}::professional_interest_status,
          reviewed_by_user_id = ${actor.userId}::uuid,
          reviewed_at = CURRENT_TIMESTAMP,
          linked_user_id = CAST(${linkedUserId} AS uuid),
          decision_reason_code = ${input.reasonCode},
          decision_note = ${decisionNote},
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${applicationId}::uuid
        RETURNING ${APPLICATION_SELECT}
      `;
      const updated = this.requireApplication(updatedRows[0]);

      await this.audit.record(transaction, {
        actor,
        action: `professional_application.${input.decision.toLowerCase()}`,
        targetType: 'professional_interest_application',
        targetId: current.id,
        requestId,
        reasonCode: input.reasonCode,
        reason: input.internalNote,
        before: {
          status: current.status,
          version: current.version,
          linkedUserId: current.linkedUserId,
        },
        after: {
          status: updated.status,
          version: updated.version,
          linkedUserId: updated.linkedUserId,
        },
        changedFields: [
          'status',
          'reviewedByUserId',
          'reviewedAt',
          'linkedUserId',
          'decisionReasonCode',
          'decisionNote',
          'version',
        ],
      });

      return this.detail(updated);
    });
  }

  private async provisionProfessional(
    transaction: Prisma.TransactionClient,
    application: ApplicationRow,
  ): Promise<string> {
    let user = await transaction.user.findFirst({
      where: {
        mobileNumberLookupHash: application.mobileNumberLookupHash,
        deletedAt: null,
      },
      include: { roles: true },
    });

    if (user && (user.status === UserStatus.BLOCKED || user.status === UserStatus.CLOSED)) {
      throw new AppException(
        'AUTH_ACCOUNT_UNAVAILABLE',
        HttpStatus.CONFLICT,
        'The mobile number belongs to an unavailable account.',
      );
    }

    if (!user) {
      user = await transaction.user.create({
        data: {
          mobileNumberCiphertext: application.mobileNumberCiphertext,
          mobileNumberLookupHash: application.mobileNumberLookupHash,
          mobileNumberEncryptionKeyVersion: application.mobileNumberEncryptionKeyVersion,
          mobileVerifiedAt: new Date(),
        },
        include: { roles: true },
      });
    }

    if (!user.roles.some((grant) => grant.role === Role.PROFESSIONAL)) {
      await transaction.userRole.create({
        data: { userId: user.id, role: Role.PROFESSIONAL },
      });
    }

    await transaction.professionalProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName: application.fullName,
      },
      update: {},
    });

    return user.id;
  }

  private summary(row: ApplicationRow) {
    const mobileNumber = this.crypto.decryptMobile(row.mobileNumberCiphertext);

    return ProfessionalApplicationSummarySchema.parse({
      id: row.id,
      referenceId: row.referenceId,
      fullName: row.fullName,
      maskedMobileNumber: this.crypto.maskMobile(mobileNumber),
      city: row.city,
      experienceBand: row.experienceBand,
      services: row.services,
      status: row.status,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  private detail(row: ApplicationRow) {
    const mobileNumber = this.crypto.decryptMobile(row.mobileNumberCiphertext);

    return ProfessionalApplicationDetailSchema.parse({
      ...this.summary(row),
      mobileNumber,
      coverage: row.coverage,
      workSummary: row.workSummary,
      consentedAt: row.consentedAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewedByUserId: row.reviewedByUserId,
      linkedUserId: row.linkedUserId,
      decisionReasonCode: row.decisionReasonCode,
      decisionNote: row.decisionNote,
    });
  }

  private requireApplication(row: ApplicationRow | undefined): ApplicationRow {
    if (row) return row;

    throw new AppException(
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      'Professional application not found.',
    );
  }

  private assertVersion(row: ApplicationRow, expectedVersion: number): void {
    if (row.version === expectedVersion) return;

    throw new AppException(
      'OPTIMISTIC_LOCK_CONFLICT',
      HttpStatus.CONFLICT,
      'The application changed after it was loaded. Refresh and try again.',
    );
  }

  private async runSerializable<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error: unknown) {
        const retryable =
          typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034';
        if (!retryable || attempt === 3) throw error;
      }
    }

    throw new Error('Serializable transaction retry budget exhausted');
  }
}
