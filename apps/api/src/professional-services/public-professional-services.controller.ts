import { type z } from 'zod';

import { Controller, Get, Param, Query } from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ProfessionalIdSchema } from '../professionals/professionals.validation';
import { PublicProfessionalServiceListQuerySchema } from './professional-services.validation';
import { ProfessionalServicesService } from './professional-services.service';

type PublicProfessionalServiceListQuery = z.infer<
  typeof PublicProfessionalServiceListQuerySchema
>;

@Public()
@Controller('professionals')
export class PublicProfessionalServicesController {
  constructor(private readonly services: ProfessionalServicesService) {}

  @Get(':professionalId/services')
  list(
    @Param('professionalId', new ZodValidationPipe(ProfessionalIdSchema))
    professionalId: string,
    @Query(new ZodValidationPipe(PublicProfessionalServiceListQuerySchema))
    query: PublicProfessionalServiceListQuery,
  ) {
    return this.services.listPublic(professionalId, query);
  }
}
