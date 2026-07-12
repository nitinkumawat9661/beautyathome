import { Body, Controller, Get, Patch } from '@nestjs/common';

import { AllowedAccountStatuses } from '../common/decorators/account-statuses.decorator';
import { CurrentActor } from '../common/decorators/current-actor.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { ProfessionalsService } from '../professionals/professionals.service';
import { UsersService } from './users.service';
import {
  AdminProfileUpdateSchema,
  CustomerProfileUpdateSchema,
  ProfessionalProfileUpdateSchema,
  type AdminProfileUpdate,
  type CustomerProfileUpdate,
  type ProfessionalProfileUpdate,
} from './users.validation';

@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @AllowedAccountStatuses('ACTIVE', 'SUSPENDED')
  @Get()
  getMe(@CurrentActor() actor: AuthenticatedActor) {
    return this.users.getMe(actor);
  }

  @Roles('CUSTOMER')
  @Patch('customer-profile')
  updateCustomerProfile(
    @CurrentActor() actor: AuthenticatedActor,
    @Body(new ZodValidationPipe(CustomerProfileUpdateSchema))
    input: CustomerProfileUpdate,
  ) {
    return this.users.updateCustomerProfile(actor, input);
  }
}

@Roles('PROFESSIONAL')
@Controller('professional/profile')
export class ProfessionalProfileController {
  constructor(private readonly professionals: ProfessionalsService) {}

  @Get()
  getProfile(@CurrentActor() actor: AuthenticatedActor) {
    return this.professionals.getOwn(actor);
  }

  @Patch()
  updateProfile(
    @CurrentActor() actor: AuthenticatedActor,
    @Body(new ZodValidationPipe(ProfessionalProfileUpdateSchema))
    input: ProfessionalProfileUpdate,
  ) {
    return this.professionals.updateOwn(actor, input);
  }
}

@Roles('ADMIN', 'SUPPORT', 'FINANCE')
@Controller('admin/profile')
export class AdminProfileController {
  constructor(private readonly users: UsersService) {}

  @Get()
  getProfile(@CurrentActor() actor: AuthenticatedActor) {
    return this.users.getAdminProfile(actor);
  }

  @Patch()
  updateProfile(
    @CurrentActor() actor: AuthenticatedActor,
    @Body(new ZodValidationPipe(AdminProfileUpdateSchema))
    input: AdminProfileUpdate,
  ) {
    return this.users.updateAdminProfile(actor, input);
  }
}
