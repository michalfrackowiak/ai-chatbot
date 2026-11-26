'use client';

import { useEffect, useState, type FormEvent } from 'react';
import useSWR from 'swr';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Printer,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/utils';

type Transaction = {
  id: string;
  kind: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  occurredAt: string;
};

type TransactionResponse = {
  transactions: Transaction[];
  totals: {
    income: number;
    expenses: number;
    balance: number;
    monthIncome: number;
    monthExpenses: number;
    monthBalance: number;
  };
};

type AiUsage = {
  monthlyLimitUsd: number;
  personalLimitUsd: number;
  adminLimitUsd: number | null;
  monthToDateUsd: number;
};

const money = (amount: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

export function ExpensesDashboard() {
  const { data, error, isLoading, mutate } = useSWR<TransactionResponse>(
    '/api/transactions',
    fetcher,
  );
  const { data: aiUsage, mutate: mutateAiUsage } = useSWR<AiUsage>(
    '/api/ai-usage',
    fetcher,
  );
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [limit, setLimit] = useState('');

  useEffect(() => {
    if (aiUsage) setLimit(aiUsage.personalLimitUsd.toFixed(2));
  }, [aiUsage]);

  useEffect(() => {
    const refresh = () => {
      void mutate();
    };
    const channel = new BroadcastChannel('finance-transactions');
    channel.addEventListener('message', refresh);
    window.addEventListener('finance:transaction-updated', refresh);
    return () => {
      channel.removeEventListener('message', refresh);
      channel.close();
      window.removeEventListener('finance:transaction-updated', refresh);
    };
  }, [mutate]);

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: formData.get('kind'),
          amount: Number(formData.get('amount')),
          description: formData.get('description'),
          category: formData.get('category'),
          occurredAt: new Date(
            `${formData.get('occurredAt')}T12:00:00.000Z`,
          ).toISOString(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? 'Could not save this transaction.');
        return;
      }

      form.reset();
      setMessage('Transaction added.');
      await mutate();
    } catch {
      setMessage('Could not reach the server to save this transaction.');
    } finally {
      setSaving(false);
    }
  }

  async function addSamples() {
    try {
      const response = await fetch('/api/transactions/sample', {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? 'Could not add sample data.');
        return;
      }
      setMessage('Sample transactions added.');
      await mutate();
    } catch {
      setMessage('Could not reach the server to add sample data.');
    }
  }

  async function removeTransaction(id: string) {
    try {
      const response = await fetch(
        `/api/transactions?id=${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
        },
      );
      if (response.ok) await mutate();
      else setMessage('Could not delete this transaction.');
    } catch {
      setMessage('Could not reach the server to delete this transaction.');
    }
  }

  async function updateLimit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await fetch('/api/ai-usage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyLimitUsd: Number(limit) }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? 'Could not update the AI usage limit.');
        return;
      }
      setMessage('Monthly AI usage limit updated.');
      await mutateAiUsage();
    } catch {
      setMessage('Could not reach the server to update the AI usage limit.');
    }
  }

  const totals = data?.totals;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-5 py-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Your money, at a glance
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Income &amp; expenses
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted"
            href="/api/reports"
          >
            <Download className="size-4" /> Download HTML
          </a>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              window.open(
                '/api/reports?format=print',
                '_blank',
                'noopener,noreferrer',
              )
            }
          >
            <Printer className="size-4" /> Print / Save PDF
          </Button>
        </div>
      </header>

      {message && (
        <p
          role="status"
          className="rounded-md border bg-muted/40 px-4 py-3 text-sm"
        >
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          Could not load your transactions.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total income"
          value={money(totals?.income ?? 0)}
          icon={<ArrowUpRight className="size-4 text-emerald-600" />}
        />
        <SummaryCard
          label="Total expenses"
          value={money(totals?.expenses ?? 0)}
          icon={<ArrowDownRight className="size-4 text-rose-600" />}
        />
        <SummaryCard label="Net balance" value={money(totals?.balance ?? 0)} />
        <SummaryCard
          label="This month"
          value={money(totals?.monthBalance ?? 0)}
          detail={`Income ${money(totals?.monthIncome ?? 0)} · Spent ${money(totals?.monthExpenses ?? 0)}`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Recent transactions</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Add items here or tell the assistant, for example “Add $24 for lunch
            as an expense.”
          </p>
          {isLoading ? (
            <p className="py-8 text-sm text-muted-foreground">
              Loading your ledger…
            </p>
          ) : !data?.transactions.length ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="mb-3 text-sm text-muted-foreground">
                Your ledger is empty. Add a few examples to explore the
                dashboard.
              </p>
              <Button type="button" variant="outline" onClick={addSamples}>
                Add sample data
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {data.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.category} ·{' '}
                      {new Date(transaction.occurredAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={
                        transaction.kind === 'income'
                          ? 'font-medium text-emerald-700'
                          : 'font-medium text-rose-700'
                      }
                    >
                      {transaction.kind === 'income' ? '+' : '−'}
                      {money(transaction.amount)}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${transaction.description}`}
                      onClick={() => void removeTransaction(transaction.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-lg font-semibold">Add transaction</h2>
            <form className="mt-4 space-y-3" onSubmit={addTransaction}>
              <label className="block text-sm">
                Type
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                  name="kind"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>
              <label className="block text-sm">
                Description
                <input
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                  name="description"
                  required
                  maxLength={200}
                  placeholder="Coffee with a friend"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  Amount (USD)
                  <input
                    className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </label>
                <label className="block text-sm">
                  Category
                  <input
                    className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                    name="category"
                    required
                    maxLength={64}
                    defaultValue="Other"
                  />
                </label>
              </div>
              <label className="block text-sm">
                Date
                <input
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                  name="occurredAt"
                  type="date"
                  required
                  defaultValue={format(new Date(), 'yyyy-MM-dd')}
                />
              </label>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Saving…' : 'Add transaction'}
              </Button>
            </form>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-lg font-semibold">AI usage limit</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Estimated this month: {money(aiUsage?.monthToDateUsd ?? 0)}
              {aiUsage && ` of ${money(aiUsage.monthlyLimitUsd)}`}
            </p>
            <form className="mt-4 flex gap-2" onSubmit={updateLimit}>
              <label className="sr-only" htmlFor="monthly-limit">
                Monthly limit in USD
              </label>
              <input
                id="monthly-limit"
                className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3"
                type="number"
                min="0"
                max="10000"
                step="0.01"
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                required
              />
              <Button type="submit" variant="outline">
                Save limit
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              {aiUsage?.adminLimitUsd !== null &&
              aiUsage?.adminLimitUsd !== undefined
                ? `Your personal limit can be lower than the admin cap of ${money(aiUsage.adminLimitUsd)}.`
                : 'No admin cap is set; your personal budget controls usage.'}{' '}
              At the effective limit, new AI chat requests are paused until the
              next month or the limit is raised. Spend is estimated from model
              token usage.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label}
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
