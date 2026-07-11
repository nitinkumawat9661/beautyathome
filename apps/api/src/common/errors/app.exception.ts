import type { ApiErrorCode, ApiErrorDetail } from '@beautyathome/auth';
import { HttpException, type HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    public readonly code: ApiErrorCode,
    status: HttpStatus,
    message: string,
    public readonly details?: ApiErrorDetail[],
  ) {
    super(message, status);
  }
}
