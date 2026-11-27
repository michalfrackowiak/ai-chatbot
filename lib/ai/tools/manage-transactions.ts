import type { Session } from 'next-auth';
import { type DataStreamWriter, tool } from 'ai';
import { z } from 'zod';

import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from '@/lib/db/transactions';
import { serializeTransaction } from '@/lib/transactions/types';
import {
  transactionInputSchema,
  transactionUpdateSchema,
} from '@/lib/transactions/validation';
import type { Transaction } from '@/lib/db/schema';

interface ManageTransactionsProps {
  session: Session;
  dataStream: DataStreamWriter;
}

function normalizeDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // Models often return a date without a time; treat it as midday UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T12:00:00.000Z`;
  return value;
}

export const manageTransactions = ({
  session,
  dataStream,
}: ManageTransactionsProps) =>
  tool({
    description:
      'Add, list, update or delete income and expenses for the signed-in user. Amounts are in currency units (e.g. 12.50), not cents. Use the current date when the user does not give one. Always confirm what was changed.',
    parameters: z.object({
      action: z.enum(['add', 'list', 'update', 'delete']),
      transactionId: z
        .string()
        .uuid()
        .describe('Required for update and delete; get it from list.'),
      type: z.enum(['income', 'expense']).optional(),
      amount: z.number().positive().optional(),
      category: z.string().min(1).max(64).optional(),
      description: z.string().min(1).max(500).optional(),
      occurredAt: z
        .string()
        .datetime()
        .describe('ISO 8601 date with time, e.g. 2026-03-08T12:00:00.000Z')
        .optional(),
    }),
    execute: async ({
      action,
      transactionId,
      type,
      amount,
      category,
      description,
      occurredAt,
    }) => {
      const userId = session.user.id;
      const occurredAtIso = normalizeDate(occurredAt);

      const notify = (change: string, transaction: Transaction) => {
        dataStream.writeData({
          type: 'transaction-changed',
          content: JSON.stringify({
            change,
            transaction: serializeTransaction(transaction),
          }),
        });
      };

      if (action === 'list') {
        const transactions = await listTransactions({ userId, limit: 20 });

        return {
          ok: true,
          transactions: transactions.map((transaction) => ({
            ...serializeTransaction(transaction),
            amount: transaction.amount / 100,
          })),
        };
      }

      if (action === 'add') {
        const parsed = transactionInputSchema.safeParse({
          type,
          amount,
          category,
          description,
          occurredAt: occurredAtIso,
        });

        if (!parsed.success) {
          return {
            ok: false,
            error: parsed.error.issues
              .map((issue) => issue.message)
              .join(', '),
          };
        }

        const transaction = await createTransaction({
          userId,
          input: parsed.data,
          source: 'chat',
        });
        notify('added', transaction);

        return {
          ok: true,
          message: `Added ${type} of ${amount} in ${category}.`,
          transaction: serializeTransaction(transaction),
        };
      }

      if (!transactionId) {
        return { ok: false, error: 'A transactionId is required.' };
      }

      if (action === 'delete') {
        const deleted = await deleteTransaction({ userId, id: transactionId });

        if (!deleted) {
          return { ok: false, error: 'Transaction not found.' };
        }

        notify('deleted', deleted);

        return { ok: true, message: 'The transaction was deleted.' };
      }

      const patch: Record<string, unknown> = {};
      if (type) patch.type = type;
      if (amount !== undefined) patch.amount = amount;
      if (category) patch.category = category;
      if (description) patch.description = description;
      if (occurredAtIso) patch.occurredAt = occurredAtIso;

      const parsed = transactionUpdateSchema.safeParse(patch);

      if (!parsed.success) {
        return {
          ok: false,
          error: parsed.error.issues.map((issue) => issue.message).join(', '),
        };
      }

      const updated = await updateTransaction({
        userId,
        id: transactionId,
        patch: parsed.data,
      });

      if (!updated) {
        return { ok: false, error: 'Transaction not found.' };
      }

      notify('updated', updated);

      return {
        ok: true,
        message: 'The transaction was updated.',
        transaction: serializeTransaction(updated),
      };
    },
  });
