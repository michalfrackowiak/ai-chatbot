'use client';

import Link from 'next/link';
import useSWR from 'swr';

import { formatMoney } from '@/lib/transactions/money';
import type { SerializedTransaction } from '@/lib/transactions/types';
import { fetcher } from '@/lib/utils';
import { useSidebar } from './ui/sidebar';

interface TransactionsResponse {
  transactions: Array<SerializedTransaction>;
  totals: { incomeCents: number; expenseCents: number; netCents: number };
}

export function TransactionSummary() {
  const { open } = useSidebar();
  const { data } = useSWR<TransactionsResponse>(
    '/api/transactions?limit=5',
    fetcher,
  );

  if (!open || !data) return null;

  return (
    <div className="p-2 text-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-muted-foreground">This month</span>
        <Link href="/transactions" className="hover:underline">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-1 mb-2">
        <div className="rounded-md bg-muted p-1.5">
          <div className="text-muted-foreground">In</div>
          <div className="font-medium">{formatMoney(data.totals.incomeCents)}</div>
        </div>
        <div className="rounded-md bg-muted p-1.5">
          <div className="text-muted-foreground">Out</div>
          <div className="font-medium">{formatMoney(data.totals.expenseCents)}</div>
        </div>
        <div className="rounded-md bg-muted p-1.5">
          <div className="text-muted-foreground">Net</div>
          <div className="font-medium">{formatMoney(data.totals.netCents)}</div>
        </div>
      </div>
      {data.transactions.length > 0 ? (
        <ul className="space-y-1">
          {data.transactions.slice(0, 3).map((item) => (
            <li key={item.id} className="flex justify-between gap-2 truncate">
              <span className="truncate">{item.description}</span>
              <span className={item.type === 'income' ? 'text-green-600' : ''}>
                {item.type === 'income' ? '+' : '-'}
                {formatMoney(item.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          No transactions yet. Ask the assistant to add one.
        </p>
      )}
    </div>
  );
}
