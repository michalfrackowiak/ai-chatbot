import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;

export const transaction = pgTable(
  'Transaction',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    type: varchar('type', { enum: ['income', 'expense'] }).notNull(),
    // Minor units (cents) to avoid floating point rounding in money math.
    amount: integer('amount').notNull(),
    category: varchar('category', { length: 64 }).notNull(),
    description: text('description').notNull(),
    occurredAt: timestamp('occurredAt').notNull().defaultNow(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    source: varchar('source', { enum: ['manual', 'chat', 'seed'] })
      .notNull()
      .default('manual'),
  },
  (table) => ({
    userDateIdx: index('Transaction_userId_occurredAt_idx').on(
      table.userId,
      table.occurredAt,
    ),
  }),
);

export type Transaction = InferSelectModel<typeof transaction>;

export const aiUsage = pgTable(
  'AiUsage',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    chatId: uuid('chatId').references(() => chat.id),
    model: varchar('model', { length: 64 }).notNull(),
    promptTokens: integer('promptTokens').notNull().default(0),
    completionTokens: integer('completionTokens').notNull().default(0),
    // USD encoded as millionths so integer math stays exact.
    costMicros: integer('costMicros').notNull().default(0),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    userDateIdx: index('AiUsage_userId_createdAt_idx').on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export type AiUsage = InferSelectModel<typeof aiUsage>;

export const usageLimit = pgTable('UsageLimit', {
  userId: uuid('userId')
    .primaryKey()
    .notNull()
    .references(() => user.id),
  maxMessagesPerDay: integer('maxMessagesPerDay'),
  maxMonthlySpendMicros: integer('maxMonthlySpendMicros'),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type UsageLimit = InferSelectModel<typeof usageLimit>;

export const appSetting = pgTable('AppSetting', {
  key: varchar('key', { length: 64 }).primaryKey().notNull(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type AppSetting = InferSelectModel<typeof appSetting>;
