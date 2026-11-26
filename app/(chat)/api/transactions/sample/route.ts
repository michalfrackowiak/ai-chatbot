import { auth } from '@/app/(auth)/auth';
import {
  createFinanceTransaction,
  getFinanceTransactions,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const existing = await getFinanceTransactions({ userId: session.user.id });
  if (existing.length) {
    return Response.json(
      { error: 'Sample data can only be added to an empty ledger.' },
      { status: 409 },
    );
  }

  const today = new Date();
  const samples = [
    {
      kind: 'income' as const,
      amount: 4200,
      description: 'Monthly salary',
      category: 'Salary',
      daysAgo: 2,
    },
    {
      kind: 'expense' as const,
      amount: 84.5,
      description: 'Weekly groceries',
      category: 'Food',
      daysAgo: 1,
    },
    {
      kind: 'expense' as const,
      amount: 65,
      description: 'Monthly transit pass',
      category: 'Transport',
      daysAgo: 4,
    },
    {
      kind: 'income' as const,
      amount: 250,
      description: 'Freelance project',
      category: 'Freelance',
      daysAgo: 6,
    },
    {
      kind: 'expense' as const,
      amount: 42,
      description: 'Internet bill',
      category: 'Utilities',
      daysAgo: 8,
    },
    {
      kind: 'expense' as const,
      amount: 31.25,
      description: 'Dinner with friends',
      category: 'Dining',
      daysAgo: 10,
    },
  ];

  const created = await Promise.all(
    samples.map((sample) =>
      createFinanceTransaction({
        userId: session.user.id,
        ...sample,
        occurredAt: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - sample.daysAgo,
        ),
      }),
    ),
  );

  return Response.json({ count: created.length }, { status: 201 });
}
