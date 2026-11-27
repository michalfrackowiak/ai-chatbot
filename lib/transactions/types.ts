import type { Transaction } from '@/lib/db/schema';

export type SerializedTransaction = Omit<
  Transaction,
  'occurredAt' | 'createdAt'
> & {
  occurredAt: string;
  createdAt: string;
};

export function serializeTransaction(
  transaction: Transaction,
): SerializedTransaction {
  const { occurredAt, createdAt, ...rest } = transaction;

  return {
    ...rest,
    occurredAt: occurredAt.toISOString(),
    createdAt: createdAt.toISOString(),
  };
}
