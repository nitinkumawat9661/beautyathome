import {
  ProfessionalServiceRequestCreateSchema,
  ProfessionalServiceUpsertSchema,
  ServiceRequestListQuerySchema,
  type ProfessionalServiceRequestCreate,
  type ProfessionalServiceUpsert,
  type ServiceRequestListQuery,
} from '@beautyathome/marketplace';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { z } from 'zod';

import { CurrentActor } from '../common/decorators/current-actor.decorator';
import { CurrentRequestId } from '../common/decorators/current-request-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import {
  MasterServiceIdSchema,
  ProfessionalServiceDisableQuerySchema,
  ProfessionalServiceListQuerySchema,
  ServiceRequestIdSchema,
} from './professional-services.validation';
import { ProfessionalServicesService } from './professional-services.service';
import { ServiceRequestsService } from './service-requests.service';

type ProfessionalServiceListQuery = z.infer<
  typeof ProfessionalServiceListQuerySchema
>;
type ProfessionalServiceDisableQuery = z.infer<
  typeof ProfessionalServiceDisableQuerySchema
>;

@Roles('PROFESSIONAL')
@Controller('professional')
export class ProfessionalServicesController {
  constructor(
    private readonly services: ProfessionalServicesService,
    private readonly requests: ServiceRequestsService,
  ) {}

  @Get('services')
  listServices(
    @CurrentActor() actor: AuthenticatedActor,
    @Query(new ZodValidationPipe(ProfessionalServiceListQuerySchema))
    query: ProfessionalServiceListQuery,
  ) {
    return this.services.list(actor, query.after, query.limit);
  }

  @Put('services/:serviceId')
  upsertService(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('serviceId', new ZodValidationPipe(MasterServiceIdSchema))
    serviceId: string,
    @Body(new ZodValidationPipe(ProfessionalServiceUpsertSchema))
    input: ProfessionalServiceUpsert,
  ) {
    return this.services.upsert(actor, serviceId, input);
  }

  @Delete('services/:serviceId')
  disableService(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('serviceId', new ZodValidationPipe(MasterServiceIdSchema))
    serviceId: string,
    @Query(new ZodValidationPipe(ProfessionalServiceDisableQuerySchema))
    query: ProfessionalServiceDisableQuery,
  ) {
    return this.services.disable(
      actor,
      serviceId,
      query.cityId,
      query.expectedVersion,
    );
  }

  @Get('service-requests')
  listRequests(
    @CurrentActor() actor: AuthenticatedActor,
    @Query(new ZodValidationPipe(ServiceRequestListQuerySchema))
    query: ServiceRequestListQuery,
  ) {
    return this.requests.listOwn(actor, query);
  }

  @Post('service-requests')
  createRequest(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Body(new ZodValidationPipe(ProfessionalServiceRequestCreateSchema))
    input: ProfessionalServiceRequestCreate,
  ) {
    return this.requests.create(actor, input, requestId);
  }

  @Get('service-requests/:requestId')
  getRequest(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('requestId', new ZodValidationPipe(ServiceRequestIdSchema))
    requestId: string,
  ) {
    return this.requests.getOwn(actor, requestId);
  }
}
