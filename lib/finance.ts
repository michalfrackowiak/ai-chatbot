import { z } from 'zod';

const currencies = [
  'USD',
  'EUR',
  'PLN',
  'GBP',
  'CAD',
  'AUD',
  'CHF',
  'JPY',
] as const;
export { currencies };
export const ledgerUrl = '/api/ledger';

function minorUnits(currency: string) {
  return currency === 'JPY' ? 1 : 100;
}

export const entryFields = z.object({
  kind: z.enum(['income', 'expense']),
  amount: z.number().positive().max(20_000_000),
  currency: z.enum(currencies),
  description: z.string().trim().min(1).max(160),
  date: z.string().date(),
});

export const entryInput = entryFields.refine(
  ({ amount, currency }) => {
    const scaled = amount * minorUnits(currency);
    const rounded = Math.round(scaled);
    return rounded > 0 && Math.abs(scaled - rounded) < 0.000001;
  },
  { message: 'Use valid decimal precision for the currency', path: ['amount'] },
);

export type EntryInput = z.infer<typeof entryInput>;

export function entryValues({ amount, currency, ...rest }: EntryInput) {
  return {
    ...rest,
    currency,
    amountMinor: Math.round(amount * minorUnits(currency)),
  };
}

export function amountValue(amount: number, currency: string) {
  return amount / minorUnits(currency);
}

export function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
  }).format(amountValue(amount, currency));
}

export const ledgerCommand = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list') }),
  z.object({ action: z.literal('add'), entry: entryInput }),
  z.object({
    action: z.literal('update'),
    id: z.string().uuid(),
    entry: entryInput,
  }),
  z.object({ action: z.literal('delete'), id: z.string().uuid() }),
  z.object({ action: z.literal('sample') }),
]);

export function totalsByCurrency(
  entries: { kind: string; amountMinor: number; currency: string }[],
) {
  const totals = new Map<string, { income: number; expense: number }>();
  for (const { kind, amountMinor, currency } of entries) {
    const total = totals.get(currency) ?? { income: 0, expense: 0 };
    if (kind === 'income') total.income += amountMinor;
    else total.expense += amountMinor;
    totals.set(currency, total);
  }
  return totals;
}
