import {
  AdminServiceRequestDecisionSchema,
  ServiceRequestListQuerySchema,
  ServiceRequestStartReviewSchema,
  type AdminServiceRequestDecision,
  type ServiceRequestListQuery,
  type ServiceRequestStartReview,
} from '@beautyathome/marketplace';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CurrentActor } from '../common/decorators/current-actor.decorator';
import { CurrentRequestId } from '../common/decorators/current-request-id.decorator';
import { RequireRecentStepUp } from '../common/decorators/require-recent-step-up.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { ServiceRequestIdSchema } from './professional-services.validation';
import { ServiceRequestsService } from './service-requests.service';

@Roles('ADMIN')
@Controller('admin/service-requests')
export class AdminServiceRequestsController {
  constructor(private readonly requests: ServiceRequestsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(ServiceRequestListQuerySchema))
    query: ServiceRequestListQuery,
  ) {
    return this.requests.listAdmin(query);
  }

  @Post(':requestId/start-review')
  startReview(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() correlationId: string,
    @Param('requestId', new ZodValidationPipe(ServiceRequestIdSchema))
    requestId: string,
    @Body(new ZodValidationPipe(ServiceRequestStartReviewSchema))
    input: ServiceRequestStartReview,
  ) {
    return this.requests.startReview(
      actor,
      requestId,
      input.expectedVersion,
      correlationId,
    );
  }

  @RequireRecentStepUp()
  @Post(':requestId/decision')
  decide(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() correlationId: string,
    @Param('requestId', new ZodValidationPipe(ServiceRequestIdSchema))
    requestId: string,
    @Body(new ZodValidationPipe(AdminServiceRequestDecisionSchema))
    input: AdminServiceRequestDecision,
  ) {
    return this.requests.decide(actor, requestId, input, correlationId);
  }
}
