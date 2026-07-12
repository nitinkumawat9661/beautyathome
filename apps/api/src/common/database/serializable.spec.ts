import { runSerializable } from './serializable';

describe('runSerializable', () => {
  it('propagates a domain failure so Prisma rolls the transaction back', async () => {
    const transaction = jest
      .fn()
      .mockRejectedValue(new Error('mutation failed'));
    await expect(
      runSerializable({ $transaction: transaction } as never, () =>
        Promise.resolve('unused'),
      ),
    ).rejects.toThrow('mutation failed');
    expect(transaction).toHaveBeenCalledTimes(1);
  });
  it('retries serialization conflicts within the bounded budget', async () => {
    const conflict = Object.assign(new Error('serialization'), {
      code: 'P2034',
    });
    const transaction = jest
      .fn()
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce('committed');
    await expect(
      runSerializable({ $transaction: transaction } as never, () =>
        Promise.resolve('unused'),
      ),
    ).resolves.toBe('committed');
    expect(transaction).toHaveBeenCalledTimes(2);
  });
});
