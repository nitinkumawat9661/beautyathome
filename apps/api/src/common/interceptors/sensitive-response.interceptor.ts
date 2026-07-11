import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';

import type { RequestWithContext } from '../types/authenticated-request';

@Injectable()
export class SensitiveResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<Response>();
    if (/^\/api\/v1\/(auth|me|professional|admin)(\/|$)/.test(request.path)) {
      response.setHeader('cache-control', 'no-store');
    }
    return next.handle();
  }
}
