import { auth } from '@/app/(auth)/auth';
import { getFinanceTransactions } from '@/lib/db/queries';
import { escapeHtml } from '@/lib/ai/costs';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const transactions = await getFinanceTransactions({
    userId: session.user.id,
  });
  const { searchParams } = new URL(request.url);
  const printable = searchParams.get('format') === 'print';
  const income = transactions
    .filter((transaction) => transaction.kind === 'income')
    .reduce((total, transaction) => total + Number(transaction.amount), 0);
  const expenses = transactions
    .filter((transaction) => transaction.kind === 'expense')
    .reduce((total, transaction) => total + Number(transaction.amount), 0);
  const rows = transactions
    .map(
      (transaction) => `<tr>
        <td>${escapeHtml(transaction.occurredAt.toLocaleDateString())}</td>
        <td>${escapeHtml(transaction.kind)}</td>
        <td>${escapeHtml(transaction.description)}</td>
        <td>${escapeHtml(transaction.category)}</td>
        <td class="amount">${transaction.kind === 'expense' ? '-' : '+'}${Number(transaction.amount).toFixed(2)}</td>
      </tr>`,
    )
    .join('');
  const printScript = printable ? '<script>window.print()</script>' : '';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Income &amp; expenses report</title>
<style>
body{font:15px/1.5 system-ui,sans-serif;color:#17212b;max-width:900px;margin:40px auto;padding:0 24px}
h1{margin-bottom:4px}.muted{color:#64748b}.totals{display:flex;gap:32px;margin:24px 0}
.total{padding:16px 20px;border:1px solid #dbe2ea;border-radius:10px;min-width:150px}
.total strong{display:block;font-size:20px;margin-top:4px}table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:10px;border-bottom:1px solid #e2e8f0}.amount{text-align:right;font-variant-numeric:tabular-nums}
@media print{body{margin:0 auto;padding:0}.totals,.total{break-inside:avoid}}
</style></head><body>
<h1>Income &amp; expenses report</h1>
<div class="muted">Prepared for ${escapeHtml(session.user.email ?? 'account')} on ${new Date().toLocaleDateString()}</div>
<section class="totals">
<div class="total">Income<strong>$${income.toFixed(2)}</strong></div>
<div class="total">Expenses<strong>$${expenses.toFixed(2)}</strong></div>
<div class="total">Net balance<strong>$${(income - expenses).toFixed(2)}</strong></div>
</section>
<table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Category</th><th class="amount">Amount</th></tr></thead>
<tbody>${rows || '<tr><td colspan="5">No transactions recorded yet.</td></tr>'}</tbody></table>
${printScript}</body></html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': printable
        ? 'inline'
        : 'attachment; filename="income-expenses-report.html"',
      'Cache-Control': 'private, no-store',
    },
  });
}
