import {
  AdminServiceListQuerySchema,
  MasterServiceCreateSchema,
  MasterServiceStatusChangeSchema,
  MasterServiceUpdateSchema,
  ServiceCategoryCreateSchema,
  ServiceCategoryStatusChangeSchema,
  ServiceCategoryUpdateSchema,
  ServiceAreaCreateSchema,
  ServiceAreaStatusChangeSchema,
  ServiceAreaUpdateSchema,
  ServicePricePolicyCreateSchema,
  type AdminServiceListQuery,
  type MasterServiceCreate,
  type MasterServiceStatusChange,
  type MasterServiceUpdate,
  type ServiceCategoryCreate,
  type ServiceCategoryStatusChange,
  type ServiceCategoryUpdate,
  type ServiceAreaCreate,
  type ServiceAreaStatusChange,
  type ServiceAreaUpdate,
  type ServicePricePolicyCreate,
} from '@beautyathome/marketplace';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { z } from 'zod';

import { CurrentActor } from '../common/decorators/current-actor.decorator';
import { CurrentRequestId } from '../common/decorators/current-request-id.decorator';
import { RequireRecentStepUp } from '../common/decorators/require-recent-step-up.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { CatalogService } from './catalog.service';
import {
  AdminServiceAreaListQuerySchema,
  CategoryListQuerySchema,
  MasterServiceIdSchema,
  PricePolicyActivationSchema,
  ServiceAreaIdSchema,
  ServiceCategoryIdSchema,
} from './catalog.validation';

type AdminServiceAreaListQuery = z.infer<
  typeof AdminServiceAreaListQuerySchema
>;
type CategoryListQuery = z.infer<typeof CategoryListQuerySchema>;
type PricePolicyActivation = z.infer<typeof PricePolicyActivationSchema>;

@Roles('ADMIN')
@Controller('admin')
export class AdminCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('service-areas')
  listServiceAreas(
    @Query(new ZodValidationPipe(AdminServiceAreaListQuerySchema))
    query: AdminServiceAreaListQuery,
  ) {
    return this.catalog.listAdminServiceAreas(query);
  }

  @Post('service-areas')
  createServiceArea(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Body(new ZodValidationPipe(ServiceAreaCreateSchema))
    input: ServiceAreaCreate,
  ) {
    return this.catalog.createServiceArea(actor, input, requestId);
  }

  @Patch('service-areas/:serviceAreaId')
  updateServiceArea(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param('serviceAreaId', new ZodValidationPipe(ServiceAreaIdSchema))
    serviceAreaId: string,
    @Body(new ZodValidationPipe(ServiceAreaUpdateSchema))
    input: ServiceAreaUpdate,
  ) {
    return this.catalog.updateServiceArea(
      actor,
      serviceAreaId,
      input,
      requestId,
    );
  }

  @RequireRecentStepUp()
  @Post('service-areas/:serviceAreaId/status')
  changeServiceAreaStatus(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param('serviceAreaId', new ZodValidationPipe(ServiceAreaIdSchema))
    serviceAreaId: string,
    @Body(new ZodValidationPipe(ServiceAreaStatusChangeSchema))
    input: ServiceAreaStatusChange,
  ) {
    return this.catalog.changeServiceAreaStatus(
      actor,
      serviceAreaId,
      input,
      requestId,
    );
  }

  @Get('service-categories')
  listCategories(
    @Query(new ZodValidationPipe(CategoryListQuerySchema))
    query: CategoryListQuery,
  ) {
    return this.catalog.listCategories(query, true);
  }

  @Post('service-categories')
  createCategory(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Body(new ZodValidationPipe(ServiceCategoryCreateSchema))
    input: ServiceCategoryCreate,
  ) {
    return this.catalog.createCategory(actor, input, requestId);
  }

  @Patch('service-categories/:categoryId')
  updateCategory(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param('categoryId', new ZodValidationPipe(ServiceCategoryIdSchema))
    categoryId: string,
    @Body(new ZodValidationPipe(ServiceCategoryUpdateSchema))
    input: ServiceCategoryUpdate,
  ) {
    return this.catalog.updateCategory(actor, categoryId, input, requestId);
  }

  @RequireRecentStepUp()
  @Post('service-categories/:categoryId/status')
  changeCategoryStatus(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param('categoryId', new ZodValidationPipe(ServiceCategoryIdSchema))
    categoryId: string,
    @Body(new ZodValidationPipe(ServiceCategoryStatusChangeSchema))
    input: ServiceCategoryStatusChange,
  ) {
    return this.catalog.changeCategoryStatus(
      actor,
      categoryId,
      input,
      requestId,
    );
  }

  @Get('services')
  listServices(
    @Query(new ZodValidationPipe(AdminServiceListQuerySchema))
    query: AdminServiceListQuery,
  ) {
    return this.catalog.listServices(query, true);
  }

  @Post('services')
  createService(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Body(new ZodValidationPipe(MasterServiceCreateSchema))
    input: MasterServiceCreate,
  ) {
    return this.catalog.createService(actor, input, requestId);
  }

  @Patch('services/:serviceId')
  updateService(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param('serviceId', new ZodValidationPipe(MasterServiceIdSchema))
    serviceId: string,
    @Body(new ZodValidationPipe(MasterServiceUpdateSchema))
    input: MasterServiceUpdate,
  ) {
    return this.catalog.updateService(actor, serviceId, input, requestId);
  }

  @RequireRecentStepUp()
  @Post('services/:serviceId/status')
  changeServiceStatus(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param('serviceId', new ZodValidationPipe(MasterServiceIdSchema))
    serviceId: string,
    @Body(new ZodValidationPipe(MasterServiceStatusChangeSchema))
    input: MasterServiceStatusChange,
  ) {
    return this.catalog.changeServiceStatus(actor, serviceId, input, requestId);
  }

  @Post('services/:serviceId/price-policies')
  createPricePolicy(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param('serviceId', new ZodValidationPipe(MasterServiceIdSchema))
    serviceId: string,
    @Body(new ZodValidationPipe(ServicePricePolicyCreateSchema))
    input: ServicePricePolicyCreate,
  ) {
    return this.catalog.createPricePolicy(actor, serviceId, input, requestId);
  }

  @RequireRecentStepUp()
  @Post('services/:serviceId/price-policies/:policyId/activate')
  activatePricePolicy(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param('serviceId', new ZodValidationPipe(MasterServiceIdSchema))
    serviceId: string,
    @Param('policyId') policyId: string,
    @Body(new ZodValidationPipe(PricePolicyActivationSchema))
    input: PricePolicyActivation,
  ) {
    return this.catalog.activatePricePolicy(
      actor,
      serviceId,
      policyId,
      input,
      requestId,
    );
  }
}
