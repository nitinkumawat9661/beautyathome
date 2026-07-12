import {
  ProfessionalServiceStatusChangeSchema,
  type ProfessionalServiceStatusChange,
} from '@beautyathome/marketplace';
import { Body, Controller, Param, Post } from '@nestjs/common';

import { CurrentActor } from '../common/decorators/current-actor.decorator';
import { CurrentRequestId } from '../common/decorators/current-request-id.decorator';
import { RequireRecentStepUp } from '../common/decorators/require-recent-step-up.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { ProfessionalServiceIdSchema } from './professional-services.validation';
import { ProfessionalServicesService } from './professional-services.service';

@Roles('ADMIN')
@Controller('admin/professional-services')
export class AdminProfessionalServicesController {
  constructor(private readonly services: ProfessionalServicesService) {}

  @RequireRecentStepUp()
  @Post(':offeringId/status')
  changeStatus(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param('offeringId', new ZodValidationPipe(ProfessionalServiceIdSchema))
    offeringId: string,
    @Body(new ZodValidationPipe(ProfessionalServiceStatusChangeSchema))
    input: ProfessionalServiceStatusChange,
  ) {
    return this.services.changeStatus(actor, offeringId, input, requestId);
  }
}
