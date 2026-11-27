'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateCostMicros, formatUsd } from '@/lib/ai/pricing';
import type { AdminDashboardData, AdminUser } from '@/lib/db/finance-queries';
import type { ModelPricing } from '@/lib/ai/pricing';

type Props = {
  data: AdminDashboardData;
  users: Array<AdminUser>;
  pricing: Record<string, ModelPricing>;
  adminEmail: string;
};

export function AdminDashboard({ data, users: initialUsers, pricing, adminEmail }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [drafts, setDrafts] = useState<
    Record<string, { dollars: string; tokens: string; enabled: boolean }>
  >({});
  const [selectedModel, setSelectedModel] = useState(Object.keys(pricing)[0] ?? '');
  const [messages, setMessages] = useState(1000);
  const [promptTokens, setPromptTokens] = useState(1500);
  const [completionTokens, setCompletionTokens] = useState(500);

  const draftFor = (user: AdminUser) =>
    drafts[user.id] ?? {
      dollars: String(user.monthlyCostMicros / 1_000_000),
      tokens: String(user.monthlyTokenLimit),
      enabled: user.enabled,
    };

  const saveLimit = async (userId: string) => {
    const user = users.find((candidate) => candidate.id === userId);

    if (!user) {
      return;
    }

    const draft = draftFor(user);
    const response = await fetch('/api/admin/limits', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        monthlyCostMicros: Math.round(Number(draft.dollars) * 1_000_000),
        monthlyTokenLimit: Math.round(Number(draft.tokens)),
        enabled: draft.enabled,
      }),
    });

    if (!response.ok) {
      toast.error('Could not save usage limit');
      return;
    }

    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              monthlyCostMicros: Math.round(Number(draft.dollars) * 1_000_000),
              monthlyTokenLimit: Math.round(Number(draft.tokens)),
              enabled: draft.enabled,
            }
          : user,
      ),
    );
    toast.success('Usage limit saved');
  };

  const estimatedCostMicros =
    calculateCostMicros({
      model: selectedModel,
      promptTokens,
      completionTokens,
    }) * messages;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Admin · AI spend</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {adminEmail}. Set ADMIN_EMAILS to grant access.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">← Back to chat</Link>
        </Button>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
          This month ({data.monthStart.slice(0, 10)} → now)
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border p-4">
            <p className="text-xs uppercase text-muted-foreground">AI cost</p>
            <p className="text-xl font-semibold">
              {formatUsd(data.totals.costMicros, 4)}
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-xs uppercase text-muted-foreground">Tokens</p>
            <p className="text-xl font-semibold">
              {(
                data.totals.promptTokens + data.totals.completionTokens
              ).toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-xs uppercase text-muted-foreground">Requests</p>
            <p className="text-xl font-semibold">{data.totals.requests}</p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-xs uppercase text-muted-foreground">
              Avg / request
            </p>
            <p className="text-xl font-semibold">
              {formatUsd(
                data.totals.requests
                  ? Math.round(data.totals.costMicros / data.totals.requests)
                  : 0,
                4,
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h2 className="mb-3 text-sm font-semibold">Spend by model</h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 text-left">Model</th>
                <th className="py-2 text-right">Requests</th>
                <th className="py-2 text-right">Tokens</th>
                <th className="py-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.byModel.map((row) => (
                <tr key={row.model} className="border-t">
                  <td className="py-2 font-mono text-xs">{row.model}</td>
                  <td className="py-2 text-right">{row.requests}</td>
                  <td className="py-2 text-right">
                    {(row.promptTokens + row.completionTokens).toLocaleString()}
                  </td>
                  <td className="py-2 text-right">
                    {formatUsd(row.costMicros, 4)}
                  </td>
                </tr>
              ))}
              {data.byModel.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    No AI requests recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border p-4">
          <h2 className="mb-3 text-sm font-semibold">Daily spend</h2>
          <div className="space-y-1.5">
            {data.byDay.slice(-14).map((day) => (
              <div key={day.date} className="flex items-center gap-2 text-xs">
                <span className="w-20 font-mono text-muted-foreground">
                  {day.date.slice(5)}
                </span>
                <div className="h-2 flex-1 rounded bg-muted">
                  <div
                    className="h-2 rounded bg-emerald-500"
                    style={{
                      width: `${
                        Math.max(
                          2,
                          Math.round(
                            (day.costMicros /
                              Math.max(1, ...data.byDay.map((d) => d.costMicros))) *
                              100,
                          ),
                        )
                      }%`,
                    }}
                  />
                </div>
                <span className="w-20 text-right">
                  {formatUsd(day.costMicros, 4)}
                </span>
              </div>
            ))}
            {data.byDay.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No data yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border p-4">
        <h2 className="mb-1 text-sm font-semibold">Usage limits</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Applied at the start of every chat request. Users without an override
          get the global defaults ($5 / 2M tokens per month, $1 / 400k guests).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2 text-left">User</th>
                <th className="p-2 text-left">Spent this month</th>
                <th className="p-2 text-left">Max USD / month</th>
                <th className="p-2 text-left">Max tokens / month</th>
                <th className="p-2 text-left">Enabled</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const draft = draftFor(user);
                const spent =
                  data.byUser.find((row) => row.userId === user.id)?.costMicros ?? 0;
                return (
                  <tr key={user.id} className="border-t">
                    <td className="p-2">
                      <span className="block">{user.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.id.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="p-2">{formatUsd(spent, 4)}</td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.5"
                        value={draft.dollars}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [user.id]: { ...draft, dollars: event.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="1"
                        step="10000"
                        value={draft.tokens}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [user.id]: { ...draft, tokens: event.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [user.id]: { ...draft, enabled: event.target.checked },
                          }))
                        }
                      />
                    </td>
                    <td className="p-2 text-right">
                      <Button size="sm" onClick={() => saveLimit(user.id)}>
                        Save
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-1 text-sm font-semibold">
          What will it cost to run this app?
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Estimate AI spend only. Hosting, Postgres, Blob storage and Redis are
          billed separately by your providers. Current xAI rates are shown
          below and can be edited in <code>lib/ai/pricing.ts</code>.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="calc-model">Model</Label>
            <select
              id="calc-model"
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
            >
              {Object.keys(pricing).map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calc-messages">Messages / month</Label>
            <Input
              id="calc-messages"
              type="number"
              min="0"
              value={messages}
              onChange={(event) => setMessages(Number(event.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calc-prompt">Input tokens / message</Label>
            <Input
              id="calc-prompt"
              type="number"
              min="0"
              value={promptTokens}
              onChange={(event) => setPromptTokens(Number(event.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calc-completion">Output tokens / message</Label>
            <Input
              id="calc-completion"
              type="number"
              min="0"
              value={completionTokens}
              onChange={(event) =>
                setCompletionTokens(Number(event.target.value))
              }
            />
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-xs uppercase text-muted-foreground">
              Estimated / month
            </p>
            <p className="text-xl font-semibold">
              {formatUsd(estimatedCostMicros, 2)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Input {formatUsd(pricing[selectedModel]?.promptMicrosPerMillion ?? 0)}/M
          tokens · Output{' '}
          {formatUsd(pricing[selectedModel]?.completionMicrosPerMillion ?? 0)}/M
          tokens. Verify at{' '}
          <a
            className="underline"
            href="https://docs.x.ai/developers/pricing"
            target="_blank"
            rel="noreferrer"
          >
            docs.x.ai/developers/pricing
          </a>
          .
        </p>
      </section>
    </div>
  );
}
