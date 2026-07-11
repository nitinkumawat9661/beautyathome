import type { ApiErrorDetail } from '@beautyathome/auth';
import { HttpStatus, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

import { AppException } from '../errors/app.exception';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    const details: ApiErrorDetail[] = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'request',
      reason: issue.message,
    }));
    throw new AppException(
      'REQUEST_VALIDATION_FAILED',
      HttpStatus.BAD_REQUEST,
      'The request contains invalid fields.',
      details,
    );
  }
}
