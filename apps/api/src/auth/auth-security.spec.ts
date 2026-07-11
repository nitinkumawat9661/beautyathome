import type { UserStatus } from '@beautyathome/auth';
import type { ExecutionContext } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Reflector } from '@nestjs/core';
import { z } from 'zod';

import { ACCOUNT_STATUSES_KEY } from '../common/decorators/account-statuses.decorator';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { AppException } from '../common/errors/app.exception';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import type { Environment } from '../config/environment';
import { AccountStatusGuard } from './guards/account-status.guard';
import { OriginGuard } from './guards/origin.guard';
import { RolesGuard } from './guards/roles.guard';

function executionContext(actor?: AuthenticatedActor): ExecutionContext {
  return {
    getClass: () => class TestController {},
    getHandler: () => (): void => undefined,
    switchToHttp: () =>
      ({
        getRequest: () => ({ actor }),
      }) as ReturnType<ExecutionContext['switchToHttp']>,
  } as unknown as ExecutionContext;
}

function reflectorFor(
  metadata: Partial<{
    public: boolean;
    roles: AuthenticatedActor['roles'];
    statuses: UserStatus[];
  }>,
): Reflector {
  return {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === IS_PUBLIC_KEY) return metadata.public;
      if (key === ROLES_KEY) return metadata.roles;
      if (key === ACCOUNT_STATUSES_KEY) return metadata.statuses;
      return undefined;
    }),
  } as unknown as Reflector;
}

const activeCustomer: AuthenticatedActor = {
  userId: 'user-id',
  sessionId: 'session-id',
  activeRole: 'CUSTOMER',
  roles: ['CUSTOMER'],
  status: 'ACTIVE',
};

describe('RolesGuard', () => {
  it('allows the required active role', () => {
    const guard = new RolesGuard(reflectorFor({ roles: ['CUSTOMER'] }));

    expect(guard.canActivate(executionContext(activeCustomer))).toBe(true);
  });

  it('does not authorize a non-active role merely because it is granted', () => {
    const guard = new RolesGuard(reflectorFor({ roles: ['PROFESSIONAL'] }));
    const actor: AuthenticatedActor = {
      ...activeCustomer,
      roles: ['CUSTOMER', 'PROFESSIONAL'],
    };

    expect(() => guard.canActivate(executionContext(actor))).toThrow(
      AppException,
    );
  });

  it('denies a protected endpoint when no actor is present', () => {
    const guard = new RolesGuard(reflectorFor({ roles: ['CUSTOMER'] }));

    expect(() => guard.canActivate(executionContext())).toThrow(AppException);
  });

  it('skips authorization on a public endpoint', () => {
    const guard = new RolesGuard(
      reflectorFor({ public: true, roles: ['ADMIN'] }),
    );

    expect(guard.canActivate(executionContext())).toBe(true);
  });
});

describe('AccountStatusGuard', () => {
  it('allows ACTIVE by default', () => {
    const guard = new AccountStatusGuard(reflectorFor({}));

    expect(guard.canActivate(executionContext(activeCustomer))).toBe(true);
  });

  it('requires an explicit allowance for SUSPENDED accounts', () => {
    const actor: AuthenticatedActor = {
      ...activeCustomer,
      status: 'SUSPENDED',
    };
    const defaultGuard = new AccountStatusGuard(reflectorFor({}));
    const allowedGuard = new AccountStatusGuard(
      reflectorFor({ statuses: ['ACTIVE', 'SUSPENDED'] }),
    );

    expect(() => defaultGuard.canActivate(executionContext(actor))).toThrow(
      AppException,
    );
    expect(allowedGuard.canActivate(executionContext(actor))).toBe(true);
  });
});

describe('OriginGuard', () => {
  function createGuard(): OriginGuard {
    return new OriginGuard({
      get: jest.fn(() => 'https://app.example.com,https://admin.example.com'),
    } as unknown as ConfigService<Environment, true>);
  }

  function originContext(headers: Record<string, string>): ExecutionContext {
    return {
      switchToHttp: () =>
        ({
          getRequest: () => ({
            header: (name: string) => headers[name.toLowerCase()],
          }),
        }) as ReturnType<ExecutionContext['switchToHttp']>,
    } as unknown as ExecutionContext;
  }

  it('allows an exact configured Origin', () => {
    expect(
      createGuard().canActivate(
        originContext({ origin: 'https://app.example.com' }),
      ),
    ).toBe(true);
  });

  it('uses the origin portion of an allowed Referer', () => {
    expect(
      createGuard().canActivate(
        originContext({ referer: 'https://admin.example.com/settings' }),
      ),
    ).toBe(true);
  });

  it('rejects lookalike and missing origins', () => {
    expect(() =>
      createGuard().canActivate(
        originContext({ origin: 'https://app.example.com.attacker.test' }),
      ),
    ).toThrow(AppException);
    expect(() => createGuard().canActivate(originContext({}))).toThrow(
      AppException,
    );
  });
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(
    z
      .object({
        displayName: z.string().trim().min(1).max(100),
      })
      .strict(),
  );

  it('returns validated and transformed input', () => {
    expect(pipe.transform({ displayName: '  Customer  ' })).toEqual({
      displayName: 'Customer',
    });
  });

  it('rejects unknown fields with the standard validation exception', () => {
    try {
      pipe.transform({ displayName: 'Customer', role: 'ADMIN' });
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const exception = error as AppException;
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.code).toBe('REQUEST_VALIDATION_FAILED');
      expect(exception.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'request' })]),
      );
    }
  });
});
