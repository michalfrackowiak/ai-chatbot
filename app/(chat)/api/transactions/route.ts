import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import {
  createTransaction,
  getTransactions,
  seedSampleTransactions,
} from '@/lib/db/finance-queries';
import {
  dollarsToCents,
  transactionInputSchema,
  type TransactionType,
} from '@/lib/finance/validation';

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limitParam = searchParams.get('limit');

  if (type && type !== 'income' && type !== 'expense') {
    return new ChatSDKError(
      'bad_request:api',
      'type must be income or expense',
    ).toResponse();
  }

  const toDate = (value: string | null, name: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new ChatSDKError('bad_request:api', `${name} must be an ISO date`);
    }
    return date;
  };

  try {
    const transactions = await getTransactions({
      userId: session.user.id,
      type: type as TransactionType | undefined,
      from: toDate(from, 'from'),
      to: toDate(to, 'to'),
      limit: limitParam ? Number(limitParam) : undefined,
    });

    return Response.json(transactions, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    throw error;
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  const parsed = transactionInputSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return new ChatSDKError('bad_request:api', 'Invalid transaction').toResponse();
  }

  const input = parsed.data;

  const transaction = await createTransaction({
    userId: session.user.id,
    type: input.type,
    amount: dollarsToCents(input.amount),
    category: input.category,
    description: input.description,
    date: input.date ? new Date(input.date) : undefined,
  });

  return Response.json(transaction, { status: 201 });
}

/**
 * Loads a demo data set for the signed-in user. Idempotent: existing data
 * is never overwritten, so this is safe to call from an empty state button.
 */
export async function PUT() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  const result = await seedSampleTransactions({ userId: session.user.id });
  return Response.json(result, { status: 200 });
}
