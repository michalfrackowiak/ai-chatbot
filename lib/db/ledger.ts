import 'server-only';
import { createHash } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import type { z } from 'zod';
import { entryValues, type ledgerCommand } from '@/lib/finance';
import { db } from './queries';
import { chat, ledgerEntry } from './schema';

export async function protectLedgerChat(userId: string, chatId: string) {
  const [locked] = await db
    .update(chat)
    .set({ containsLedgerData: true })
    .where(
      and(
        eq(chat.id, chatId),
        eq(chat.userId, userId),
        eq(chat.visibility, 'private'),
      ),
    )
    .returning({ id: chat.id });
  return !!locked;
}

export function listEntries(userId: string) {
  return db
    .select()
    .from(ledgerEntry)
    .where(eq(ledgerEntry.userId, userId))
    .orderBy(desc(ledgerEntry.date), desc(ledgerEntry.id));
}

const samples = [
  { kind: 'income', description: 'Sample salary', amountMinor: 320000 },
  { kind: 'expense', description: 'Sample rent', amountMinor: 105000 },
  { kind: 'expense', description: 'Sample groceries', amountMinor: 8450 },
  { kind: 'expense', description: 'Sample transport', amountMinor: 3900 },
] as const;

export async function applyLedgerCommand(
  userId: string,
  command: z.infer<typeof ledgerCommand>,
) {
  switch (command.action) {
    case 'list':
      return { entries: await listEntries(userId) };
    case 'add': {
      const [entry] = await db
        .insert(ledgerEntry)
        .values({ userId, ...entryValues(command.entry) })
        .returning();
      return { entry };
    }
    case 'sample': {
      const entries = await db
        .insert(ledgerEntry)
        .values(
          samples.map((sample, index) => {
            const id = createHash('sha256')
              .update(`ledger-sample:${userId}:${index}`)
              .digest('hex')
              .slice(0, 32);
            const date = new Date();
            date.setUTCDate(date.getUTCDate() - index);
            return {
              ...sample,
              id,
              userId,
              currency: 'USD',
              date: date.toISOString().slice(0, 10),
            };
          }),
        )
        .onConflictDoNothing()
        .returning();
      return { added: entries.length };
    }
    case 'update':
    case 'delete': {
      const ownerAndId = and(
        eq(ledgerEntry.userId, userId),
        eq(ledgerEntry.id, command.id),
      );
      const [entry] =
        command.action === 'update'
          ? await db
              .update(ledgerEntry)
              .set(entryValues(command.entry))
              .where(ownerAndId)
              .returning()
          : await db.delete(ledgerEntry).where(ownerAndId).returning();
      return entry ? { entry } : { error: 'Entry not found' };
    }
  }
}
