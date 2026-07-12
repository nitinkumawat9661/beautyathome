import {
  VerificationApplicationStatus,
  VerificationStatus,
} from '@beautyathome/database';
import { ProfessionalVerificationSubmissionSchema } from '@beautyathome/marketplace';
import type { ConfigService } from '@nestjs/config';

import type { AuditService } from '../audit/audit.service';
import type { CursorService } from '../common/pagination/cursor.service';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import type { Environment } from '../config/environment';
import type { PrismaService } from '../database/prisma/prisma.service';
import type { ProfessionalsService } from './professionals.service';
import { VerificationService } from './verification.service';

const actor: AuthenticatedActor = {
  userId: '73ab3a93-b4f2-48fc-99e4-b620d6499d13',
  sessionId: 'session-id',
  activeRole: 'PROFESSIONAL',
  roles: ['PROFESSIONAL'],
  status: 'ACTIVE',
};

describe('VerificationService submission transitions', () => {
  it('does not allow a rejected application to bypass correction approval', async () => {
    const transaction = {
      professionalProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: '1ae88636-e77e-4f7b-8c75-46299adc9947',
          version: 4,
          displayName: 'Asha Sharma',
          biography: 'Experienced beauty Professional.',
          experienceYears: 5,
          cityId: '5a4cb4d4-6226-4cb0-9bcb-f0054e5b4cf8',
          languages: ['hi', 'en'],
          serviceAreas: [
            { serviceAreaId: 'aae8c585-984a-4053-94b2-50a3290b1518' },
          ],
          verificationStatus: VerificationStatus.REJECTED,
        }),
      },
      professionalCertificate: { findMany: jest.fn().mockResolvedValue([]) },
      verificationApplication: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'c613169a-5a15-4178-8390-b3d9d45c6f3a',
          professionalId: '1ae88636-e77e-4f7b-8c75-46299adc9947',
          version: 1,
          status: VerificationApplicationStatus.REJECTED,
        }),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (operation: (writer: typeof transaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    };
    const config = {
      get: jest.fn().mockReturnValue('female-professional-v1'),
    };
    const service = new VerificationService(
      prisma as unknown as PrismaService,
      {} as ProfessionalsService,
      config as unknown as ConfigService<Environment, true>,
      {} as CursorService,
      {} as AuditService,
    );
    const input = ProfessionalVerificationSubmissionSchema.parse({
      eligibilityPolicyVersionAcknowledged: 'female-professional-v1',
      eligibilityDeclarationAccepted: true,
      certificateIds: [],
      expectedProfileVersion: 4,
    });

    await expect(
      service.submit(actor, input, 'request-id'),
    ).rejects.toMatchObject({ code: 'VERIFICATION_INVALID_TRANSITION' });
    expect(transaction.verificationApplication.create).not.toHaveBeenCalled();
  });
});
