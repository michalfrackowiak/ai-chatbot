'use client';

import { formatMoney } from '@/lib/finance/validation';

const labels: Record<string, string> = {
  addTransaction: 'Added transaction',
  editTransaction: 'Updated transaction',
  removeTransaction: 'Deleted transaction',
  listTransactions: 'Checked your finances',
};

export function TransactionToolCall({
  toolName,
  args,
  result,
}: {
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
}) {
  const label = labels[toolName] ?? 'Finance update';

  const details = (() => {
    if (typeof args?.amount === 'number') {
      return `${formatMoney(Math.round(args.amount * 100))} · ${
        args.category ?? 'Uncategorized'
      }`;
    }
    if (typeof result === 'string' && result.length > 0) {
      return result.length > 90 ? `${result.slice(0, 90)}…` : result;
    }
    return 'Your finance list is in sync.';
  })();

  return (
    <div className="not-prose mt-2 flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
      <span className="size-2 rounded-full bg-emerald-500" />
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground truncate">{details}</span>
    </div>
  );
}
