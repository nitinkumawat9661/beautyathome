import { Module } from '@nestjs/common';

import { AdminCatalogController } from './admin-catalog.controller';
import { CatalogService } from './catalog.service';
import { PublicCatalogController } from './public-catalog.controller';

@Module({
  controllers: [PublicCatalogController, AdminCatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
