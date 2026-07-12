import {
  ProfessionalCertificatesUpdateSchema,
  ProfessionalPortfolioUpdateSchema,
  type ProfessionalCertificatesUpdate,
  type ProfessionalPortfolioUpdate,
} from '@beautyathome/marketplace';
import { Body, Controller, Put } from '@nestjs/common';

import { CurrentActor } from '../common/decorators/current-actor.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { ProfessionalsService } from './professionals.service';

@Roles('PROFESSIONAL')
@Controller('professional/profile')
export class ProfessionalAssetsController {
  constructor(private readonly professionals: ProfessionalsService) {}

  @Put('portfolio')
  replacePortfolio(
    @CurrentActor() actor: AuthenticatedActor,
    @Body(new ZodValidationPipe(ProfessionalPortfolioUpdateSchema))
    input: ProfessionalPortfolioUpdate,
  ) {
    return this.professionals.replacePortfolio(actor, input);
  }

  @Put('certificates')
  replaceCertificates(
    @CurrentActor() actor: AuthenticatedActor,
    @Body(new ZodValidationPipe(ProfessionalCertificatesUpdateSchema))
    input: ProfessionalCertificatesUpdate,
  ) {
    return this.professionals.replaceCertificates(actor, input);
  }
}
