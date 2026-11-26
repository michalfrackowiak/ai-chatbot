import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import {
  createFinanceTransaction,
  deleteFinanceTransaction,
  getFinanceTransactions,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

const transactionSchema = z.object({
  kind: z.enum(['income', 'expense']),
  amount: z.number().min(0.01).max(999999999),
  description: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(64),
  occurredAt: z.string().datetime().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const transactions = await getFinanceTransactions({
    userId: session.user.id,
  });
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );
  const totals = transactions.reduce(
    (result, transaction) => {
      const amount = Number(transaction.amount);
      if (transaction.kind === 'income') result.income += amount;
      else result.expenses += amount;

      if (transaction.occurredAt >= monthStart) {
        if (transaction.kind === 'income') result.monthIncome += amount;
        else result.monthExpenses += amount;
      }

      return result;
    },
    { income: 0, expenses: 0, monthIncome: 0, monthExpenses: 0 },
  );

  return Response.json({
    transactions: transactions.map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount),
    })),
    totals: {
      ...totals,
      balance: totals.income - totals.expenses,
      monthBalance: totals.monthIncome - totals.monthExpenses,
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const parsed = transactionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid transaction details.' },
      { status: 400 },
    );
  }

  const transaction = await createFinanceTransaction({
    ...parsed.data,
    userId: session.user.id,
    occurredAt: parsed.data.occurredAt
      ? new Date(parsed.data.occurredAt)
      : new Date(),
  });

  return Response.json(
    { transaction: { ...transaction, amount: Number(transaction.amount) } },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return Response.json(
      { error: 'A transaction id is required.' },
      { status: 400 },
    );
  }

  const deleted = await deleteFinanceTransaction({
    id,
    userId: session.user.id,
  });

  if (!deleted) {
    return Response.json({ error: 'Transaction not found.' }, { status: 404 });
  }

  return Response.json({ id: deleted.id });
}
