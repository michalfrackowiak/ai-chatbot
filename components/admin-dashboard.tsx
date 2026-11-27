'use client';

import { useState } from 'react';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMicros, microsToDollars } from '@/lib/transactions/money';
import { fetcher } from '@/lib/utils';

interface UsageLimits {
  maxMessagesPerDay: number;
  maxMonthlySpendMicros: number;
}

interface AdminUser {
  id: string;
  email: string;
  requestCount: number;
  allTimeSpendMicros: number;
  monthlySpendMicros: number;
  promptTokens: number;
  completionTokens: number;
  hasOverride: boolean;
  effectiveLimits: UsageLimits;
}

interface Summary {
  defaults: {
    maxMessagesPerDay: number | null;
    maxMonthlySpendMicros: number | null;
  } | null;
  users: Array<AdminUser>;
}

const fieldClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

function displayLimit(value: number): string {
  return value === -1 ? 'Unlimited' : String(value);
}

function displaySpendLimit(micros: number): string {
  return micros === -1 ? 'Unlimited' : formatMicros(micros);
}

export function AdminDashboard() {
  const { data, error, isLoading, mutate } = useSWR<Summary>(
    '/api/admin/summary',
    fetcher,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const saveLimits = async (
    event: React.FormEvent<HTMLFormElement>,
    userId: string | null,
  ) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const messages = String(formData.get('messages') ?? '').trim();
    const spend = String(formData.get('spend') ?? '').trim();

    try {
      const response = await fetch('/api/admin/limits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          maxMessagesPerDay: messages === '' ? null : Number(messages),
          maxMonthlySpendUsd: spend === '' ? null : Number(spend),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? 'Could not save limits.');
      }

      setMessage('Usage limits saved.');
      await mutate();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  };

  const clearOverride = async (userId: string) => {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/limits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          maxMessagesPerDay: null,
          maxMonthlySpendUsd: null,
        }),
      });

      if (!response.ok) throw new Error('Could not clear the override.');

      setMessage('Per-user override removed.');
      await mutate();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  };

  const globalDefaults = data?.defaults;
  const monthlyTotal =
    data?.users.reduce((total, account) => total + account.monthlySpendMicros, 0) ?? 0;
  const allTimeTotal =
    data?.users.reduce((total, account) => total + account.allTimeSpendMicros, 0) ?? 0;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Admin · AI usage</h1>
        <p className="text-sm text-muted-foreground">
          Spend is estimated from token usage and the rates in{' '}
          <code>lib/ai/pricing.ts</code>. Use <code>-1</code> for unlimited and
          leave a field blank to inherit the global default.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Spend this month</p>
          <p className="text-xl font-medium">{formatMicros(monthlyTotal)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">All-time spend</p>
          <p className="text-xl font-medium">{formatMicros(allTimeTotal)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Tracked users</p>
          <p className="text-xl font-medium">{data?.users.length ?? 0}</p>
        </div>
      </div>

      <form
        onSubmit={(event) => saveLimits(event, null)}
        className="grid gap-3 rounded-lg border p-4 sm:grid-cols-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="global-messages">Messages / day</Label>
          <Input
            id="global-messages"
            name="messages"
            type="number"
            min="-1"
            max={1_000_000}
            defaultValue={
              globalDefaults?.maxMessagesPerDay == null
                ? ''
                : globalDefaults.maxMessagesPerDay
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="global-spend">Monthly spend limit (USD)</Label>
          <Input
            id="global-spend"
            name="spend"
            type="number"
            min="-1"
            step="0.01"
            defaultValue={
              globalDefaults?.maxMonthlySpendMicros == null
                ? ''
                : globalDefaults.maxMonthlySpendMicros === -1
                  ? -1
                  : microsToDollars(globalDefaults.maxMonthlySpendMicros)
            }
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={busy}>
            Save global limits
          </Button>
        </div>
      </form>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {error && <p className="text-sm text-red-600">Failed to load usage.</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2 text-right">Requests</th>
              <th className="px-3 py-2 text-right">Tokens (in/out)</th>
              <th className="px-3 py-2 text-right">This month</th>
              <th className="px-3 py-2 text-right">All time</th>
              <th className="px-3 py-2">Effective limits</th>
              <th className="px-3 py-2">Per-user override</th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((account) => (
              <tr key={account.id} className="border-t align-top">
                <td className="px-3 py-2">
                  <div className="truncate">{account.email}</div>
                  {account.hasOverride && (
                    <span className="text-xs text-muted-foreground">
                      override active
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {account.requestCount}
                </td>
                <td className="px-3 py-2 text-right">
                  {account.promptTokens.toLocaleString()} /{' '}
                  {account.completionTokens.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatMicros(account.monthlySpendMicros)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatMicros(account.allTimeSpendMicros)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {displayLimit(account.effectiveLimits.maxMessagesPerDay)} msgs/day ·{' '}
                  {displaySpendLimit(
                    account.effectiveLimits.maxMonthlySpendMicros,
                  )}
                  /month
                </td>
                <td className="px-3 py-2">
                  <form
                    onSubmit={(event) => saveLimits(event, account.id)}
                    className="flex flex-wrap items-center gap-1"
                  >
                    <Input
                      name="messages"
                      type="number"
                      min="-1"
                      max={1_000_000}
                      placeholder="msgs"
                      aria-label={`Messages per day for ${account.email}`}
                      className={`${fieldClass} w-20`}
                    />
                    <Input
                      name="spend"
                      type="number"
                      min="-1"
                      step="0.01"
                      placeholder="USD/mo"
                      aria-label={`Monthly spend limit for ${account.email}`}
                      className={`${fieldClass} w-24`}
                    />
                    <Button type="submit" size="sm" disabled={busy}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => clearOverride(account.id)}
                    >
                      Clear
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
