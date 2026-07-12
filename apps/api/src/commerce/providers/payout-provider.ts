export interface PayoutProvider {
  createPayout(input: {
    withdrawalId: string;
    amountPaise: number;
    beneficiaryReference: string;
    idempotencyKey: string;
  }): Promise<{ providerPayoutId: string; status: 'PROCESSING' }>;
}
export class MockPayoutProvider implements PayoutProvider {
  createPayout(input: {
    withdrawalId: string;
    amountPaise: number;
    beneficiaryReference: string;
    idempotencyKey: string;
  }) {
    return Promise.resolve({
      providerPayoutId: `payout_${input.idempotencyKey}`,
      status: 'PROCESSING' as const,
    });
  }
}
