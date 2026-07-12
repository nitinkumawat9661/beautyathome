import {
  AvailabilityRangeQuerySchema,
  DateAvailabilityOverridesReplaceSchema,
  WeeklyAvailabilityReplaceSchema,
  type AvailabilityRangeQuery,
  type DateAvailabilityOverridesReplace,
  type WeeklyAvailabilityReplace,
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

import { CurrentActor } from '../common/decorators/current-actor.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { AvailabilityService } from './availability.service';
import {
  AvailabilitySlotCreateSchema,
  AvailabilitySlotIdSchema,
  type AvailabilitySlotCreate,
} from './availability.validation';

@Roles('PROFESSIONAL')
@Controller('professional/availability')
export class ProfessionalAvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  get(
    @CurrentActor() actor: AuthenticatedActor,
    @Query(new ZodValidationPipe(AvailabilityRangeQuerySchema))
    query: AvailabilityRangeQuery,
  ) {
    return this.availability.getOwn(actor, query);
  }

  @Put('weekly')
  replaceWeekly(
    @CurrentActor() actor: AuthenticatedActor,
    @Body(new ZodValidationPipe(WeeklyAvailabilityReplaceSchema))
    input: WeeklyAvailabilityReplace,
  ) {
    return this.availability.replaceWeekly(actor, input);
  }

  @Put('overrides')
  replaceOverrides(
    @CurrentActor() actor: AuthenticatedActor,
    @Body(new ZodValidationPipe(DateAvailabilityOverridesReplaceSchema))
    input: DateAvailabilityOverridesReplace,
  ) {
    return this.availability.replaceOverrides(actor, input);
  }

  @Post('slots')
  createSlot(
    @CurrentActor() actor: AuthenticatedActor,
    @Body(new ZodValidationPipe(AvailabilitySlotCreateSchema))
    input: AvailabilitySlotCreate,
  ) {
    return this.availability.createSlot(actor, input);
  }

  @Delete('slots/:slotId')
  deleteSlot(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('slotId', new ZodValidationPipe(AvailabilitySlotIdSchema))
    slotId: string,
  ) {
    return this.availability.deleteSlot(actor, slotId);
  }
}
