import type { Session } from 'next-auth';
import { tool, type DataStreamWriter } from 'ai';
import { z } from 'zod';

import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  getTransactions,
  summarizeTransactions,
  updateTransaction,
} from '@/lib/db/finance-queries';
import {
  centsToDollars,
  dollarsToCents,
  formatMoney,
} from '@/lib/finance/validation';

interface TransactionToolProps {
  session: Session;
  dataStream: DataStreamWriter;
}

const dateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date')
  .describe('ISO date or date-time, e.g. 2026-11-27');

const typeSchema = z.enum(['income', 'expense']);

/**
 * Tells the client (sidebar widget and /finance page) to re-fetch its list.
 * This is what makes chat-created entries appear immediately in the app.
 */
function notifyChange(
  dataStream: DataStreamWriter,
  action: 'created' | 'updated' | 'deleted',
  id: string,
) {
  dataStream.writeData({
    type: 'transaction-changed',
    content: { action, id, at: new Date().toISOString() },
  });
}

function describe(transaction: {
  type: string;
  amount: number;
  category: string;
  description: string;
}) {
  return `${transaction.type} of ${formatMoney(transaction.amount)} in ${
    transaction.category
  } (${transaction.description})`;
}

export const addTransaction = ({ session, dataStream }: TransactionToolProps) =>
  tool({
    description:
      'Add an income or expense for the signed-in user. Amounts are in dollars (major currency units), not cents. Use this whenever the user says they earned, received, paid, bought or spent something.',
    parameters: z.object({
      type: typeSchema,
      amount: z.number().positive().describe('Amount in dollars, e.g. 42.50'),
      category: z.string().min(1).max(64),
      description: z.string().min(1).max(500),
      date: dateSchema.optional().describe('Defaults to today'),
    }),
    execute: async ({ type, amount, category, description, date }) => {
      const transaction = await createTransaction({
        userId: session.user.id,
        type,
        amount: dollarsToCents(amount),
        category,
        description,
        date: date ? new Date(date) : undefined,
      });

      notifyChange(dataStream, 'created', transaction.id);

      return `Added ${describe(transaction)} on ${transaction.date
        .toISOString()
        .slice(0, 10)}. The finance list has been updated.`;
    },
  });

export const listTransactions = ({ session }: { session: Session }) =>
  tool({
    description:
      'List the signed-in user\'s income and expenses with totals. Use for questions like "how much did I spend on groceries?" or "show my recent expenses".',
    parameters: z.object({
      type: typeSchema.optional(),
      category: z.string().optional(),
      limit: z.number().int().positive().max(100).optional(),
    }),
    execute: async ({ type, category, limit }) => {
      let transactions = await getTransactions({ userId: session.user.id, type });

      if (category) {
        const needle = category.toLowerCase();
        transactions = transactions.filter((item) =>
          item.category.toLowerCase().includes(needle),
        );
      }

      const summary = summarizeTransactions(transactions);
      const shown = limit ? transactions.slice(0, limit) : transactions.slice(0, 50);

      return JSON.stringify({
        summary: {
          income: formatMoney(summary.incomeCents),
          expenses: formatMoney(summary.expenseCents),
          balance: formatMoney(summary.balanceCents),
          count: summary.count,
        },
        transactions: shown.map((item) => ({
          id: item.id,
          type: item.type,
          amount: centsToDollars(item.amount),
          category: item.category,
          description: item.description,
          date: item.date.toISOString().slice(0, 10),
        })),
        truncated: shown.length < transactions.length,
      });
    },
  });

export const editTransaction = ({ session, dataStream }: TransactionToolProps) =>
  tool({
    description:
      'Change an existing income or expense. Provide the transaction id (from listTransactions) and only the fields that should change.',
    parameters: z.object({
      id: z.string().uuid(),
      type: typeSchema.optional(),
      amount: z.number().positive().optional(),
      category: z.string().min(1).max(64).optional(),
      description: z.string().min(1).max(500).optional(),
      date: dateSchema.optional(),
    }),
    execute: async ({ id, type, amount, category, description, date }) => {
      const existing = await getTransactionById({ id });

      if (!existing || existing.userId !== session.user.id) {
        return `No transaction with id ${id} was found for this user.`;
      }

      const updated = await updateTransaction({
        id,
        userId: session.user.id,
        updates: {
          ...(type ? { type } : {}),
          ...(amount !== undefined ? { amount: dollarsToCents(amount) } : {}),
          ...(category ? { category } : {}),
          ...(description ? { description } : {}),
          ...(date ? { date: new Date(date) } : {}),
        },
      });

      if (!updated) {
        return `Could not update transaction ${id}.`;
      }

      notifyChange(dataStream, 'updated', id);
      return `Updated transaction ${id}: ${describe(updated)}.`;
    },
  });

export const removeTransaction = ({ session, dataStream }: TransactionToolProps) =>
  tool({
    description:
      'Delete an income or expense by id. Use listTransactions first if the user did not give an id.',
    parameters: z.object({ id: z.string().uuid() }),
    execute: async ({ id }) => {
      const existing = await getTransactionById({ id });

      if (!existing || existing.userId !== session.user.id) {
        return `No transaction with id ${id} was found for this user.`;
      }

      const deleted = await deleteTransaction({ id, userId: session.user.id });

      if (!deleted) {
        return `Could not delete transaction ${id}.`;
      }

      notifyChange(dataStream, 'deleted', id);
      return `Deleted ${describe(deleted)} (${id}).`;
    },
  });
