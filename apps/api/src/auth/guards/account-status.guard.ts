import type { UserStatus } from '@beautyathome/auth';
import {
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ACCOUNT_STATUSES_KEY } from '../../common/decorators/account-statuses.decorator';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { AppException } from '../../common/errors/app.exception';
import type { RequestWithContext } from '../../common/types/authenticated-request';

@Injectable()
export class AccountStatusGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowed = this.reflector.getAllAndOverride<UserStatus[]>(
      ACCOUNT_STATUSES_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? ['ACTIVE'];
    const actor = context.switchToHttp().getRequest<RequestWithContext>().actor;
    if (!actor || !allowed.includes(actor.status)) {
      throw new AppException(
        'AUTH_ACCOUNT_UNAVAILABLE',
        HttpStatus.FORBIDDEN,
        'This operation is unavailable for the account.',
      );
    }
    return true;
  }
}
