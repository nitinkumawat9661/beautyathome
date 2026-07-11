import {
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppException } from '../../common/errors/app.exception';
import type { RequestWithContext } from '../../common/types/authenticated-request';
import { parseCorsOrigins, type Environment } from '../../config/environment';

@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowedOrigins: Set<string>;

  constructor(config: ConfigService<Environment, true>) {
    this.allowedOrigins = new Set(
      parseCorsOrigins(config.get('CORS_ORIGINS', { infer: true })),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const origin =
      request.header('origin') ??
      this.originFromReferer(request.header('referer'));
    if (!origin || !this.allowedOrigins.has(origin)) {
      throw new AppException(
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
        'The request origin is not allowed.',
      );
    }
    return true;
  }

  private originFromReferer(referer: string | undefined): string | undefined {
    if (!referer) return undefined;
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }
}
