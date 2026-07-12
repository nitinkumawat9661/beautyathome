import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module';
import { AdminProfessionalServicesController } from './admin-professional-services.controller';
import { AdminServiceRequestsController } from './admin-service-requests.controller';
import { ProfessionalServicesController } from './professional-services.controller';
import { ProfessionalServicesService } from './professional-services.service';
import { PublicProfessionalServicesController } from './public-professional-services.controller';
import { ServiceRequestsService } from './service-requests.service';

@Module({
  imports: [CatalogModule],
  controllers: [
    ProfessionalServicesController,
    PublicProfessionalServicesController,
    AdminProfessionalServicesController,
    AdminServiceRequestsController,
  ],
  providers: [ProfessionalServicesService, ServiceRequestsService],
  exports: [ProfessionalServicesService],
})
export class ProfessionalServicesModule {}
