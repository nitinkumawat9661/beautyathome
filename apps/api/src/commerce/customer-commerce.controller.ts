import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentActor } from '../common/decorators/current-actor.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { CommerceService } from './commerce.service';
import {
  BookingCancelSchema,
  BookingCreateRequestSchema,
  BookingIdSchema,
  BookingListQuerySchema,
  IdempotencyHeaderSchema,
  PaymentConfirmSchema,
  PaymentOrderCreateSchema,
  ReminderRequestSchema,
  ReviewRequestSchema,
  type BookingCancel,
  type BookingCreateRequest,
  type BookingListQuery,
  type PaymentConfirm,
  type ReminderRequest,
  type ReviewRequest,
} from './commerce.validation';

@Roles('CUSTOMER')
@Controller()
export class CustomerCommerceController {
  constructor(private readonly commerce: CommerceService) {}
  @Post('bookings')
  create(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key')
    key: string,
    @Body(new ZodValidationPipe(BookingCreateRequestSchema))
    input: BookingCreateRequest,
  ) {
    return this.commerce.createBooking(
      actor,
      input,
      new ZodValidationPipe(IdempotencyHeaderSchema).transform(key),
    );
  }
  @Get('bookings')
  list(
    @CurrentActor() actor: AuthenticatedActor,
    @Query(new ZodValidationPipe(BookingListQuerySchema))
    query: BookingListQuery,
  ) {
    return this.commerce.listBookings(actor, query);
  }
  @Get('bookings/:bookingId')
  get(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
  ) {
    return this.commerce.getBooking(actor, id);
  }
  @Post('bookings/:bookingId/cancel')
  cancel(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
    @Body(new ZodValidationPipe(BookingCancelSchema)) input: BookingCancel,
  ) {
    return this.commerce.cancel(actor, id, input);
  }
  @Post('bookings/:bookingId/payment-order')
  order(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
    @Body(new ZodValidationPipe(PaymentOrderCreateSchema))
    input: { idempotencyKey: string },
  ) {
    return this.commerce.createPaymentOrder(actor, id, input.idempotencyKey);
  }
  @Post('bookings/:bookingId/payment-confirmation')
  confirm(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
    @Body(new ZodValidationPipe(PaymentConfirmSchema)) input: PaymentConfirm,
  ) {
    return this.commerce.confirmPayment(actor, id, input);
  }
  @Post('bookings/:bookingId/reviews')
  review(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
    @Body(new ZodValidationPipe(ReviewRequestSchema)) input: ReviewRequest,
  ) {
    return this.commerce.review(actor, id, input);
  }
  @Post('bookings/:bookingId/rebooking-reminders')
  reminder(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
    @Body(new ZodValidationPipe(ReminderRequestSchema)) input: ReminderRequest,
  ) {
    return this.commerce.reminder(actor, id, input);
  }
}
