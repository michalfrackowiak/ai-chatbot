import { auth } from '@/app/(auth)/auth';
import {
  deleteTransaction,
  getTransactionById,
  updateTransaction,
} from '@/lib/db/finance-queries';
import { ChatSDKError } from '@/lib/errors';
import { dollarsToCents, transactionUpdateSchema } from '@/lib/finance/validation';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  const { id } = await params;
  const existing = await getTransactionById({ id });

  if (!existing) {
    return new ChatSDKError('not_found:api', 'Transaction not found').toResponse();
  }

  if (existing.userId !== session.user.id) {
    return new ChatSDKError('forbidden:api').toResponse();
  }

  const parsed = transactionUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return new ChatSDKError('bad_request:api', 'Invalid transaction').toResponse();
  }

  const { date, amount, ...rest } = parsed.data;

  const updated = await updateTransaction({
    id,
    userId: session.user.id,
    updates: {
      ...rest,
      ...(amount !== undefined ? { amount: dollarsToCents(amount) } : {}),
      ...(date ? { date: new Date(date) } : {}),
    },
  });

  if (!updated) {
    return new ChatSDKError('not_found:api', 'Transaction not found').toResponse();
  }

  return Response.json(updated, { status: 200 });
}

export async function DELETE(_request: Request, { params }: Context) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  const { id } = await params;
  const existing = await getTransactionById({ id });

  if (!existing) {
    return new ChatSDKError('not_found:api', 'Transaction not found').toResponse();
  }

  if (existing.userId !== session.user.id) {
    return new ChatSDKError('forbidden:api').toResponse();
  }

  const deleted = await deleteTransaction({ id, userId: session.user.id });

  return Response.json(deleted, { status: 200 });
}
