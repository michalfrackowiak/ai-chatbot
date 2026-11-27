import { auth } from '@/app/(auth)/auth';
import { entries } from '@/lib/finance';
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
const money = (n: number) =>
  (n / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
export async function GET() {
  const user = (await auth())?.user;
  if (!user) return new Response(null, { status: 401 });
  const rows = await entries(user.id);
  const total = (kind: string) =>
    rows.reduce((n, r) => n + (r.kind === kind ? Number(r.cents) : 0), 0);
  const income = total('income'),
    expense = total('expense');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Income and expense report</title><style>body{font:16px system-ui;max-width:60rem;margin:3rem auto;padding:1rem}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:.6rem;border-bottom:1px solid #ccc}button,a{margin-right:1rem}@media print{nav{display:none}}</style><h1>Income and expense report</h1><p>All transactions · USD</p><p>Income ${money(income)} · Expenses ${money(expense)} · Net ${money(income - expense)}</p><nav><a download="finance-report.html" href="/api/ledger/report">Download HTML</a><button onclick="window.print()">Print / Save as PDF</button></nav><table><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.date}</td><td>${escape(r.description)}</td><td>${r.kind}</td><td>${money(Number(r.cents))}</td></tr>`).join('')}</tbody></table></html>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
