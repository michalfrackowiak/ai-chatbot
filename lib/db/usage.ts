import 'server-only';

import { and, desc, eq, gte } from 'drizzle-orm';
import { startOfMonth } from 'date-fns';

import type { UserType } from '@/app/(auth)/auth';
import { guestRegex } from '@/lib/constants';
import {
  type StoredUsageLimits,
  type UsageLimits,
  resolveLimits,
} from '@/lib/ai/limits';
import { calculateCostMicros } from '@/lib/ai/pricing';
import { ChatSDKError } from '@/lib/errors';
import { db } from './client';
import { aiUsage, appSetting, usageLimit, user } from './schema';

const DEFAULT_LIMITS_KEY = 'defaultUsageLimits';

export async function recordAiUsage({
  userId,
  chatId,
  model,
  promptTokens,
  completionTokens,
}: {
  userId: string;
  chatId?: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}): Promise<void> {
  try {
    await db.insert(aiUsage).values({
      userId,
      chatId,
      model,
      promptTokens,
      completionTokens,
      costMicros: calculateCostMicros({
        model,
        promptTokens,
        completionTokens,
      }),
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to record AI usage');
  }
}

export async function getMonthlySpendMicros({
  userId,
  now = new Date(),
}: {
  userId: string;
  now?: Date;
}): Promise<number> {
  try {
    const rows = await db
      .select({ costMicros: aiUsage.costMicros })
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.userId, userId),
          gte(aiUsage.createdAt, startOfMonth(now)),
        ),
      );

    return rows.reduce((total, row) => total + row.costMicros, 0);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to calculate monthly AI spend',
    );
  }
}

export async function getDefaultLimits(): Promise<StoredUsageLimits | null> {
  try {
    const [setting] = await db
      .select()
      .from(appSetting)
      .where(eq(appSetting.key, DEFAULT_LIMITS_KEY))
      .limit(1);

    return (setting?.value as StoredUsageLimits | undefined) ?? null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to load default usage limits',
    );
  }
}

export async function setDefaultLimits(
  limits: StoredUsageLimits,
): Promise<void> {
  try {
    await db
      .insert(appSetting)
      .values({ key: DEFAULT_LIMITS_KEY, value: limits, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSetting.key,
        set: { value: limits, updatedAt: new Date() },
      });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save default usage limits',
    );
  }
}

export async function getUserLimit(
  userId: string,
): Promise<StoredUsageLimits | null> {
  try {
    const [row] = await db
      .select()
      .from(usageLimit)
      .where(eq(usageLimit.userId, userId))
      .limit(1);

    if (!row) return null;

    return {
      maxMessagesPerDay: row.maxMessagesPerDay,
      maxMonthlySpendMicros: row.maxMonthlySpendMicros,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to load user usage limits',
    );
  }
}

export async function setUserLimit(
  userId: string,
  limits: StoredUsageLimits,
): Promise<void> {
  try {
    await db
      .insert(usageLimit)
      .values({
        userId,
        ...limits,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: usageLimit.userId,
        set: { ...limits, updatedAt: new Date() },
      });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save user usage limits',
    );
  }
}

export async function clearUserLimit(userId: string): Promise<void> {
  try {
    await db.delete(usageLimit).where(eq(usageLimit.userId, userId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to clear user usage limits',
    );
  }
}

export async function getEffectiveLimits({
  userId,
  userType,
}: {
  userId: string;
  userType: UserType;
}): Promise<UsageLimits> {
  const [defaults, override] = await Promise.all([
    getDefaultLimits(),
    getUserLimit(userId),
  ]);

  return resolveLimits({ userType, defaults, override });
}

export async function getAdminSummary() {
  try {
    const now = new Date();
    const [defaults, users, limits, allUsage] = await Promise.all([
      getDefaultLimits(),
      db
        .select({ id: user.id, email: user.email })
        .from(user)
        .orderBy(desc(user.email))
        .limit(100),
      db.select().from(usageLimit),
      db.select().from(aiUsage),
    ]);

    const limitsByUser = new Map(limits.map((row) => [row.userId, row]));
    const monthStart = startOfMonth(now);

    return {
      defaults,
      users: users.map((account) => {
        const usage = allUsage.filter((row) => row.userId === account.id);
        const override = limitsByUser.get(account.id);

        return {
          id: account.id,
          email: account.email,
          requestCount: usage.length,
          allTimeSpendMicros: usage.reduce(
            (total, row) => total + row.costMicros,
            0,
          ),
          monthlySpendMicros: usage
            .filter((row) => new Date(row.createdAt) >= monthStart)
            .reduce((total, row) => total + row.costMicros, 0),
          promptTokens: usage.reduce(
            (total, row) => total + row.promptTokens,
            0,
          ),
          completionTokens: usage.reduce(
            (total, row) => total + row.completionTokens,
            0,
          ),
          hasOverride: Boolean(override),
          effectiveLimits: resolveLimits({
            userType: guestRegex.test(account.email) ? 'guest' : 'regular',
            defaults,
            override: override
              ? {
                  maxMessagesPerDay: override.maxMessagesPerDay,
                  maxMonthlySpendMicros: override.maxMonthlySpendMicros,
                }
              : null,
          }),
        };
      }),
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to load admin usage summary',
    );
  }
}
