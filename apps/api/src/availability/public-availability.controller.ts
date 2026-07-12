import {
  AvailabilityRangeQuerySchema,
  ProfessionalIdSchema,
  type AvailabilityRangeQuery,
} from '@beautyathome/marketplace';
import { Controller, Get, Param, Query } from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AvailabilityService } from './availability.service';

@Public()
@Controller('professionals')
export class PublicAvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get(':professionalId/availability')
  list(
    @Param('professionalId', new ZodValidationPipe(ProfessionalIdSchema))
    professionalId: string,
    @Query(new ZodValidationPipe(AvailabilityRangeQuerySchema))
    query: AvailabilityRangeQuery,
  ) {
    return this.availability.listPublic(professionalId, query);
  }
}
