import {
  ProfessionalApplicationInputSchema,
  type ProfessionalApplicationInput,
} from '@beautyathome/marketplace';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ProfessionalApplicationsService } from './professional-applications.service';

@Public()
@Controller('professional-applications')
export class PublicProfessionalApplicationsController {
  constructor(private readonly applications: ProfessionalApplicationsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(
    @Body(new ZodValidationPipe(ProfessionalApplicationInputSchema))
    input: ProfessionalApplicationInput,
  ) {
    return this.applications.submit(input);
  }
}
