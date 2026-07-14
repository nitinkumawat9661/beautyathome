import {
  AdminProfessionalApplicationDecisionSchema,
  ProfessionalApplicationInputSchema,
} from '@beautyathome/marketplace';
import type { ConfigService } from '@nestjs/config';

import type { AuditService } from '../audit/audit.service';
import type { AuthCryptoService } from '../auth/auth-crypto.service';
import type { CursorService } from '../common/pagination/cursor.service';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import type { Environment } from '../config/environment';
import type { PrismaService } from '../database/prisma/prisma.service';
import { ProfessionalApplicationsService } from './professional-applications.service';

const input = ProfessionalApplicationInputSchema.parse({
  fullName: 'Asha Sharma',
  mobileNumber: '98765 43210',
  city: 'Sikar',
  experienceBand: 'THREE_TO_FIVE',
  services: ['MAKEUP', 'SKIN_FACIAL'],
  coverage: 'Piprali Road and nearby areas',
  workSummary:
    'I provide party makeup and facial services for home appointments.',
  consent: true,
});

const actor: AuthenticatedActor = {
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  sessionId: 'session-id',
  activeRole: 'ADMIN',
  roles: ['ADMIN'],
  status: 'ACTIVE',
};

const applicationRow = {
  id: '11111111-1111-4111-8111-111111111111',
  referenceId: '22222222-2222-4222-8222-222222222222',
  fullName: 'Asha Sharma',
  mobileNumberCiphertext: 'encrypted-mobile',
  mobileNumberLookupHash: 'a'.repeat(64),
  mobileNumberEncryptionKeyVersion: 'v1',
  city: 'Sikar',
  experienceBand: 'THREE_TO_FIVE',
  services: ['MAKEUP', 'SKIN_FACIAL'],
  coverage: 'Piprali Road and nearby areas',
  workSummary:
    'I provide party makeup and facial services for home appointments.',
  consentedAt: new Date('2026-07-15T08:00:00.000Z'),
  status: 'UNDER_REVIEW',
  reviewedAt: new Date('2026-07-15T08:15:00.000Z'),
  reviewedByUserId: actor.userId,
  linkedUserId: null,
  decisionReasonCode: null,
  decisionNote: null,
  version: 2,
  createdAt: new Date('2026-07-15T08:00:00.000Z'),
  updatedAt: new Date('2026-07-15T08:15:00.000Z'),
};

describe('ProfessionalApplicationsService', () => {
  it('encrypts mobile data and returns a neutral accepted response', async () => {
    const submittedAt = new Date('2026-07-15T08:30:00.000Z');
    const queryRaw = jest.fn().mockResolvedValue([
      {
        referenceId: '11111111-1111-4111-8111-111111111111',
        submittedAt,
      },
    ]);
    const crypto = {
      mobileLookup: jest.fn().mockReturnValue('a'.repeat(64)),
      encryptMobile: jest.fn().mockReturnValue('encrypted-mobile'),
    };
    const config = {
      get: jest.fn().mockReturnValue('v1'),
    };
    const service = new ProfessionalApplicationsService(
      { $queryRaw: queryRaw } as unknown as PrismaService,
      crypto as unknown as AuthCryptoService,
      config as unknown as ConfigService<Environment, true>,
      {} as CursorService,
      {} as AuditService,
    );

    await expect(service.submit(input)).resolves.toEqual({
      accepted: true,
      referenceId: '11111111-1111-4111-8111-111111111111',
      submittedAt: submittedAt.toISOString(),
    });
    expect(crypto.mobileLookup).toHaveBeenCalledWith('+919876543210');
    expect(crypto.encryptMobile).toHaveBeenCalledWith('+919876543210');
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('approves an application and provisions professional access', async () => {
    const linkedUserId = '33333333-3333-4333-8333-333333333333';
    const approvedRow = {
      ...applicationRow,
      status: 'APPROVED',
      linkedUserId,
      decisionReasonCode: 'APPLICATION_APPROVED',
      decisionNote: 'Identity and services reviewed.',
      version: 3,
      updatedAt: new Date('2026-07-15T08:30:00.000Z'),
    };
    const queryRaw = jest
      .fn()
      .mockResolvedValueOnce([applicationRow])
      .mockResolvedValueOnce([approvedRow]);
    const transaction = {
      $queryRaw: queryRaw,
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: linkedUserId,
          status: 'ACTIVE',
          roles: [],
        }),
      },
      userRole: { create: jest.fn().mockResolvedValue({}) },
      professionalProfile: { upsert: jest.fn().mockResolvedValue({}) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn(
        async (operation: (writer: typeof transaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    };
    const crypto = {
      decryptMobile: jest.fn().mockReturnValue('+919876543210'),
      maskMobile: jest.fn().mockReturnValue('+91******3210'),
    };
    const audit = { record: jest.fn().mockResolvedValue({}) };
    const service = new ProfessionalApplicationsService(
      prisma as unknown as PrismaService,
      crypto as unknown as AuthCryptoService,
      {} as ConfigService<Environment, true>,
      {} as CursorService,
      audit as unknown as AuditService,
    );
    const decision = AdminProfessionalApplicationDecisionSchema.parse({
      decision: 'APPROVE',
      expectedVersion: 2,
      reasonCode: 'APPLICATION_APPROVED',
      internalNote: 'Identity and services reviewed.',
    });

    await expect(
      service.decide(actor, applicationRow.id, decision, 'request-id'),
    ).resolves.toMatchObject({
      id: applicationRow.id,
      status: 'APPROVED',
      linkedUserId,
      version: 3,
    });
    expect(transaction.userRole.create).toHaveBeenCalledWith({
      data: { userId: linkedUserId, role: 'PROFESSIONAL' },
    });
    expect(transaction.professionalProfile.upsert).toHaveBeenCalledWith({
      where: { userId: linkedUserId },
      create: { userId: linkedUserId, displayName: 'Asha Sharma' },
      update: {},
    });
    expect(audit.record).toHaveBeenCalledTimes(1);
  });
});
