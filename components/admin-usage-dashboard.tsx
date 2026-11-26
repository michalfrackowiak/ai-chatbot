'use client';

import { useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { AI_MODEL_PRICING } from '@/lib/ai/costs';
import { fetcher } from '@/lib/utils';

type UsageRow = {
  id?: string;
  model?: string;
  email?: string;
  monthlyLimitUsd?: number;
  adminLimitUsd?: number | null;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

type AdminUsage = {
  models: UsageRow[];
  users: UsageRow[];
};

const money = (amount: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 4,
  }).format(amount);

export function AdminUsageDashboard() {
  const { data, error, isLoading, mutate } = useSWR<AdminUsage>(
    '/api/admin/usage',
    fetcher,
  );
  const totalCost =
    data?.models.reduce((sum, row) => sum + row.costUsd, 0) ?? 0;
  const totalRequests =
    data?.models.reduce((sum, row) => sum + row.requests, 0) ?? 0;
  const totalTokens =
    data?.models.reduce(
      (sum, row) => sum + row.inputTokens + row.outputTokens,
      0,
    ) ?? 0;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-5 py-8 md:px-8">
      <header>
        <p className="text-sm text-muted-foreground">Current month</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          AI usage admin
        </h1>
      </header>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          Could not load AI usage. Check that this account is configured as an
          admin.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Estimated model spend" value={money(totalCost)} />
        <SummaryCard label="Requests" value={totalRequests.toLocaleString()} />
        <SummaryCard
          label="Input + output tokens"
          value={totalTokens.toLocaleString()}
        />
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Spend by model</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Estimated from token usage with the listed xAI rates. Verify current
          provider pricing before budgeting.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading usage…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Model</th>
                  <th className="py-2 font-medium">Requests</th>
                  <th className="py-2 font-medium">Input tokens</th>
                  <th className="py-2 font-medium">Output tokens</th>
                  <th className="py-2 text-right font-medium">
                    Estimated spend
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.models ?? []).map((row) => (
                  <tr key={row.model}>
                    <td className="py-3">
                      {row.model}{' '}
                      <span className="text-xs text-muted-foreground">
                        (
                        {AI_MODEL_PRICING[
                          row.model as keyof typeof AI_MODEL_PRICING
                        ]?.providerModel ?? 'model rate unavailable'}
                        )
                      </span>
                    </td>
                    <td className="py-3">{row.requests}</td>
                    <td className="py-3">{row.inputTokens.toLocaleString()}</td>
                    <td className="py-3">
                      {row.outputTokens.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">{money(row.costUsd)}</td>
                  </tr>
                ))}
                {!data?.models.length && (
                  <tr>
                    <td className="py-4 text-muted-foreground" colSpan={5}>
                      No model usage recorded this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Spend by account</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-2 font-medium">Account</th>
                <th className="py-2 font-medium">Requests</th>
                <th className="py-2 font-medium">Tokens</th>
                <th className="py-2 font-medium">Admin cap / month</th>
                <th className="py-2 text-right font-medium">Estimated spend</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.users ?? []).map((row) => (
                <AccountLimitRow
                  key={row.id}
                  row={row}
                  onSaved={() => mutate()}
                />
              ))}
              {!data?.users.length && (
                <tr>
                  <td className="py-4 text-muted-foreground" colSpan={5}>
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Hosting, database, storage, network, and image-generation charges are
        billed separately and are not included here. Token estimates use $2/$10
        per million input/output tokens for Grok 2 and $0.30/$0.50 for Grok 3
        Mini.
      </p>
    </main>
  );
}

function AccountLimitRow({
  row,
  onSaved,
}: {
  row: UsageRow;
  onSaved: () => void;
}) {
  const [limit, setLimit] = useState(
    row.adminLimitUsd === null || row.adminLimitUsd === undefined
      ? ''
      : String(row.adminLimitUsd),
  );
  const [message, setMessage] = useState('');

  async function saveLimit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await fetch('/api/admin/usage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: row.id,
          adminLimitUsd: limit === '' ? null : Number(limit),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? 'Could not save limit.');
        return;
      }
      setMessage('Saved');
      onSaved();
    } catch {
      setMessage('Could not reach the server to save this cap.');
    }
  }

  return (
    <tr>
      <td className="py-3">{row.email}</td>
      <td className="py-3">{row.requests}</td>
      <td className="py-3">
        {(row.inputTokens + row.outputTokens).toLocaleString()}
      </td>
      <td className="py-2">
        <form className="flex items-center gap-2" onSubmit={saveLimit}>
          <label className="sr-only" htmlFor={`limit-${row.id}`}>
            Admin monthly cap for {row.email}
          </label>
          <input
            id={`limit-${row.id}`}
            aria-label={`Admin monthly AI cap for ${row.email}`}
            className="h-8 w-24 rounded-md border bg-background px-2"
            type="number"
            min="0"
            max="10000"
            step="0.01"
            placeholder="No cap"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
          />
          <button
            className="text-xs font-medium text-primary hover:underline"
            type="submit"
          >
            Set cap
          </button>
          <span
            className={message ? 'text-xs text-muted-foreground' : 'sr-only'}
            role="status"
          >
            {message}
          </span>
        </form>
      </td>
      <td className="py-3 text-right">{money(row.costUsd)}</td>
    </tr>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
