import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import {
  deleteTransaction,
  updateTransaction,
} from '@/lib/db/transactions';
import { ChatSDKError } from '@/lib/errors';
import { serializeTransaction } from '@/lib/transactions/types';
import { transactionUpdateSchema } from '@/lib/transactions/validation';

type Context = { params: Promise<{ id: string }> };

async function requireUserId() {
  const session = await auth();

  if (!session?.user) {
    throw new ChatSDKError('unauthorized:transaction');
  }

  return session.user.id;
}

function parseId(id: string): string {
  const parsed = z.string().uuid().safeParse(id);

  if (!parsed.success) {
    throw new ChatSDKError('bad_request:transaction');
  }

  return parsed.data;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const userId = await requireUserId();
    const id = parseId((await context.params).id);
    const json = await request.json().catch(() => null);
    const parsed = transactionUpdateSchema.safeParse(json);

    if (!parsed.success) {
      return new ChatSDKError('bad_request:transaction').toResponse();
    }

    const updated = await updateTransaction({ userId, id, patch: parsed.data });

    if (!updated) {
      return new ChatSDKError('not_found:transaction').toResponse();
    }

    return Response.json(serializeTransaction(updated));
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    return new ChatSDKError('bad_request:transaction').toResponse();
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const userId = await requireUserId();
    const id = parseId((await context.params).id);
    const deleted = await deleteTransaction({ userId, id });

    if (!deleted) {
      return new ChatSDKError('not_found:transaction').toResponse();
    }

    return Response.json(serializeTransaction(deleted));
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    return new ChatSDKError('bad_request:transaction').toResponse();
  }
}
