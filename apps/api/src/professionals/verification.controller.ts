import {
  ProfessionalVerificationSubmissionSchema,
  type ProfessionalVerificationSubmission,
} from '@beautyathome/marketplace';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CurrentActor } from '../common/decorators/current-actor.decorator';
import { CurrentRequestId } from '../common/decorators/current-request-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { VerificationApplicationIdSchema } from './professionals.validation';
import { VerificationService } from './verification.service';

@Roles('PROFESSIONAL')
@Controller('professional/verification-applications')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get('current')
  current(@CurrentActor() actor: AuthenticatedActor) {
    return this.verification.current(actor);
  }

  @Post()
  submit(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Body(new ZodValidationPipe(ProfessionalVerificationSubmissionSchema))
    input: ProfessionalVerificationSubmission,
  ) {
    return this.verification.submit(actor, input, requestId);
  }

  @Post(':applicationId/resubmit')
  resubmit(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param(
      'applicationId',
      new ZodValidationPipe(VerificationApplicationIdSchema),
    )
    applicationId: string,
  ) {
    return this.verification.resubmit(actor, applicationId, requestId);
  }
}
