import {
  AdminProfessionalApplicationDecisionSchema,
  AdminProfessionalApplicationListQuerySchema,
  ProfessionalApplicationIdSchema,
  ProfessionalApplicationStartReviewSchema,
  type AdminProfessionalApplicationDecision,
  type AdminProfessionalApplicationListQuery,
  type ProfessionalApplicationStartReview,
} from '@beautyathome/marketplace';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CurrentActor } from '../common/decorators/current-actor.decorator';
import { CurrentRequestId } from '../common/decorators/current-request-id.decorator';
import { RequireRecentStepUp } from '../common/decorators/require-recent-step-up.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { ProfessionalApplicationsService } from './professional-applications.service';

@Roles('ADMIN')
@Controller('admin/professional-applications')
export class AdminProfessionalApplicationsController {
  constructor(private readonly applications: ProfessionalApplicationsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(AdminProfessionalApplicationListQuerySchema))
    query: AdminProfessionalApplicationListQuery,
  ) {
    return this.applications.listAdmin(query);
  }

  @Get(':applicationId')
  get(
    @Param(
      'applicationId',
      new ZodValidationPipe(ProfessionalApplicationIdSchema),
    )
    applicationId: string,
  ) {
    return this.applications.getAdmin(applicationId);
  }

  @Post(':applicationId/start-review')
  startReview(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param(
      'applicationId',
      new ZodValidationPipe(ProfessionalApplicationIdSchema),
    )
    applicationId: string,
    @Body(new ZodValidationPipe(ProfessionalApplicationStartReviewSchema))
    input: ProfessionalApplicationStartReview,
  ) {
    return this.applications.startReview(
      actor,
      applicationId,
      input,
      requestId,
    );
  }

  @RequireRecentStepUp()
  @Post(':applicationId/decision')
  decide(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param(
      'applicationId',
      new ZodValidationPipe(ProfessionalApplicationIdSchema),
    )
    applicationId: string,
    @Body(new ZodValidationPipe(AdminProfessionalApplicationDecisionSchema))
    input: AdminProfessionalApplicationDecision,
  ) {
    return this.applications.decide(actor, applicationId, input, requestId);
  }
}
