import 'server-only';

import { and, desc, eq, gte, lte } from 'drizzle-orm';

import { ChatSDKError } from '@/lib/errors';
import type {
  TransactionInput,
  TransactionUpdate,
} from '@/lib/transactions/validation';
import { toCents } from '@/lib/transactions/money';
import { db } from './client';
import { transaction, type Transaction } from './schema';

type Source = Transaction['source'];

export async function listTransactions({
  userId,
  limit = 50,
  type,
  from,
  to,
}: {
  userId: string;
  limit?: number;
  type?: 'income' | 'expense';
  from?: Date;
  to?: Date;
}): Promise<Array<Transaction>> {
  try {
    const conditions = [eq(transaction.userId, userId)];

    if (type) conditions.push(eq(transaction.type, type));
    if (from) conditions.push(gte(transaction.occurredAt, from));
    if (to) conditions.push(lte(transaction.occurredAt, to));

    return await db
      .select()
      .from(transaction)
      .where(and(...conditions))
      .orderBy(desc(transaction.occurredAt))
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to list transactions',
    );
  }
}

export async function createTransaction({
  userId,
  input,
  source = 'manual',
}: {
  userId: string;
  input: TransactionInput;
  source?: Source;
}): Promise<Transaction> {
  try {
    const [created] = await db
      .insert(transaction)
      .values({
        userId,
        type: input.type,
        amount: toCents(input.amount),
        category: input.category,
        description: input.description,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        source,
      })
      .returning();

    return created;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create transaction',
    );
  }
}

export async function updateTransaction({
  userId,
  id,
  patch,
}: {
  userId: string;
  id: string;
  patch: TransactionUpdate;
}): Promise<Transaction | undefined> {
  try {
    const [updated] = await db
      .update(transaction)
      .set({
        type: patch.type,
        amount: patch.amount === undefined ? undefined : toCents(patch.amount),
        category: patch.category,
        description: patch.description,
        occurredAt: patch.occurredAt
          ? new Date(patch.occurredAt)
          : undefined,
      })
      .where(and(eq(transaction.id, id), eq(transaction.userId, userId)))
      .returning();

    return updated;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update transaction',
    );
  }
}

export async function deleteTransaction({
  userId,
  id,
}: {
  userId: string;
  id: string;
}): Promise<Transaction | undefined> {
  try {
    const [deleted] = await db
      .delete(transaction)
      .where(and(eq(transaction.id, id), eq(transaction.userId, userId)))
      .returning();

    return deleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete transaction',
    );
  }
}

export function summarizeTransactions(transactions: Array<Transaction>) {
  const totals = transactions.reduce(
    (result, item) => {
      if (item.type === 'income') result.incomeCents += item.amount;
      else result.expenseCents += item.amount;

      return result;
    },
    { incomeCents: 0, expenseCents: 0 },
  );

  return {
    ...totals,
    netCents: totals.incomeCents - totals.expenseCents,
  };
}
