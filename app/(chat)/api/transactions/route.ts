import { auth } from '@/app/(auth)/auth';
import {
  createTransaction,
  listTransactions,
  summarizeTransactions,
} from '@/lib/db/transactions';
import { ChatSDKError } from '@/lib/errors';
import { serializeTransaction } from '@/lib/transactions/types';
import {
  transactionInputSchema,
  transactionsQuerySchema,
} from '@/lib/transactions/validation';

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:transaction').toResponse();
    }

    const searchParams = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );
    const parsed = transactionsQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      return new ChatSDKError('bad_request:transaction').toResponse();
    }

    const userId = session.user.id;
    const { limit = 50, type, from, to } = parsed.data;
    const dateRange = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };

    const [transactions, allTransactions] = await Promise.all([
      listTransactions({ userId, limit, type, ...dateRange }),
      listTransactions({ userId, limit: 5000, type, ...dateRange }),
    ]);

    return Response.json({
      transactions: transactions.map(serializeTransaction),
      totals: summarizeTransactions(allTransactions),
    });
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    return new ChatSDKError('bad_request:transaction').toResponse();
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:transaction').toResponse();
    }

    const json = await request.json().catch(() => null);
    const parsed = transactionInputSchema.safeParse(json);

    if (!parsed.success) {
      return new ChatSDKError(
        'bad_request:transaction',
        parsed.error.issues.map((issue) => issue.message).join(', '),
      ).toResponse();
    }

    const created = await createTransaction({
      userId: session.user.id,
      input: parsed.data,
    });

    return Response.json(serializeTransaction(created), { status: 201 });
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    return new ChatSDKError('bad_request:transaction').toResponse();
  }
}
