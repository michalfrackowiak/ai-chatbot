import 'server-only';
import { count, eq, gte, sql } from 'drizzle-orm';
import { getMessageByErrorCode } from '@/lib/errors';
import { db } from './queries';
import { aiCall, aiSettings } from './schema';

export class AiUsageLimitError extends Error {
  constructor() {
    super(getMessageByErrorCode('rate_limit:ai'));
  }
}

function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

const settingsRow = eq(aiSettings.id, 1);
const spend = sql<number>`coalesce(sum(${aiCall.costMicros}), 0)`.mapWith(
  Number,
);

export async function beginAiCall(model: string) {
  return db.transaction(async (tx) => {
    await tx.insert(aiSettings).values({ id: 1 }).onConflictDoNothing();
    const [settings] = await tx
      .select()
      .from(aiSettings)
      .where(settingsRow)
      .for('update');
    const createdAt = new Date();
    if (
      settings.monthlyLimit !== null ||
      settings.monthlyBudgetMicros !== null
    ) {
      const [totals] = await tx
        .select({ calls: count(), cost: spend })
        .from(aiCall)
        .where(gte(aiCall.createdAt, monthStart(createdAt)));
      if (
        (settings.monthlyLimit !== null &&
          totals.calls >= settings.monthlyLimit) ||
        (settings.monthlyBudgetMicros !== null &&
          totals.cost >= settings.monthlyBudgetMicros)
      ) {
        throw new AiUsageLimitError();
      }
    }
    const [call] = await tx
      .insert(aiCall)
      .values({ model, createdAt })
      .returning({ id: aiCall.id });
    return call.id;
  });
}

export async function finishAiCall(
  id: string,
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    imageCount?: number;
    costMicros: number;
  },
) {
  await db.update(aiCall).set(usage).where(eq(aiCall.id, id));
}

export async function updateUsageSettings(
  monthlyLimit: number | null,
  monthlyBudgetMicros: number | null,
) {
  const limits = { monthlyLimit, monthlyBudgetMicros };
  await db
    .insert(aiSettings)
    .values({ id: 1, ...limits })
    .onConflictDoUpdate({ target: aiSettings.id, set: limits });
}

export async function readUsage() {
  const start = monthStart();
  const [[settings], models] = await Promise.all([
    db.select().from(aiSettings).where(settingsRow),
    db
      .select({
        model: aiCall.model,
        calls: count(),
        cost: spend,
        input: sql<number>`coalesce(sum(${aiCall.inputTokens}), 0)`.mapWith(
          Number,
        ),
        output: sql<number>`coalesce(sum(${aiCall.outputTokens}), 0)`.mapWith(
          Number,
        ),
        images: sql<number>`coalesce(sum(${aiCall.imageCount}), 0)`.mapWith(
          Number,
        ),
        unmetered:
          sql<number>`count(*) filter (where ${aiCall.costMicros} is null)`.mapWith(
            Number,
          ),
      })
      .from(aiCall)
      .where(gte(aiCall.createdAt, start))
      .groupBy(aiCall.model)
      .orderBy(aiCall.model),
  ]);
  return { settings, models, month: start.toISOString().slice(0, 7) };
}
