import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/app/(auth)/auth';
import { isUsageAdmin } from '@/lib/ai/usage-admin';
import { imageUsd, textCostMicros, usageUsd } from '@/lib/ai/model-pricing';
import { readUsage } from '@/lib/db/ai-usage';
import { Button } from '@/components/ui/button';
import { setLimits } from './actions';

export default async function UsagePage() {
  const session = await auth();
  if (!isUsageAdmin(session?.user)) notFound();
  const { month, settings, models } = await readUsage();
  const calls = models.reduce((sum, row) => sum + row.calls, 0);
  const cost = models.reduce((sum, row) => sum + row.cost, 0);
  const unmetered = models.reduce((sum, row) => sum + row.unmetered, 0);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-7 p-6">
      <Link className="text-sm underline" href="/">
        Back to chat
      </Link>
      <h1 className="text-3xl font-semibold">AI usage</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Estimated AI spend · {month} UTC
          </p>
          <p className="text-2xl font-semibold">{usageUsd(cost)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Model calls this month
          </p>
          <p className="text-2xl font-semibold">{calls.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Calls without a usage total
          </p>
          <p className="text-2xl font-semibold">{unmetered.toLocaleString()}</p>
        </div>
      </div>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Usage by model</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">Model</th>
                <th>Calls</th>
                <th>Input tokens</th>
                <th>Output tokens</th>
                <th>Images</th>
                <th>Estimated cost</th>
              </tr>
            </thead>
            <tbody>
              {models.map((row) => (
                <tr className="border-b" key={row.model}>
                  <th className="p-2 font-medium" scope="row">
                    {row.model}
                  </th>
                  <td>{row.calls}</td>
                  <td>{row.input}</td>
                  <td>{row.output}</td>
                  <td>{row.images}</td>
                  <td>{usageUsd(row.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {models.length === 0 && (
            <p className="p-2 text-sm">No model calls recorded this month.</p>
          )}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Monthly limits</h2>
        <p className="text-sm text-muted-foreground">
          Limits apply across all users and reset each UTC month. Leave a field
          blank for unlimited usage. Zero pauses AI calls. Calls already in
          progress can take estimated spend above the budget.
        </p>
        <form action={setLimits} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Model calls
            <input
              className="block rounded-md border bg-background p-2"
              name="calls"
              type="number"
              min={0}
              max={999999999}
              step={1}
              defaultValue={settings?.monthlyLimit ?? ''}
            />
          </label>
          <label className="text-sm">
            Estimated budget (USD)
            <input
              className="block rounded-md border bg-background p-2"
              name="budget"
              type="number"
              min={0}
              max={999999999.99}
              step={0.01}
              defaultValue={
                settings?.monthlyBudgetMicros == null
                  ? ''
                  : settings.monthlyBudgetMicros / 1_000_000
              }
            />
          </label>
          <Button type="submit">Save limits</Button>
        </form>
      </section>
      <section className="space-y-2 text-sm">
        <h2 className="text-xl font-semibold">Operating cost example</h2>
        <p>
          One million input tokens, 250,000 output tokens and 100 generated
          images cost about{' '}
          {usageUsd(
            textCostMicros(1_000_000, 250_000) +
              Math.round(100 * imageUsd * 1_000_000),
          )}{' '}
          in AI usage at standard rates.
        </p>
        <p>
          Add hosting, database, storage and any Redis charges for your
          deployment. Estimates use standard uncached rates and can differ from
          the provider invoice.
        </p>
      </section>
    </main>
  );
}
