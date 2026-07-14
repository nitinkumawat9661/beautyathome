import { ProfessionalApplicationInputSchema } from '@beautyathome/marketplace';
import type { ConfigService } from '@nestjs/config';

import type { AuthCryptoService } from '../auth/auth-crypto.service';
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
});
