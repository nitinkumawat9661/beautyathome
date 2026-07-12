import {
  PublicServiceListQuerySchema,
  type PublicServiceListQuery,
} from '@beautyathome/marketplace';
import { Controller, Get, Param, Query } from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CatalogService } from './catalog.service';
import {
  CategoryListQuerySchema,
  CityListQuerySchema,
  MasterServiceIdSchema,
  ServiceAreaListQuerySchema,
  ServiceDetailQuerySchema,
} from './catalog.validation';
import type { z } from 'zod';

type CityListQuery = z.infer<typeof CityListQuerySchema>;
type ServiceAreaListQuery = z.infer<typeof ServiceAreaListQuerySchema>;
type CategoryListQuery = z.infer<typeof CategoryListQuerySchema>;
type ServiceDetailQuery = z.infer<typeof ServiceDetailQuerySchema>;

@Public()
@Controller()
export class PublicCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('cities')
  listCities(
    @Query(new ZodValidationPipe(CityListQuerySchema)) query: CityListQuery,
  ) {
    return this.catalog.listCities(query);
  }

  @Get('service-areas')
  listAreas(
    @Query(new ZodValidationPipe(ServiceAreaListQuerySchema))
    query: ServiceAreaListQuery,
  ) {
    return this.catalog.listServiceAreas(query);
  }

  @Get('service-categories')
  listCategories(
    @Query(new ZodValidationPipe(CategoryListQuerySchema))
    query: CategoryListQuery,
  ) {
    return this.catalog.listCategories(query);
  }

  @Get('services')
  listServices(
    @Query(new ZodValidationPipe(PublicServiceListQuerySchema))
    query: PublicServiceListQuery,
  ) {
    return this.catalog.listServices(query);
  }

  @Get('services/:serviceId')
  getService(
    @Param('serviceId', new ZodValidationPipe(MasterServiceIdSchema))
    serviceId: string,
    @Query(new ZodValidationPipe(ServiceDetailQuerySchema))
    query: ServiceDetailQuery,
  ) {
    return this.catalog.getPublicService(serviceId, query.cityId);
  }
}
