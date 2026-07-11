import {
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { REQUIRE_RECENT_STEP_UP_KEY } from '../../common/decorators/require-recent-step-up.decorator';
import { AppException } from '../../common/errors/app.exception';
import type { RequestWithContext } from '../../common/types/authenticated-request';
import type { Environment } from '../../config/environment';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class RecentStepUpGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_RECENT_STEP_UP_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const actor = context.switchToHttp().getRequest<RequestWithContext>().actor;
    if (!actor) this.throwStepUpRequired();

    const now = new Date();
    const session = await this.prisma.authSession.findFirst({
      where: {
        familyId: actor.sessionId,
        userId: actor.userId,
        activeRole: actor.activeRole,
        rotatedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      select: { lastStepUpAt: true },
    });
    const ttlMilliseconds =
      this.config.get('STEP_UP_TTL_SECONDS', { infer: true }) * 1_000;

    if (
      !session?.lastStepUpAt ||
      session.lastStepUpAt.getTime() < now.getTime() - ttlMilliseconds
    ) {
      this.throwStepUpRequired();
    }

    return true;
  }

  private throwStepUpRequired(): never {
    throw new AppException(
      'AUTH_STEP_UP_REQUIRED',
      HttpStatus.UNAUTHORIZED,
      'Recent mobile verification is required for this operation.',
    );
  }
}
