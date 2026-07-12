import { createHmac } from 'node:crypto';
import { MockRazorpayGateway } from './payment-gateway';

describe('MockRazorpayGateway', () => {
  const secret = 'gateway-test-secret-at-least-32-characters';
  const gateway = new MockRazorpayGateway(secret);
  it('creates deterministic sandbox orders for an idempotency key', async () => {
    const first = await gateway.createOrder({
      amountPaise: 50000,
      receipt: 'booking',
      idempotencyKey: 'idempotency-key-0001',
    });
    const second = await gateway.createOrder({
      amountPaise: 50000,
      receipt: 'booking',
      idempotencyKey: 'idempotency-key-0001',
    });
    expect(first).toEqual(second);
  });
  it('verifies a Razorpay-compatible HMAC and rejects tampering', () => {
    const signature = createHmac('sha256', secret)
      .update('order_1|pay_1')
      .digest('hex');
    expect(
      gateway.verifySignature({
        orderId: 'order_1',
        paymentId: 'pay_1',
        signature,
      }),
    ).toBe(true);
    expect(
      gateway.verifySignature({
        orderId: 'order_1',
        paymentId: 'pay_2',
        signature,
      }),
    ).toBe(false);
  });
});
