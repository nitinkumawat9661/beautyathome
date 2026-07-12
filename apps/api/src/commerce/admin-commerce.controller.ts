import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentActor } from '../common/decorators/current-actor.decorator';
import { RequireRecentStepUp } from '../common/decorators/require-recent-step-up.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { CommerceService } from './commerce.service';
import {
  AdminDecisionSchema,
  AdminOverrideSchema,
  BookingIdSchema,
  BookingListQuerySchema,
  CommissionRuleCreateSchema,
  RefundIdSchema,
  WithdrawalIdSchema,
  type AdminDecision,
  type AdminOverride,
  type BookingListQuery,
  type CommissionRuleCreate,
} from './commerce.validation';

@Roles('ADMIN')
@Controller('admin/commerce')
export class AdminCommerceController {
  constructor(private readonly commerce: CommerceService) {}
  @Get('bookings') bookings(
    @CurrentActor() actor: AuthenticatedActor,
    @Query(new ZodValidationPipe(BookingListQuerySchema))
    query: BookingListQuery,
  ) {
    return this.commerce.listBookings(actor, query, true);
  }
  @Get('bookings/:bookingId') booking(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
  ) {
    return this.commerce.getBooking(actor, id, true);
  }
  @RequireRecentStepUp() @Post('bookings/:bookingId/override') override(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('bookingId', new ZodValidationPipe(BookingIdSchema)) id: string,
    @Body(new ZodValidationPipe(AdminOverrideSchema)) input: AdminOverride,
  ) {
    return this.commerce.override(actor, id, input);
  }
  @Get('payment-attempts') attempts() {
    return this.commerce.paymentAttempts();
  }
  @Get('refunds') refunds() {
    return this.commerce.refunds();
  }
  @RequireRecentStepUp() @Post('refunds/:refundId/decision') decideRefund(
    @Param('refundId', new ZodValidationPipe(RefundIdSchema)) id: string,
    @Body(new ZodValidationPipe(AdminDecisionSchema)) input: AdminDecision,
  ) {
    return this.commerce.decideRefund(id, input);
  }
  @Get('wallet-entries') ledger() {
    return this.commerce.walletEntries();
  }
  @Get('withdrawals') withdrawals() {
    return this.commerce.withdrawals();
  }
  @RequireRecentStepUp() @Post('withdrawals/:withdrawalId/decision') decide(
    @Param('withdrawalId', new ZodValidationPipe(WithdrawalIdSchema))
    id: string,
    @Body(new ZodValidationPipe(AdminDecisionSchema)) input: AdminDecision,
  ) {
    return this.commerce.decideWithdrawal(id, input);
  }
  @Get('commission-rules') rules() {
    return this.commerce.commissionRules();
  }
  @RequireRecentStepUp() @Post('commission-rules') createRule(
    @Body(new ZodValidationPipe(CommissionRuleCreateSchema))
    input: CommissionRuleCreate,
  ) {
    return this.commerce.createCommissionRule(input);
  }
  @Get('disputes') disputes(@CurrentActor() actor: AuthenticatedActor) {
    return this.commerce.listBookings(
      actor,
      { status: 'DISPUTED', limit: 100 },
      true,
    );
  }
}
