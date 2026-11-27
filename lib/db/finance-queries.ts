import 'server-only';

import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { aiUsage, transaction, usageLimit, user } from './schema';
import type { Transaction, TransactionType } from './schema';
import { ChatSDKError } from '../errors';
import { DEFAULT_GLOBAL_LIMIT } from '@/lib/ai/pricing';

export { summarizeTransactions } from '@/lib/finance/summary-client';
import { getSampleTransactions } from '@/lib/finance/sample-data';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!, { max: 10 });
const db = drizzle(client);

const databaseError = (message: string) =>
  new ChatSDKError('bad_request:database', message);

export type NewTransaction = {
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date?: Date;
};

export type TransactionUpdate = Partial<
  Pick<NewTransaction, 'type' | 'amount' | 'category' | 'description' | 'date'>
>;

export async function getTransactions({
  userId,
  type,
  from,
  to,
  limit,
}: {
  userId: string;
  type?: TransactionType;
  from?: Date;
  to?: Date;
  limit?: number;
}): Promise<Array<Transaction>> {
  try {
    const conditions = [eq(transaction.userId, userId)];

    if (type) {
      conditions.push(eq(transaction.type, type));
    }
    if (from) {
      conditions.push(gte(transaction.date, from));
    }
    if (to) {
      conditions.push(lte(transaction.date, to));
    }

    return await db
      .select()
      .from(transaction)
      .where(and(...conditions))
      .orderBy(desc(transaction.date), desc(transaction.createdAt))
      .limit(limit ?? 1_000_000);
  } catch {
    throw databaseError('Failed to get transactions');
  }
}

export async function getTransactionById({
  id,
}: {
  id: string;
}): Promise<Transaction | undefined> {
  try {
    const [result] = await db
      .select()
      .from(transaction)
      .where(eq(transaction.id, id))
      .limit(1);
    return result;
  } catch {
    throw databaseError('Failed to get transaction');
  }
}

export async function createTransaction({
  userId,
  type,
  amount,
  category,
  description,
  date,
}: NewTransaction): Promise<Transaction> {
  try {
    const [created] = await db
      .insert(transaction)
      .values({
        userId,
        type,
        amount,
        category: category.trim().slice(0, 64),
        description: description.trim(),
        date: date ?? new Date(),
      })
      .returning();
    return created;
  } catch {
    throw databaseError('Failed to create transaction');
  }
}

export async function updateTransaction({
  id,
  userId,
  updates,
}: {
  id: string;
  userId: string;
  updates: TransactionUpdate;
}): Promise<Transaction | undefined> {
  try {
    const [updated] = await db
      .update(transaction)
      .set({
        ...updates,
        ...(updates.category
          ? { category: updates.category.trim().slice(0, 64) }
          : {}),
      })
      .where(and(eq(transaction.id, id), eq(transaction.userId, userId)))
      .returning();
    return updated;
  } catch {
    throw databaseError('Failed to update transaction');
  }
}

export async function deleteTransaction({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<Transaction | undefined> {
  try {
    const [deleted] = await db
      .delete(transaction)
      .where(and(eq(transaction.id, id), eq(transaction.userId, userId)))
      .returning();
    return deleted;
  } catch {
    throw databaseError('Failed to delete transaction');
  }
}

/**
 * Inserts a small, realistic data set once per user. Safe to call repeatedly:
 * users who already have transactions are left untouched.
 */
export async function seedSampleTransactions({
  userId,
}: {
  userId: string;
}): Promise<{ seeded: boolean; count: number }> {
  const existing = await getTransactions({ userId, limit: 1 });
  if (existing.length > 0) {
    return { seeded: false, count: 0 };
  }

  const samples = getSampleTransactions();

  try {
    await db.insert(transaction).values(
      samples.map((sample) => ({ ...sample, userId })),
    );
    return { seeded: true, count: samples.length };
  } catch {
    throw databaseError('Failed to seed sample transactions');
  }
}

export type UsageTotals = {
  costMicros: number;
  promptTokens: number;
  completionTokens: number;
  requests: number;
};

const emptyTotals: UsageTotals = {
  costMicros: 0,
  promptTokens: 0,
  completionTokens: 0,
  requests: 0,
};

export function startOfCurrentMonth(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function recordAiUsage({
  userId,
  chatId,
  model,
  promptTokens,
  completionTokens,
  costMicros,
}: {
  userId: string;
  chatId?: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costMicros: number;
}): Promise<void> {
  try {
    await db.insert(aiUsage).values({
      userId,
      chatId,
      model,
      promptTokens,
      completionTokens,
      costMicros,
    });
  } catch {
    // Usage tracking must never break a chat response.
    console.error('Failed to record AI usage');
  }
}

export async function getMonthlyUsage({
  userId,
}: {
  userId: string;
}): Promise<UsageTotals> {
  try {
    const rows = await db
      .select()
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.userId, userId),
          gte(aiUsage.createdAt, startOfCurrentMonth()),
        ),
      );

    return rows.reduce<UsageTotals>(
      (totals, row) => ({
        costMicros: totals.costMicros + row.costMicros,
        promptTokens: totals.promptTokens + row.promptTokens,
        completionTokens: totals.completionTokens + row.completionTokens,
        requests: totals.requests + 1,
      }),
      { ...emptyTotals },
    );
  } catch {
    throw databaseError('Failed to get monthly AI usage');
  }
}

export type EffectiveUsageLimit = typeof DEFAULT_GLOBAL_LIMIT & {
  source: 'user' | 'global';
  enabled: boolean;
};

export async function getUsageLimit({
  userId,
}: {
  userId: string;
}): Promise<EffectiveUsageLimit> {
  try {
    const [limit] = await db
      .select()
      .from(usageLimit)
      .where(eq(usageLimit.userId, userId))
      .limit(1);

    if (!limit) {
      return { ...DEFAULT_GLOBAL_LIMIT, source: 'global', enabled: true };
    }

    return {
      monthlyCostMicros: limit.monthlyCostMicros,
      monthlyTokenLimit: limit.monthlyTokenLimit,
      enabled: limit.enabled,
      source: 'user',
    };
  } catch {
    throw databaseError('Failed to get usage limit');
  }
}

export async function setUsageLimit({
  userId,
  monthlyCostMicros,
  monthlyTokenLimit,
  enabled,
}: {
  userId: string;
  monthlyCostMicros: number;
  monthlyTokenLimit: number;
  enabled: boolean;
}): Promise<void> {
  try {
    await db
      .insert(usageLimit)
      .values({ userId, monthlyCostMicros, monthlyTokenLimit, enabled })
      .onConflictDoUpdate({
        target: usageLimit.userId,
        set: { monthlyCostMicros, monthlyTokenLimit, enabled, updatedAt: new Date() },
      });
  } catch {
    throw databaseError('Failed to save usage limit');
  }
}

export type AdminUsageRow = {
  userId: string;
  email: string;
  costMicros: number;
  promptTokens: number;
  completionTokens: number;
  requests: number;
  monthlyCostMicros: number;
  monthlyTokenLimit: number;
  limitEnabled: boolean;
};

export type AdminDashboardData = {
  monthStart: string;
  totals: UsageTotals;
  byUser: Array<AdminUsageRow>;
  byModel: Array<{
    model: string;
    costMicros: number;
    promptTokens: number;
    completionTokens: number;
    requests: number;
  }>;
  byDay: Array<{ date: string; costMicros: number; requests: number }>;
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    const monthStart = startOfCurrentMonth();
    const rows = await db
      .select({
        userId: user.id,
        email: user.email,
        model: aiUsage.model,
        costMicros: aiUsage.costMicros,
        promptTokens: aiUsage.promptTokens,
        completionTokens: aiUsage.completionTokens,
        createdAt: aiUsage.createdAt,
        monthlyCostMicros: usageLimit.monthlyCostMicros,
        monthlyTokenLimit: usageLimit.monthlyTokenLimit,
        limitEnabled: usageLimit.enabled,
      })
      .from(aiUsage)
      .innerJoin(user, eq(user.id, aiUsage.userId))
      .leftJoin(usageLimit, eq(usageLimit.userId, user.id))
      .where(gte(aiUsage.createdAt, monthStart));

    const totals: UsageTotals = { ...emptyTotals };
    const users = new Map<string, AdminUsageRow>();
    const models = new Map<
      string,
      AdminDashboardData['byModel'][number]
    >();
    const days = new Map<string, { costMicros: number; requests: number }>();

    for (const row of rows) {
      const tokens = row.promptTokens + row.completionTokens;
      totals.costMicros += row.costMicros;
      totals.promptTokens += row.promptTokens;
      totals.completionTokens += row.completionTokens;
      totals.requests += 1;

      const existingUser = users.get(row.userId);
      const userRow: AdminUsageRow = existingUser ?? {
        userId: row.userId,
        email: row.email,
        costMicros: 0,
        promptTokens: 0,
        completionTokens: 0,
        requests: 0,
        monthlyCostMicros: row.monthlyCostMicros ?? DEFAULT_GLOBAL_LIMIT.monthlyCostMicros,
        monthlyTokenLimit: row.monthlyTokenLimit ?? DEFAULT_GLOBAL_LIMIT.monthlyTokenLimit,
        limitEnabled: row.limitEnabled ?? true,
      };
      userRow.costMicros += row.costMicros;
      userRow.promptTokens += row.promptTokens;
      userRow.completionTokens += row.completionTokens;
      userRow.requests += 1;
      users.set(row.userId, userRow);

      const modelRow = models.get(row.model) ?? {
        model: row.model,
        costMicros: 0,
        promptTokens: 0,
        completionTokens: 0,
        requests: 0,
      };
      modelRow.costMicros += row.costMicros;
      modelRow.promptTokens += row.promptTokens;
      modelRow.completionTokens += row.completionTokens;
      modelRow.requests += 1;
      models.set(row.model, modelRow);

      const day = row.createdAt.toISOString().slice(0, 10);
      const dayRow = days.get(day) ?? { costMicros: 0, requests: 0 };
      dayRow.costMicros += row.costMicros;
      dayRow.requests += 1;
      days.set(day, dayRow);
    }

    return {
      monthStart: monthStart.toISOString(),
      totals,
      byUser: [...users.values()].sort((a, b) => b.costMicros - a.costMicros),
      byModel: [...models.values()].sort((a, b) => b.costMicros - a.costMicros),
      byDay: [...days.entries()]
        .map(([date, values]) => ({ date, ...values }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  } catch {
    throw databaseError('Failed to load AI usage dashboard');
  }
}

export type AdminUser = {
  id: string;
  email: string;
  monthlyCostMicros: number;
  monthlyTokenLimit: number;
  enabled: boolean;
};

export async function getAdminUsers(): Promise<Array<AdminUser>> {
  try {
    const rows = await db
      .select({
        id: user.id,
        email: user.email,
        monthlyCostMicros: usageLimit.monthlyCostMicros,
        monthlyTokenLimit: usageLimit.monthlyTokenLimit,
        enabled: usageLimit.enabled,
      })
      .from(user)
      .leftJoin(usageLimit, eq(usageLimit.userId, user.id))
      .orderBy(user.email);

    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      monthlyCostMicros: row.monthlyCostMicros ?? DEFAULT_GLOBAL_LIMIT.monthlyCostMicros,
      monthlyTokenLimit: row.monthlyTokenLimit ?? DEFAULT_GLOBAL_LIMIT.monthlyTokenLimit,
      enabled: row.enabled ?? true,
    }));
  } catch {
    throw databaseError('Failed to load users');
  }
}
