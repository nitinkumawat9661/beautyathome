import { CommerceDomainService } from './commerce-domain.service';

describe('CommerceDomainService', () => {
  const service = new CommerceDomainService();
  it('rejects invalid booking transitions', () =>
    expect(() => service.transition('DRAFT', 'COMPLETED')).toThrow());
  it('calculates and freezes commission values', () =>
    expect(
      service.commission(10_000, { rateBasisPoints: 2000, fixedFeePaise: 0 }),
    ).toEqual({ grossPaise: 10_000, commissionPaise: 2_000, netPaise: 8_000 }));
  it('applies cancellation refund bands', () =>
    expect(
      service.refund(
        10_000,
        new Date('2026-01-02T00:00:00Z'),
        new Date('2026-01-01T20:00:00Z'),
      ).refundPaise,
    ).toBe(5_000));
  it('verifies purpose-secret OTP hashes without storing plaintext', () => {
    const issued = service.issueOtp('test-secret');
    expect(
      service.verifyOtp('test-secret', issued.code, issued.codeHash, {
        expiresAt: issued.expiresAt,
        attempts: 0,
        consumedAt: null,
      }),
    ).toBe(true);
    expect(
      service.verifyOtp('test-secret', '000000', issued.codeHash, {
        expiresAt: issued.expiresAt,
        attempts: 0,
        consumedAt: null,
      }),
    ).toBe(false);
  });
});
