import { Prisma } from '@beautyathome/database';

import type { PrismaService } from '../../database/prisma/prisma.service';

export async function runSerializable<T>(
  prisma: PrismaService,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error: unknown) {
      const retryable =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2034';
      if (!retryable || attempt === 3) throw error;
    }
  }

  throw new Error('Serializable transaction retry budget exhausted');
}
