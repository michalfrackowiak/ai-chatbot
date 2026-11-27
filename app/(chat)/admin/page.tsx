import { auth } from '@/app/(auth)/auth';
import { isAdmin } from '@/lib/ai/usage';
import { client } from '@/lib/db/queries';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
async function requireAdmin() {
  if (!isAdmin((await auth())?.user?.id)) notFound();
}
async function saveLimit(form: FormData) {
  'use server';
  await requireAdmin();
  const value = String(form.get('limit') ?? '').trim();
  if (value && (!/^\d+$/.test(value) || Number(value) > 2147483647))
    throw Error('Invalid limit');
  await client`update ai_policy set daily_limit=${value ? Number(value) : null} where id=1`;
  revalidatePath('/admin');
}
export default async function Admin() {
  await requireAdmin();
  const [policy] = await client`select daily_limit from ai_policy where id=1`;
  const rows =
    await client`select model,count(*) as calls,sum(input) as input,sum(output) as output,sum(usd) as usd,count(*) filter(where usd is null) as pending from ai_call where started>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC' group by model order by model`;
  return (
    <main className="mx-auto w-full max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">AI usage</h1>
      <p>
        This month (UTC) · Estimated model spend{' '}
        <strong>
          ${rows.reduce((n, r) => n + Number(r.usd), 0).toFixed(4)}
        </strong>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              {[
                'Model',
                'Calls',
                'Input tokens',
                'Output tokens',
                'Est. USD',
                'Unpriced calls',
              ].map((t) => (
                <th key={t}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.model}>
                <td>{r.model}</td>
                <td>{r.calls}</td>
                <td>{r.input ?? '—'}</td>
                <td>{r.output ?? '—'}</td>
                <td>{Number(r.usd).toFixed(4)}</td>
                <td>{r.pending}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={saveLimit} className="grid max-w-sm gap-2">
        <label htmlFor="limit">Daily model calls across all users</label>
        <input
          className="rounded border p-2"
          id="limit"
          name="limit"
          type="number"
          min="0"
          max="2147483647"
          defaultValue={policy.daily_limit ?? ''}
          placeholder="Unlimited"
        />
        <small>
          Leave blank for unlimited. Zero pauses AI calls. Resets at midnight
          UTC.
        </small>
        <button className="rounded bg-primary p-2 text-primary-foreground">
          Save limit
        </button>
      </form>
    </main>
  );
}
