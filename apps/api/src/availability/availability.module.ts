import { Module } from '@nestjs/common';

import { AvailabilityService } from './availability.service';
import { ProfessionalAvailabilityController } from './professional-availability.controller';
import { PublicAvailabilityController } from './public-availability.controller';

@Module({
  controllers: [
    ProfessionalAvailabilityController,
    PublicAvailabilityController,
  ],
  providers: [AvailabilityService],
})
export class AvailabilityModule {}
