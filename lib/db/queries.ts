import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
  sum,
  sql,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  financeTransaction,
  userAiSettings,
  aiUsage,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';
import { DEFAULT_MONTHLY_AI_LIMIT_USD } from '@/lib/ai/costs';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create guest user',
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

export async function getFinanceTransactions({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(financeTransaction)
      .where(eq(financeTransaction.userId, userId))
      .orderBy(
        desc(financeTransaction.occurredAt),
        desc(financeTransaction.createdAt),
      );
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get finance transactions',
    );
  }
}

export async function createFinanceTransaction({
  userId,
  kind,
  amount,
  description,
  category,
  occurredAt,
}: {
  userId: string;
  kind: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  occurredAt: Date;
}) {
  try {
    const [created] = await db
      .insert(financeTransaction)
      .values({
        userId,
        kind,
        amount: amount.toFixed(2),
        description,
        category,
        occurredAt,
      })
      .returning();

    return created;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create finance transaction',
    );
  }
}

export async function deleteFinanceTransaction({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [deleted] = await db
      .delete(financeTransaction)
      .where(
        and(
          eq(financeTransaction.id, id),
          eq(financeTransaction.userId, userId),
        ),
      )
      .returning();

    return deleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete finance transaction',
    );
  }
}

export async function getUserAiSettings({ userId }: { userId: string }) {
  try {
    const [settings] = await db
      .select()
      .from(userAiSettings)
      .where(eq(userAiSettings.userId, userId));

    if (settings) return settings;

    const [created] = await db
      .insert(userAiSettings)
      .values({ userId })
      .onConflictDoNothing()
      .returning();

    if (created) return created;

    const [existing] = await db
      .select()
      .from(userAiSettings)
      .where(eq(userAiSettings.userId, userId));

    if (!existing) throw new Error('Failed to initialize AI settings');
    return existing;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get AI settings');
  }
}

export async function setUserAiLimit({
  userId,
  monthlyLimitUsd,
}: {
  userId: string;
  monthlyLimitUsd: number;
}) {
  try {
    const [settings] = await db
      .insert(userAiSettings)
      .values({ userId, monthlyLimitUsd: monthlyLimitUsd.toFixed(2) })
      .onConflictDoUpdate({
        target: userAiSettings.userId,
        set: {
          monthlyLimitUsd: monthlyLimitUsd.toFixed(2),
          updatedAt: new Date(),
        },
      })
      .returning();

    return settings;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update AI usage limit',
    );
  }
}

export async function setAdminAiLimit({
  userId,
  adminLimitUsd,
}: {
  userId: string;
  adminLimitUsd: number | null;
}) {
  try {
    const [settings] = await db
      .insert(userAiSettings)
      .values({
        userId,
        adminLimitUsd: adminLimitUsd?.toFixed(2) ?? null,
      })
      .onConflictDoUpdate({
        target: userAiSettings.userId,
        set: {
          adminLimitUsd: adminLimitUsd?.toFixed(2) ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return settings;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update admin AI usage limit',
    );
  }
}

export async function getMonthlyAiSpend({
  userId,
  monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1),
}: {
  userId: string;
  monthStart?: Date;
}) {
  try {
    const [result] = await db
      .select({ amount: sum(aiUsage.costUsd) })
      .from(aiUsage)
      .where(
        and(eq(aiUsage.userId, userId), gte(aiUsage.createdAt, monthStart)),
      );

    return Number(result?.amount ?? 0);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get AI spend');
  }
}

export async function recordAiUsage({
  userId,
  model,
  inputTokens,
  outputTokens,
  costUsd,
}: {
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}) {
  try {
    await db.insert(aiUsage).values({
      userId,
      model,
      inputTokens,
      outputTokens,
      costUsd: costUsd.toFixed(6),
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to record AI usage');
  }
}

export async function getAdminAiUsage({
  monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1),
}: {
  monthStart?: Date;
} = {}) {
  try {
    const usage = await db
      .select({
        model: aiUsage.model,
        requests: count(aiUsage.id),
        inputTokens: sum(aiUsage.inputTokens),
        outputTokens: sum(aiUsage.outputTokens),
        costUsd: sum(aiUsage.costUsd),
      })
      .from(aiUsage)
      .where(gte(aiUsage.createdAt, monthStart))
      .groupBy(aiUsage.model);

    const accounts = await db
      .select({
        id: user.id,
        email: user.email,
        monthlyLimitUsd: userAiSettings.monthlyLimitUsd,
        adminLimitUsd: userAiSettings.adminLimitUsd,
        requests: count(aiUsage.id),
        inputTokens: sum(aiUsage.inputTokens),
        outputTokens: sum(aiUsage.outputTokens),
        costUsd: sum(aiUsage.costUsd),
      })
      .from(user)
      .leftJoin(
        aiUsage,
        and(eq(aiUsage.userId, user.id), gte(aiUsage.createdAt, monthStart)),
      )
      .leftJoin(userAiSettings, eq(userAiSettings.userId, user.id))
      .groupBy(
        user.id,
        user.email,
        userAiSettings.monthlyLimitUsd,
        userAiSettings.adminLimitUsd,
      )
      .orderBy(desc(sql`coalesce(sum(${aiUsage.costUsd}), 0)`));

    return {
      models: usage.map((row) => ({
        ...row,
        inputTokens: Number(row.inputTokens ?? 0),
        outputTokens: Number(row.outputTokens ?? 0),
        costUsd: Number(row.costUsd ?? 0),
      })),
      users: accounts.map((row) => ({
        ...row,
        monthlyLimitUsd: Number(
          row.monthlyLimitUsd ?? DEFAULT_MONTHLY_AI_LIMIT_USD,
        ),
        adminLimitUsd:
          row.adminLimitUsd === null ? null : Number(row.adminLimitUsd),
        inputTokens: Number(row.inputTokens ?? 0),
        outputTokens: Number(row.outputTokens ?? 0),
        costUsd: Number(row.costUsd ?? 0),
      })),
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get admin AI usage',
    );
  }
}
