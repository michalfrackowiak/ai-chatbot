'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { LedgerEntry } from '@/lib/db/schema';
import {
  amountValue,
  currencies,
  entryInput,
  ledgerUrl,
  money,
  totalsByCurrency,
} from '@/lib/finance';

const fieldClass = 'block w-full rounded-md border bg-background px-3 py-2';

export function LedgerWorkspace({
  userId,
  admin,
  children,
}: { userId: string; admin: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex h-12 shrink-0 items-center justify-end gap-3 border-b px-3">
        {admin && (
          <Link className="text-sm underline" href="/admin/usage">
            AI usage
          </Link>
        )}
        <Button
          size="sm"
          variant="outline"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Close ledger' : 'Income & expenses'}
        </Button>
      </div>
      <div className="flex min-w-0 flex-1">
        <div
          className={open ? 'hidden min-w-0 flex-1 lg:block' : 'min-w-0 flex-1'}
        >
          {children}
        </div>
        {open && <LedgerPanel userId={userId} />}
      </div>
    </>
  );
}

function LedgerPanel({ userId }: { userId: string }) {
  // The tuple scopes the cache even when a user signs out and a new session starts.
  const { data, error, mutate } = useSWR<LedgerEntry[]>(
    [ledgerUrl, userId],
    async ([url]: [string, string]) => {
      const response = await fetch(url);
      if (!response.ok || response.redirected)
        throw new Error('Unable to load ledger');
      return response.json();
    },
  );
  const [editing, setEditing] = useState<LedgerEntry>();
  const [busy, setBusy] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const entries = data ?? [];

  async function submit(command: object) {
    setBusy(true);
    try {
      const response = await fetch(ledgerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      if (!response.ok || response.redirected)
        throw new Error('Could not save ledger changes');
      await mutate();
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not save ledger changes',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const entry = entryInput.safeParse({
      ...Object.fromEntries(form),
      amount: Number(form.get('amount')),
    });
    if (!entry.success) {
      toast.error(entry.error.issues[0].message);
      return;
    }
    if (
      await submit({
        action: editing ? 'update' : 'add',
        id: editing?.id,
        entry: entry.data,
      })
    ) {
      setEditing(undefined);
      setFormVersion((previous) => previous + 1);
    }
  }

  return (
    <aside
      aria-label="Income and expenses"
      className="h-[calc(100dvh-3rem)] w-full shrink-0 overflow-y-auto border-l p-4 lg:w-[25rem] xl:w-[29rem]"
    >
      <h2 className="text-xl font-semibold">Income &amp; expenses</h2>
      <p className="text-sm text-muted-foreground">
          Add entries here or ask the assistant in a private chat.
      </p>
      <div className="my-5 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void submit({ action: 'sample' })}
        >
          Load sample data
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/api/ledger/report?format=html">Download HTML</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a
            href="/api/ledger/report?format=pdf"
            target="_blank"
            rel="noreferrer"
          >
            Print / save PDF
          </a>
        </Button>
      </div>
      <form
        key={editing?.id ?? formVersion}
        onSubmit={save}
        className="grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm"
      >
        <label>
          Type
          <select
            name="kind"
            className={fieldClass}
            defaultValue={editing?.kind ?? 'expense'}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>
        <label>
          Date
          <input
            type="date"
            name="date"
            required
            className={fieldClass}
            defaultValue={
              editing?.date ?? new Date().toISOString().slice(0, 10)
            }
          />
        </label>
        <label>
          Amount
          <input
            type="number"
            step="any"
            name="amount"
            required
            className={fieldClass}
            defaultValue={
              editing && amountValue(editing.amountMinor, editing.currency)
            }
          />
        </label>
        <label>
          Currency
          <select
            name="currency"
            className={fieldClass}
            defaultValue={editing?.currency ?? 'USD'}
          >
            {currencies.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </label>
        <label className="col-span-2">
          Description
          <input
            name="description"
            required
            maxLength={160}
            className={fieldClass}
            defaultValue={editing?.description}
          />
        </label>
        <Button type="submit" disabled={busy}>
          {editing ? 'Save changes' : 'Add entry'}
        </Button>
        {editing && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setEditing(undefined)}
          >
            Cancel
          </Button>
        )}
      </form>
      <div className="my-5 space-y-2">
        {[...totalsByCurrency(entries)].map(
          ([currency, { income, expense }]) => (
            <p key={currency} className="rounded-lg bg-muted p-3 text-sm">
              <strong>{money(income - expense, currency)}</strong> net ·{' '}
              {money(income, currency)} income · {money(expense, currency)}{' '}
              expenses
            </p>
          ),
        )}
      </div>
      {error ? (
        <p role="alert">Unable to load entries.</p>
      ) : !data ? (
        <p>Loading entries…</p>
      ) : (
        entries.length === 0 && <p>No entries yet.</p>
      )}
      <ul className="divide-y">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-wrap items-center justify-between gap-2 py-3"
          >
            <div className="min-w-0">
              <p className="break-words font-medium">{entry.description}</p>
              <p className="text-sm text-muted-foreground">
                {entry.date} · {entry.kind} ·{' '}
                {money(entry.amountMinor, entry.currency)}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setEditing(entry)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  if (
                    window.confirm(`Delete “${entry.description}”?`) &&
                    (await submit({ action: 'delete', id: entry.id })) &&
                    editing?.id === entry.id
                  )
                    setEditing(undefined);
                }}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
