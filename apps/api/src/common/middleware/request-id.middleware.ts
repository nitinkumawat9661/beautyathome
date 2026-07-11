import { randomUUID } from 'node:crypto';

import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';

import type { RequestWithContext } from '../types/authenticated-request';

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    request: RequestWithContext,
    response: Response,
    next: NextFunction,
  ): void {
    const incoming = request.header('x-request-id');
    request.requestId =
      incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    response.setHeader('x-request-id', request.requestId);
    next();
  }
}
