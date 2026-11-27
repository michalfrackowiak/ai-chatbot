'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/transactions/money';
import type { SerializedTransaction } from '@/lib/transactions/types';
import { fetcher } from '@/lib/utils';

const LIST_KEY = '/api/transactions?limit=200';

interface TransactionsResponse {
  transactions: Array<SerializedTransaction>;
  totals: { incomeCents: number; expenseCents: number; netCents: number };
}

interface FormState {
  type: 'income' | 'expense';
  amount: string;
  category: string;
  description: string;
  occurredAt: string;
}

const emptyForm: FormState = {
  type: 'expense',
  amount: '',
  category: '',
  description: '',
  occurredAt: new Date().toISOString().slice(0, 10),
};

const fieldClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

async function sendRequest(url: string, init: RequestInit) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? 'The request failed. Please try again.');
  }

  return response.json();
}

export function TransactionsManager() {
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR<TransactionsResponse>(
    LIST_KEY,
    fetcher,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const refresh = async () => {
    await Promise.all([
      mutate(LIST_KEY),
      mutate('/api/transactions'),
      mutate('/api/transactions?limit=5'),
    ]);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const amount = Number(form.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !form.category.trim() ||
      !form.description.trim()
    ) {
      setMessage('Enter a positive amount, a category and a description.');
      setBusy(false);
      return;
    }

    try {
      const body = {
        type: form.type,
        amount,
        category: form.category.trim(),
        description: form.description.trim(),
        occurredAt: new Date(`${form.occurredAt}T12:00:00`).toISOString(),
      };

      await sendRequest(
        editingId ? `/api/transactions/${editingId}` : '/api/transactions',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );

      setMessage(
        editingId ? 'Transaction updated.' : 'Transaction added.',
      );
      resetForm();
      await refresh();
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : 'The request failed.',
      );
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (item: SerializedTransaction) => {
    if (!confirm(`Delete "${item.description}"?`)) return;

    setBusy(true);
    setMessage(null);

    try {
      await sendRequest(`/api/transactions/${item.id}`, { method: 'DELETE' });
      setMessage('Transaction deleted.');
      if (editingId === item.id) resetForm();
      await refresh();
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : 'The request failed.',
      );
    } finally {
      setBusy(false);
    }
  };

  const reportUrl = (format: 'html' | 'pdf') => {
    const params = new URLSearchParams({ format });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return `/api/reports?${params.toString()}`;
  };

  const totals = data?.totals;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Income &amp; expenses</h1>
        <p className="text-sm text-muted-foreground">
          Add entries here or just tell the assistant in chat — both stay in
          sync.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Income</p>
          <p className="text-xl font-medium text-green-600">
            {formatMoney(totals?.incomeCents ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Expenses</p>
          <p className="text-xl font-medium">
            {formatMoney(totals?.expenseCents ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Net</p>
          <p className="text-xl font-medium">
            {formatMoney(totals?.netCents ?? 0)}
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="space-y-1.5">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            className={fieldClass}
            value={form.type}
            onChange={(event) =>
              setField('type', event.target.value as FormState['type'])
            }
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={(event) => setField('amount', event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            maxLength={64}
            placeholder="groceries"
            value={form.category}
            onChange={(event) => setField('category', event.target.value)}
          />
        </div>
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            maxLength={500}
            placeholder="Weekly shop"
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="occurredAt">Date</Label>
          <Input
            id="occurredAt"
            type="date"
            value={form.occurredAt}
            onChange={(event) => setField('occurredAt', event.target.value)}
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
          <Button type="submit" disabled={busy}>
            {editingId ? 'Save changes' : 'Add transaction'}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          )}
          {message && <span className="text-sm text-muted-foreground">{message}</span>}
        </div>
      </form>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
        <div className="space-y-1.5">
          <Label htmlFor="report-from">Report from</Label>
          <Input
            id="report-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="report-to">Report to</Label>
          <Input
            id="report-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
        <Button asChild variant="outline">
          <a href={reportUrl('html')} target="_blank" rel="noreferrer">
            Open HTML report
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={reportUrl('pdf')}>Download PDF</a>
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600">Failed to load transactions.</p>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.transactions.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">
                  {item.occurredAt.slice(0, 10)}
                </td>
                <td className="px-3 py-2">{item.description}</td>
                <td className="px-3 py-2">{item.category}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {item.source}
                </td>
                <td
                  className={`px-3 py-2 text-right ${
                    item.type === 'income' ? 'text-green-600' : ''
                  }`}
                >
                  {item.type === 'income' ? '+' : '-'}
                  {formatMoney(item.amount)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setEditingId(item.id);
                      setForm({
                        type: item.type,
                        amount: String(item.amount / 100),
                        category: item.category,
                        description: item.description,
                        occurredAt: item.occurredAt.slice(0, 10),
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => onDelete(item)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        )}
        {data && data.transactions.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            No transactions yet. Add one above or ask the assistant.
          </p>
        )}
      </div>
    </main>
  );
}
