import { BookingStatus } from '@beautyathome/database';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentActor } from '../common/decorators/current-actor.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { CommerceService } from './commerce.service';
import {
  BookingActionSchema,
  BookingDecisionSchema,
  BookingIdSchema,
  BookingListQuerySchema,
  OtpVerifySchema,
  PayoutAccountCreateSchema,
  WithdrawalCreateSchema,
  type BookingAction,
  type BookingDecision,
  type BookingListQuery,
  type OtpVerify,
  type PayoutAccountCreate,
  type WithdrawalCreate,
} from './commerce.validation';

@Roles('PROFESSIONAL')
@Controller('professional')
export class ProfessionalCommerceController {
  constructor(private readonly commerce: CommerceService) {}
  @Get('bookings') list(
    @CurrentActor() actor: AuthenticatedActor,
    @Query(new ZodValidationPipe(BookingListQuerySchema))
    query: BookingListQuery,
  ) {
    return this.commerce.listBookings(actor, query);
  }
  @Get('bookings/:bookingId') get(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
  ) {
    return this.commerce.getBooking(actor, id);
  }
  @Post('bookings/:bookingId/accept') accept(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
    @Body(new ZodValidationPipe(BookingDecisionSchema)) input: BookingDecision,
  ) {
    return this.commerce.professionalDecision(actor, id, true, input);
  }
  @Post('bookings/:bookingId/reject') reject(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
    @Body(new ZodValidationPipe(BookingDecisionSchema)) input: BookingDecision,
  ) {
    return this.commerce.professionalDecision(actor, id, false, input);
  }
  @Post('bookings/:bookingId/en-route') enRoute(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
    @Body(new ZodValidationPipe(BookingActionSchema)) input: BookingAction,
  ) {
    return this.commerce.action(actor, id, BookingStatus.EN_ROUTE, input);
  }
  @Post('bookings/:bookingId/arrived') arrived(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
    @Body(new ZodValidationPipe(BookingActionSchema)) input: BookingAction,
  ) {
    return this.commerce.action(actor, id, BookingStatus.ARRIVED, input);
  }
  @Post('bookings/:bookingId/start-otp') startOtp(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
  ) {
    return this.commerce.issueServiceOtp(actor, id, 'START');
  }
  @Post('bookings/:bookingId/start-otp/verify') verifyStart(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
    @Body(new ZodValidationPipe(OtpVerifySchema)) input: OtpVerify,
  ) {
    return this.commerce.verifyServiceOtp(actor, id, 'START', input);
  }
  @Post('bookings/:bookingId/completion-otp') completionOtp(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
  ) {
    return this.commerce.issueServiceOtp(actor, id, 'COMPLETION');
  }
  @Post('bookings/:bookingId/completion-otp/verify') verifyCompletion(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
    @Body(new ZodValidationPipe(OtpVerifySchema)) input: OtpVerify,
  ) {
    return this.commerce.verifyServiceOtp(actor, id, 'COMPLETION', input);
  }
  @Get('wallet') wallet(@CurrentActor() actor: AuthenticatedActor) {
    return this.commerce.wallet(actor);
  }
  @Get('wallet/entries') ledger(@CurrentActor() actor: AuthenticatedActor) {
    return this.commerce.wallet(actor).then((wallet) => wallet.entries);
  }
  @Get('earnings') earnings(@CurrentActor() actor: AuthenticatedActor) {
    return this.commerce.wallet(actor);
  }
  @Post('payout-accounts') payout(
    @CurrentActor() actor: AuthenticatedActor,
    @Body(new ZodValidationPipe(PayoutAccountCreateSchema))
    input: PayoutAccountCreate,
  ) {
    return this.commerce.createPayoutAccount(actor, input);
  }
  @Get('payout-accounts') payoutAccounts(
    @CurrentActor() actor: AuthenticatedActor,
  ) {
    return this.commerce.payoutAccounts(actor);
  }
  @Get('withdrawals') withdrawals(@CurrentActor() actor: AuthenticatedActor) {
    return this.commerce.professionalWithdrawals(actor);
  }
  @Post('withdrawals') withdraw(
    @CurrentActor() actor: AuthenticatedActor,
    @Body(new ZodValidationPipe(WithdrawalCreateSchema))
    input: WithdrawalCreate,
  ) {
    return this.commerce.withdraw(actor, input);
  }
}
