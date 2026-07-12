import { PricePolicyStatus } from '@beautyathome/database';

import type { AuditService } from '../audit/audit.service';
import type { CursorService } from '../common/pagination/cursor.service';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import type { PrismaService } from '../database/prisma/prisma.service';
import { CatalogService } from './catalog.service';

const actor: AuthenticatedActor = {
  userId: 'a73da770-d185-4ba3-ab09-80e8ed7e99a5',
  sessionId: 'session-id',
  activeRole: 'ADMIN',
  roles: ['ADMIN'],
  status: 'ACTIVE',
};

describe('CatalogService price-policy activation', () => {
  it('rejects activation before the policy effective time without mutating data', async () => {
    const transaction = {
      service: {
        findUnique: jest.fn().mockResolvedValue({
          id: '77ad677a-a208-46b5-a836-7ed473557567',
          version: 2,
        }),
      },
      serviceCityPricePolicy: {
        findFirst: jest.fn().mockResolvedValue({
          id: '0db28251-9b88-4ac1-a74c-45024ecab9ae',
          serviceId: '77ad677a-a208-46b5-a836-7ed473557567',
          cityId: '5a4cb4d4-6226-4cb0-9bcb-f0054e5b4cf8',
          version: 2,
          status: PricePolicyStatus.INACTIVE,
          minimumPricePaise: 50_000,
          maximumPricePaise: 100_000,
          effectiveFrom: new Date(Date.now() + 60_000),
          effectiveTo: null,
          createdByUserId: 'be3375a2-0fc4-405f-9fd8-e9438138a842',
          city: {},
        }),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      professionalService: { updateMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(
        async (operation: (writer: typeof transaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    };
    const service = new CatalogService(
      prisma as unknown as PrismaService,
      {} as CursorService,
      {} as AuditService,
    );

    await expect(
      service.activatePricePolicy(
        actor,
        '77ad677a-a208-46b5-a836-7ed473557567',
        '0db28251-9b88-4ac1-a74c-45024ecab9ae',
        {
          reasonCode: 'PRICE_REVIEWED',
          reason: 'Reviewed for the Sikar launch.',
          expectedServiceVersion: 2,
        },
        'request-id',
      ),
    ).rejects.toMatchObject({ code: 'CATALOG_PRICE_POLICY_NOT_EFFECTIVE' });
    expect(transaction.serviceCityPricePolicy.update).not.toHaveBeenCalled();
  });
});
