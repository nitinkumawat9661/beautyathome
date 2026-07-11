import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Reflector } from '@nestjs/core';

import { REQUIRE_RECENT_STEP_UP_KEY } from '../../common/decorators/require-recent-step-up.decorator';
import { AppException } from '../../common/errors/app.exception';
import type { AuthenticatedActor } from '../../common/types/authenticated-request';
import type { Environment } from '../../config/environment';
import type { PrismaService } from '../../database/prisma/prisma.service';
import { RecentStepUpGuard } from './recent-step-up.guard';

jest.mock('../../database/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const actor: AuthenticatedActor = {
  userId: 'user-id',
  sessionId: 'session-id',
  activeRole: 'ADMIN',
  roles: ['ADMIN'],
  status: 'ACTIVE',
};

function context(): ExecutionContext {
  return {
    getClass: () => class TestController {},
    getHandler: () => (): void => undefined,
    switchToHttp: () =>
      ({
        getRequest: () => ({ actor }),
      }) as ReturnType<ExecutionContext['switchToHttp']>,
  } as unknown as ExecutionContext;
}

function reflector(required: boolean): Reflector {
  return {
    getAllAndOverride: jest.fn((key: string) =>
      key === REQUIRE_RECENT_STEP_UP_KEY ? required : undefined,
    ),
  } as unknown as Reflector;
}

function guard(lastStepUpAt: Date | null): RecentStepUpGuard {
  const prisma = {
    authSession: {
      findFirst: jest.fn().mockResolvedValue({ lastStepUpAt }),
    },
  } as unknown as PrismaService;
  const config = {
    get: jest.fn().mockReturnValue(600),
  } as unknown as ConfigService<Environment, true>;

  return new RecentStepUpGuard(reflector(true), prisma, config);
}

describe('RecentStepUpGuard', () => {
  it('allows operations after recent OTP verification', async () => {
    await expect(guard(new Date()).canActivate(context())).resolves.toBe(true);
  });

  it('rejects missing or expired step-up state', async () => {
    await expect(guard(null).canActivate(context())).rejects.toBeInstanceOf(
      AppException,
    );
    await expect(
      guard(new Date(Date.now() - 601_000)).canActivate(context()),
    ).rejects.toMatchObject({ code: 'AUTH_STEP_UP_REQUIRED' });
  });

  it('does not query session state for ordinary endpoints', async () => {
    const findFirst = jest.fn();
    const prisma = {
      authSession: { findFirst },
    } as unknown as PrismaService;
    const config = {
      get: jest.fn().mockReturnValue(600),
    } as unknown as ConfigService<Environment, true>;
    const subject = new RecentStepUpGuard(reflector(false), prisma, config);

    await expect(subject.canActivate(context())).resolves.toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
