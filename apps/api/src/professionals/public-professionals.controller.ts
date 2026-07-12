import {
  ProfessionalDiscoveryQuerySchema,
  type ProfessionalDiscoveryQuery,
} from '@beautyathome/marketplace';
import { Controller, Get, Param, Query } from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ProfessionalIdSchema } from './professionals.validation';
import { ProfessionalsService } from './professionals.service';

@Public()
@Controller('professionals')
export class PublicProfessionalsController {
  constructor(private readonly professionals: ProfessionalsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(ProfessionalDiscoveryQuerySchema))
    query: ProfessionalDiscoveryQuery,
  ) {
    return this.professionals.listPublic(query);
  }

  @Get(':professionalId')
  get(
    @Param('professionalId', new ZodValidationPipe(ProfessionalIdSchema))
    professionalId: string,
  ) {
    return this.professionals.getPublic(professionalId);
  }
}
