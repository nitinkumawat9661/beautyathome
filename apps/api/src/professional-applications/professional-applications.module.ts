import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ProfessionalApplicationsService } from './professional-applications.service';
import { PublicProfessionalApplicationsController } from './public-professional-applications.controller';

@Module({
  imports: [AuthModule],
  controllers: [PublicProfessionalApplicationsController],
  providers: [ProfessionalApplicationsService],
})
export class ProfessionalApplicationsModule {}
