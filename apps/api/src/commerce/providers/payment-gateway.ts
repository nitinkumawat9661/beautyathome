import { createHmac, timingSafeEqual } from 'node:crypto';

export type PaymentOrder = {
  provider: string;
  orderId: string;
  amountPaise: number;
  currency: 'INR';
};
export interface PaymentGateway {
  createOrder(input: {
    amountPaise: number;
    receipt: string;
    idempotencyKey: string;
  }): Promise<PaymentOrder>;
  verifySignature(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean;
}

export class MockRazorpayGateway implements PaymentGateway {
  constructor(private readonly secret: string) {}
  createOrder(input: {
    amountPaise: number;
    receipt: string;
    idempotencyKey: string;
  }) {
    return Promise.resolve({
      provider: 'razorpay-mock',
      orderId: `order_${input.idempotencyKey}`,
      amountPaise: input.amountPaise,
      currency: 'INR' as const,
    });
  }
  verifySignature(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }) {
    const expected = createHmac('sha256', this.secret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest('hex');
    const provided = Buffer.from(input.signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    return (
      provided.length === expectedBuffer.length &&
      timingSafeEqual(provided, expectedBuffer)
    );
  }
}
