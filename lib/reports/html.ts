import { formatMoney } from '@/lib/transactions/money';
import type { ReportData } from './report-data';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderReportHtml(report: ReportData): string {
  const rows = report.rows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.date)}</td>
        <td>${escapeHtml(row.type)}</td>
        <td>${escapeHtml(row.category)}</td>
        <td>${escapeHtml(row.description)}</td>
        <td class="amount">${formatMoney(row.amountCents)}</td>
      </tr>`,
    )
    .join('\n');

  const categories = report.categories
    .map(
      (category) => `<tr>
        <td>${escapeHtml(category.name)}</td>
        <td class="amount">${formatMoney(category.incomeCents)}</td>
        <td class="amount">${formatMoney(category.expenseCents)}</td>
        <td class="amount">${formatMoney(category.incomeCents - category.expenseCents)}</td>
      </tr>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Income and expenses report (${escapeHtml(report.from)} to ${escapeHtml(report.to)})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #18181b; margin: 40px auto; max-width: 960px; line-height: 1.5; }
    h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.15rem; margin-top: 2rem; }
    p.meta { color: #71717a; margin-top: 0; }
    table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
    th, td { border-bottom: 1px solid #e4e4e7; padding: 8px 10px; text-align: left; }
    th { background: #f4f4f5; }
    td.amount, th.amount { text-align: right; }
    .totals { display: flex; gap: 2rem; margin-top: 1.5rem; }
    .total { background: #f4f4f5; border-radius: 8px; padding: 12px 18px; min-width: 160px; }
    .total span { display: block; color: #71717a; font-size: 0.8rem; }
    .total strong { font-size: 1.2rem; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Income and expenses report</h1>
  <p class="meta">${escapeHtml(report.from)} to ${escapeHtml(report.to)} · generated ${escapeHtml(report.generatedAt)}</p>
  <div class="totals">
    <div class="total"><span>Income</span><strong>${formatMoney(report.incomeCents)}</strong></div>
    <div class="total"><span>Expenses</span><strong>${formatMoney(report.expenseCents)}</strong></div>
    <div class="total"><span>Net</span><strong>${formatMoney(report.netCents)}</strong></div>
  </div>
  <h2>By category</h2>
  <table><thead><tr><th>Category</th><th class="amount">Income</th><th class="amount">Expenses</th><th class="amount">Net</th></tr></thead>
  <tbody>${categories || '<tr><td colspan="4">No transactions in this period.</td></tr>'}</tbody></table>
  <h2>Transactions</h2>
  <table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th class="amount">Amount</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5">No transactions in this period.</td></tr>'}</tbody></table>
</body>
</html>`;
}
