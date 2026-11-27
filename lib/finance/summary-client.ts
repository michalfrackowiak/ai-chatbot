import type { Transaction } from '@/lib/db/schema';

export type TransactionTotals = {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  count: number;
};

export function summarizeTransactions(
  transactions: Array<Pick<Transaction, 'type' | 'amount'>>,
): TransactionTotals {
  const incomeCents = transactions
    .filter((item) => item.type === 'income')
    .reduce((total, item) => total + item.amount, 0);
  const expenseCents = transactions
    .filter((item) => item.type === 'expense')
    .reduce((total, item) => total + item.amount, 0);

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    count: transactions.length,
  };
}
