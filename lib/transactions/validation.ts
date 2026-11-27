import { z } from 'zod';

export const transactionInputSchema = z
  .object({
    type: z.enum(['income', 'expense']),
    amount: z
      .number()
      .positive('Amount must be greater than zero')
      .max(1_000_000_000, 'Amount is too large')
      .refine(
        (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
        'Amount can have at most two decimal places',
      ),
    category: z.string().trim().min(1).max(64),
    description: z.string().trim().min(1).max(500),
    occurredAt: z.string().datetime().optional(),
  })
  .strict();

export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const transactionUpdateSchema = transactionInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>;

export const transactionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  type: z.enum(['income', 'expense']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}
