import { z } from 'zod';

export const transactionTypeSchema = z.enum(['income', 'expense']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

/**
 * Client and API boundary: amounts are entered in major currency units
 * (dollars) and converted to integer cents for storage and reporting.
 */
export const transactionInputSchema = z.object({
  type: transactionTypeSchema,
  amount: z.coerce.number().positive().max(1_000_000_000),
  category: z.string().trim().min(1).max(64),
  description: z.string().trim().min(1).max(500),
  date: z.string().datetime().optional(),
});

export const transactionUpdateSchema = transactionInputSchema.partial();

export function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export const usageLimitSchema = z.object({
  userId: z.string().uuid(),
  monthlyCostMicros: z.number().int().positive().max(1_000_000_000),
  monthlyTokenLimit: z.number().int().positive().max(1_000_000_000),
  enabled: z.boolean(),
});

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function formatTransactionDate(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}
