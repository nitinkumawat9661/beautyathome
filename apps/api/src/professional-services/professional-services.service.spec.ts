import {
  LaunchEligibilityStatus,
  PricePolicyStatus,
  ProfessionalServiceState,
  UserStatus,
  VerificationStatus,
} from '@beautyathome/database';
import { ProfessionalServiceUpsertSchema } from '@beautyathome/marketplace';

import type { AuditService } from '../audit/audit.service';
import type { CursorService } from '../common/pagination/cursor.service';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import type { PrismaService } from '../database/prisma/prisma.service';
import { ProfessionalServicesService } from './professional-services.service';

const actor: AuthenticatedActor = {
  userId: '73ab3a93-b4f2-48fc-99e4-b620d6499d13',
  sessionId: 'session-id',
  activeRole: 'PROFESSIONAL',
  roles: ['PROFESSIONAL'],
  status: 'ACTIVE',
};

describe('ProfessionalServicesService optimistic updates', () => {
  it('requires the current version when an offering already exists', async () => {
    const policy = {
      id: '9f047d00-ac37-48c5-a5b8-9099584d5906',
      minimumPricePaise: 50_000,
      maximumPricePaise: 100_000,
      status: PricePolicyStatus.ACTIVE,
    };
    const transaction = {
      professionalProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: '1ae88636-e77e-4f7b-8c75-46299adc9947',
          user: { status: UserStatus.ACTIVE },
          verificationStatus: VerificationStatus.APPROVED,
          launchEligibilityStatus: LaunchEligibilityStatus.ELIGIBLE,
          isServiceActive: true,
        }),
      },
      service: {
        findFirst: jest.fn().mockResolvedValue({ pricePolicies: [policy] }),
      },
      portfolioAsset: { findMany: jest.fn().mockResolvedValue([]) },
      professionalService: {
        findUnique: jest.fn().mockResolvedValue({
          id: '427d02ac-d972-48ea-8542-251db15624f5',
          version: 3,
          state: ProfessionalServiceState.ENABLED,
        }),
        upsert: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (operation: (writer: typeof transaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    };
    const service = new ProfessionalServicesService(
      prisma as unknown as PrismaService,
      {} as CursorService,
      {} as AuditService,
    );
    const input = ProfessionalServiceUpsertSchema.parse({
      cityId: '5a4cb4d4-6226-4cb0-9bcb-f0054e5b4cf8',
      pricePaise: 75_000,
      estimatedDurationMinutes: 60,
      isEnabled: true,
      portfolioImages: [],
    });

    await expect(
      service.upsert(actor, '77ad677a-a208-46b5-a836-7ed473557567', input),
    ).rejects.toMatchObject({ code: 'OPTIMISTIC_LOCK_CONFLICT' });
    expect(transaction.professionalService.upsert).not.toHaveBeenCalled();
  });
});
