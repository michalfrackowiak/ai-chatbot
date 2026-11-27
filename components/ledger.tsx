'use client';
import useSWR from 'swr';
import { useState, type FormEvent } from 'react';
type Row = {
  id: string;
  date: string;
  kind: string;
  description: string;
  cents: string;
};
export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  );
export function Ledger({ owner }: { owner: string }) {
  const { data, error, mutate } = useSWR<Row[]>(
    ['/api/ledger', owner],
    async () => {
      const res = await fetch('/api/ledger');
      if (!res.ok) throw Error();
      return res.json();
    },
  );
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(body: object) {
    setBusy(true);
    setNotice('');
    try {
      const res = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw Error();
      await mutate();
      return true;
    } catch {
      setNotice('Could not save. Check the fields and try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (await save({ ...values, amount: Number(values.amount), action: 'add' }))
      form.reset();
  }
  return (
    <details className="mx-2 rounded-lg border bg-background p-3 text-sm">
      <summary className="cursor-pointer font-medium">
        Income &amp; expenses
      </summary>
      <div className="mt-3 grid gap-3">
        <form
          onSubmit={submit}
          className="grid gap-2 [&_input]:rounded [&_input]:border [&_input]:p-1"
        >
          <select name="kind" aria-label="Transaction type">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input
            name="description"
            aria-label="Description"
            placeholder="Description"
            maxLength={180}
            required
          />
          <input
            name="amount"
            aria-label="Amount in USD"
            type="number"
            min=".01"
            max="99999999"
            step=".01"
            placeholder="Amount (USD)"
            required
          />
          <input
            name="date"
            aria-label="Date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
          <button
            disabled={busy}
            className="rounded bg-primary p-1 text-primary-foreground"
          >
            Add transaction
          </button>
        </form>
        <div role="status">
          {notice ||
            (error
              ? 'Could not load transactions.'
              : !data
                ? 'Loading transactions…'
                : data.length === 0
                  ? 'No transactions yet.'
                  : '')}
        </div>
        {data?.length === 0 && (
          <button disabled={busy} onClick={() => save({ action: 'sample' })}>
            Load sample transactions
          </button>
        )}
        <ul className="max-h-48 overflow-auto divide-y">
          {data?.map((row) => (
            <li className="py-2" key={row.id}>
              <div>{row.description}</div>
              <small>
                {row.date} · {row.kind} · {money(Number(row.cents))}
              </small>
            </li>
          ))}
        </ul>
        <a
          href="/api/ledger/report"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Open HTML / PDF report
        </a>
      </div>
    </details>
  );
}
