import type { UserRole } from '@beautyathome/auth';
import {
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { AppException } from '../../common/errors/app.exception';
import type { RequestWithContext } from '../../common/types/authenticated-request';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const actor = context.switchToHttp().getRequest<RequestWithContext>().actor;
    if (
      !actor ||
      !actor.roles.includes(actor.activeRole) ||
      !required.some((role) => role === actor.activeRole)
    ) {
      throw new AppException(
        'AUTH_ROLE_FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'You are not authorized to perform this operation.',
      );
    }
    return true;
  }
}
