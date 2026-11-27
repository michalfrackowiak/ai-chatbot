'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TRANSACTIONS_KEY } from '@/lib/finance/client';
import {
  centsToDollars,
  formatMoney,
  formatTransactionDate,
  transactionInputSchema,
} from '@/lib/finance/validation';
import { summarizeTransactions } from '@/lib/finance/summary-client';
import type { Transaction, TransactionType } from '@/lib/db/schema';

const fetcher = async (url: string): Promise<Array<Transaction>> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load transactions');
  return response.json();
};

type FormState = {
  type: TransactionType;
  amount: string;
  category: string;
  description: string;
  date: string;
};

const emptyForm: FormState = {
  type: 'expense',
  amount: '',
  category: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
};

export function FinanceDashboard({ userEmail }: { userEmail: string }) {
  const { data: transactions = [], isLoading } = useSWR<Array<Transaction>>(
    TRANSACTIONS_KEY,
    fetcher,
    { revalidateOnFocus: true },
  );
  const { mutate } = useSWRConfig();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | TransactionType>('all');
  const [isSaving, setIsSaving] = useState(false);

  const visible = useMemo(
    () =>
      filter === 'all'
        ? transactions
        : transactions.filter((item) => item.type === filter),
    [transactions, filter],
  );
  const totals = summarizeTransactions(visible);

  const categories = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const item of visible) {
      grouped.set(item.category, (grouped.get(item.category) ?? 0) + item.amount);
    }
    return [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [visible]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const input = transactionInputSchema.parse({
        type: form.type,
        amount: Number(form.amount),
        category: form.category,
        description: form.description,
        date: form.date ? new Date(`${form.date}T12:00:00Z`).toISOString() : undefined,
      });

      const response = await fetch(
        editingId ? `${TRANSACTIONS_KEY}/${editingId}` : TRANSACTIONS_KEY,
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? 'Could not save transaction');
      }

      await mutate(TRANSACTIONS_KEY);
      toast.success(
        editingId ? 'Transaction updated' : 'Transaction added',
      );
      setForm(emptyForm);
      setEditingId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save transaction',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: Transaction) => {
    setEditingId(item.id);
    setForm({
      type: item.type,
      amount: String(centsToDollars(item.amount)),
      category: item.category,
      description: item.description,
      date: item.date.toISOString().slice(0, 10),
    });
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`${TRANSACTIONS_KEY}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      toast.error('Could not delete transaction');
      return;
    }

    await mutate(TRANSACTIONS_KEY);
    toast.success('Transaction deleted');
  };

  const handleSeed = async () => {
    const response = await fetch(TRANSACTIONS_KEY, { method: 'PUT' });
    const result = await response.json().catch(() => ({}));
    await mutate(TRANSACTIONS_KEY);
    toast.success(
      result.seeded ? `Loaded ${result.count} sample entries` : 'Samples already loaded',
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Income &amp; expenses</h1>
          <p className="text-sm text-muted-foreground">
            {userEmail || 'Your account'} · manage entries here or just tell the
            assistant in chat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/">← Back to chat</Link>
          </Button>
          <Button variant="outline" onClick={handleSeed}>
            Load sample data
          </Button>
          <Button variant="outline" asChild>
            <a href="/api/reports?format=html" target="_blank">
              HTML report
            </a>
          </Button>
          <Button asChild>
            <a href="/api/reports?format=pdf">Download PDF</a>
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border p-4">
          <p className="text-xs uppercase text-muted-foreground">Income</p>
          <p className="text-xl font-semibold text-emerald-600">
            {formatMoney(totals.incomeCents)}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs uppercase text-muted-foreground">Expenses</p>
          <p className="text-xl font-semibold text-red-600">
            {formatMoney(totals.expenseCents)}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs uppercase text-muted-foreground">Balance</p>
          <p className="text-xl font-semibold">
            {formatMoney(totals.balanceCents)}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs uppercase text-muted-foreground">Entries</p>
          <p className="text-xl font-semibold">{totals.count}</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-6 grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={form.type}
            onChange={(event) =>
              setField('type', event.target.value as TransactionType)
            }
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount (USD)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="42.50"
            value={form.amount}
            onChange={(event) => setField('amount', event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            required
            maxLength={64}
            placeholder="Groceries"
            value={form.category}
            onChange={(event) => setField('category', event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            required
            maxLength={500}
            placeholder="Weekly groceries"
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={form.date}
            onChange={(event) => setField('date', event.target.value)}
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
          <Button type="submit" disabled={isSaving}>
            {isSaving
              ? 'Saving…'
              : editingId
                ? 'Save changes'
                : 'Add transaction'}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="mb-4 flex items-center gap-2">
        {(['all', 'income', 'expense'] as const).map((value) => (
          <Button
            key={value}
            variant={filter === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(value)}
          >
            {value === 'all'
              ? 'All'
              : value === 'income'
                ? 'Income'
                : 'Expenses'}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Description</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2 whitespace-nowrap">
                  {formatTransactionDate(item.date)}
                </td>
                <td className="px-4 py-2 capitalize">{item.type}</td>
                <td className="px-4 py-2">{item.category}</td>
                <td className="px-4 py-2">{item.description}</td>
                <td
                  className={`px-4 py-2 text-right font-medium ${
                    item.type === 'income'
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}
                >
                  {item.type === 'income' ? '+' : '-'}
                  {formatMoney(item.amount)}
                </td>
                <td className="px-4 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {isLoading
                    ? 'Loading…'
                    : 'No entries yet. Add one above, load samples, or ask the assistant.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {categories.length > 0 && (
        <div className="mt-6 rounded-xl border p-4">
          <h2 className="mb-3 text-sm font-semibold">Top categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map(([name, amount]) => (
              <span
                key={name}
                className="rounded-full bg-muted px-3 py-1 text-xs"
              >
                {name}: <strong>{formatMoney(amount)}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
