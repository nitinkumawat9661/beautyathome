import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { RequestWithContext } from '../types/authenticated-request';

export const CurrentRequestId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    return request.requestId;
  },
);
