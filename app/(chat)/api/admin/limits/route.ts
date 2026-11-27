import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { isAdminEmail } from '@/lib/admin';
import {
  clearUserLimit,
  setDefaultLimits,
  setUserLimit,
} from '@/lib/db/usage';
import { ChatSDKError } from '@/lib/errors';
import { dollarsToMicros } from '@/lib/transactions/money';

/**
 * -1 means unlimited, null means "inherit from the global default".
 */
const limitSchema = z.object({
  userId: z.string().uuid().nullable().optional(),
  maxMessagesPerDay: z.number().int().min(-1).max(1_000_000).nullable(),
  maxMonthlySpendUsd: z.number().min(-1).max(1_000_000).nullable(),
});

function toMicros(usd: number | null): number | null {
  if (usd === null || usd === -1) return usd;
  return dollarsToMicros(usd);
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:auth').toResponse();
  }

  if (!isAdminEmail(session.user.email)) {
    return new ChatSDKError('forbidden:admin').toResponse();
  }

  const parsed = limitSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return new ChatSDKError('bad_request:admin').toResponse();
  }

  const { userId, maxMessagesPerDay, maxMonthlySpendUsd } = parsed.data;
  const limits = {
    maxMessagesPerDay,
    maxMonthlySpendMicros: toMicros(maxMonthlySpendUsd),
  };

  try {
    if (userId) {
      if (maxMessagesPerDay === null && maxMonthlySpendUsd === null) {
        await clearUserLimit(userId);
      } else {
        await setUserLimit(userId, limits);
      }
    } else {
      await setDefaultLimits({
        maxMessagesPerDay: maxMessagesPerDay ?? -1,
        maxMonthlySpendMicros: limits.maxMonthlySpendMicros ?? -1,
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    return new ChatSDKError('bad_request:admin').toResponse();
  }
}
