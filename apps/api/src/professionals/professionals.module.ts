import { Module } from '@nestjs/common';

import { AdminVerificationController } from './admin-verification.controller';
import { ProfessionalAssetsController } from './professional-assets.controller';
import { ProfessionalsService } from './professionals.service';
import { PublicProfessionalsController } from './public-professionals.controller';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  controllers: [
    PublicProfessionalsController,
    ProfessionalAssetsController,
    VerificationController,
    AdminVerificationController,
  ],
  providers: [ProfessionalsService, VerificationService],
  exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
