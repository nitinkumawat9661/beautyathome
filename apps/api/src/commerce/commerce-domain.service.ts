import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  assertBookingTransition,
  assertOtpAttemptAllowed,
  calculateCancellationRefund,
  calculateCommission,
  clearanceAt,
  type BookingStatus,
  type CommissionRuleInput,
  type OtpChallengeState,
} from '@beautyathome/booking';

@Injectable()
export class CommerceDomainService {
  transition(from: BookingStatus, to: BookingStatus) {
    assertBookingTransition(from, to);
    return to;
  }
  commission(grossPaise: number, rule: CommissionRuleInput) {
    return calculateCommission(grossPaise, rule);
  }
  refund(paidPaise: number, scheduledAt: Date, cancelledAt: Date) {
    return calculateCancellationRefund(paidPaise, scheduledAt, cancelledAt);
  }
  clearance(completedAt: Date) {
    return clearanceAt(completedAt);
  }
  issueOtp(secret: string) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    return {
      code,
      codeHash: this.hashOtp(secret, code),
      expiresAt: new Date(Date.now() + 300_000),
      maxAttempts: 5,
    };
  }
  verifyOtp(
    secret: string,
    code: string,
    expectedHash: string,
    state: OtpChallengeState,
    now = new Date(),
  ) {
    assertOtpAttemptAllowed(state, now);
    const actual = Buffer.from(this.hashOtp(secret, code));
    const expected = Buffer.from(expectedHash);
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
  private hashOtp(secret: string, code: string) {
    return createHmac('sha256', secret).update(code).digest('hex');
  }
}
