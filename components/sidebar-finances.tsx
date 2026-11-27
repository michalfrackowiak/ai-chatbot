'use client';

import Link from 'next/link';
import useSWR from 'swr';

import { formatMoney, formatTransactionDate } from '@/lib/finance/validation';
import { TRANSACTIONS_KEY } from '@/lib/finance/client';
import { summarizeTransactions } from '@/lib/finance/summary-client';
import type { Transaction } from '@/lib/db/schema';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const fetcher = async (url: string): Promise<Array<Transaction>> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load transactions');
  return response.json();
};

export function SidebarFinances() {
  const { data: transactions } = useSWR<Array<Transaction>>(
    TRANSACTIONS_KEY,
    fetcher,
    { revalidateOnFocus: true },
  );

  const totals = summarizeTransactions(transactions ?? []);
  const recent = (transactions ?? []).slice(0, 3);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Finances</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/finance">
                <span>📊</span>
                <span className="flex-1">View all transactions</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {recent.length > 0 ? (
            <>
              <li className="px-2 py-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Balance</span>
                  <span
                    className={
                      totals.balanceCents >= 0
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }
                  >
                    {formatMoney(totals.balanceCents)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>In / Out</span>
                  <span>
                    {formatMoney(totals.incomeCents)} /{' '}
                    {formatMoney(totals.expenseCents)}
                  </span>
                </div>
              </li>
              {recent.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 px-2 py-1 text-xs"
                >
                  <span className="truncate">
                    {item.description}
                    <span className="block text-muted-foreground">
                      {formatTransactionDate(item.date)} · {item.category}
                    </span>
                  </span>
                  <span
                    className={
                      item.type === 'income'
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }
                  >
                    {item.type === 'income' ? '+' : '-'}
                    {formatMoney(item.amount)}
                  </span>
                </li>
              ))}
            </>
          ) : (
            <li className="px-2 py-1.5 text-xs text-muted-foreground">
              No entries yet. Ask the assistant to add one, or load samples in
              Finance.
            </li>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
