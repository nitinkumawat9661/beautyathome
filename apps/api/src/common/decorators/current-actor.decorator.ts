import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type {
  AuthenticatedActor,
  RequestWithContext,
} from '../types/authenticated-request';

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedActor | undefined =>
    context.switchToHttp().getRequest<RequestWithContext>().actor,
);
