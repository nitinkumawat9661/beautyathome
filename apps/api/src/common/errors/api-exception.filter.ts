import type {
  ApiErrorCode,
  ApiErrorDetail,
  ApiErrorResponse,
} from '@beautyathome/auth';
import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

import type { RequestWithContext } from '../types/authenticated-request';
import { AppException } from './app.exception';

const statusCodeMap: Partial<Record<number, ApiErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'REQUEST_VALIDATION_FAILED',
  [HttpStatus.UNAUTHORIZED]: 'AUTHENTICATION_REQUIRED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'RESOURCE_NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithContext>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const code =
      exception instanceof AppException
        ? exception.code
        : (statusCodeMap[status] ?? 'INTERNAL_ERROR');
    const details: ApiErrorDetail[] | undefined =
      exception instanceof AppException ? exception.details : undefined;
    const message = this.safeMessage(exception, status);
    const body: ApiErrorResponse = {
      error: {
        code,
        message,
        requestId: request.requestId ?? 'unavailable',
        ...(details ? { details } : {}),
      },
    };

    if (/^\/api\/v1\/(auth|me|professional|admin)(\/|$)/.test(request.path)) {
      response.setHeader('cache-control', 'no-store');
    }
    if (status >= 500) {
      this.logger.error(
        JSON.stringify({
          event: 'unhandled_api_exception',
          requestId: body.error.requestId,
          method: request.method,
          path: request.path,
          exceptionType:
            exception instanceof Error
              ? exception.constructor.name
              : typeof exception,
        }),
      );
    }

    response.status(status).json(body);
  }

  private safeMessage(exception: unknown, status: number): string {
    if (exception instanceof AppException) {
      return exception.message;
    }
    if (exception instanceof HttpException && status < 500) {
      const response = exception.getResponse();
      if (typeof response === 'string') return response;
      if (typeof response === 'object' && response && 'message' in response) {
        const message = response.message;
        if (typeof message === 'string') return message;
      }
    }
    return status >= 500
      ? 'An unexpected error occurred.'
      : 'The request could not be completed.';
  }
}
