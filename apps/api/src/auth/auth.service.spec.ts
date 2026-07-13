import type { OtpRequest, OtpVerifyRequest } from '@beautyathome/auth';
import { HttpStatus } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { AppException } from '../common/errors/app.exception';
import type { Environment } from '../config/environment';
import type { PrismaService } from '../database/prisma/prisma.service';
import type { AccessTokenService } from './access-token.service';
import type { AuthCryptoService } from './auth-crypto.service';
import { AuthService } from './auth.service';
import type { RequestContext } from './auth.types';
import type { OtpDeliveryService } from './otp-delivery.service';

const context: RequestContext = {};

const blockedRoles = ['PROFESSIONAL', 'ADMIN', 'SUPPORT', 'FINANCE'] as const;

function createService() {
  const customerFlowReached = new Error(
    'customer signup reached auth workflow',
  );

  const crypto = {
    mobileLookup: jest.fn(() => {
      throw customerFlowReached;
    }),
  } as unknown as AuthCryptoService;

  return {
    customerFlowReached,
    service: new AuthService(
      {} as PrismaService,
      {} as ConfigService<Environment, true>,
      crypto,
      {} as OtpDeliveryService,
      {} as AccessTokenService,
    ),
  };
}

async function expectRoleForbidden(action: Promise<unknown>): Promise<void> {
  try {
    await action;
    throw new Error('Expected role signup to be forbidden');
  } catch (error) {
    expect(error).toBeInstanceOf(AppException);

    const exception = error as AppException;

    expect(exception.code).toBe('AUTH_ROLE_FORBIDDEN');
    expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
  }
}

describe('AuthService signup role boundary', () => {
  test.each(blockedRoles)(
    'rejects %s signup during OTP request',
    async (role) => {
      const { service } = createService();

      const input = {
        mobileNumber: '+919876543210',
        role,
        purpose: 'SIGN_UP',
      } as unknown as OtpRequest;

      await expectRoleForbidden(service.requestOtp(input, context));
    },
  );

  test.each(blockedRoles)(
    'rejects %s signup during OTP verification',
    async (role) => {
      const { service } = createService();

      const input = {
        mobileNumber: '+919876543210',
        role,
        purpose: 'SIGN_UP',
        challengeId: '00000000-0000-4000-8000-000000000000',
        otp: '123456',
      } as unknown as OtpVerifyRequest;

      await expectRoleForbidden(service.verifyOtp(input, context));
    },
  );

  it('allows customer signup to continue into OTP processing', async () => {
    const { service, customerFlowReached } = createService();

    const input = {
      mobileNumber: '+919876543210',
      role: 'CUSTOMER',
      purpose: 'SIGN_UP',
    } as OtpRequest;

    await expect(service.requestOtp(input, context)).rejects.toBe(
      customerFlowReached,
    );
  });
});
