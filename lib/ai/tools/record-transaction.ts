import { tool, type DataStreamWriter } from 'ai';
import { z } from 'zod';
import { createFinanceTransaction } from '@/lib/db/queries';

export function recordTransaction({
  userId,
  dataStream,
}: {
  userId: string;
  dataStream: DataStreamWriter;
}) {
  return tool({
    description:
      'Record an income or expense the user explicitly asks to add. Amounts are in USD. Do not invent amounts; ask a clarifying question if the amount, currency, or whether it is income/expense is unclear.',
    parameters: z.object({
      kind: z.enum(['income', 'expense']),
      amount: z.number().min(0.01).max(999999999),
      description: z.string().trim().min(1).max(200),
      category: z.string().trim().min(1).max(64).default('Other'),
      occurredAt: z.string().optional(),
    }),
    execute: async ({ kind, amount, description, category, occurredAt }) => {
      const date = occurredAt ? new Date(occurredAt) : new Date();
      if (Number.isNaN(date.getTime())) {
        throw new Error('Transaction date is invalid');
      }

      const transaction = await createFinanceTransaction({
        userId,
        kind,
        amount,
        description,
        category,
        occurredAt: date,
      });

      dataStream.writeData({
        type: 'transaction-updated',
        content: transaction.id,
      });

      return {
        id: transaction.id,
        kind: transaction.kind,
        amount: Number(transaction.amount),
        description: transaction.description,
        category: transaction.category,
        occurredAt: transaction.occurredAt.toISOString(),
      };
    },
  });
}
