import type { LedgerEntry } from '@/lib/db/schema';
import { money, totalsByCurrency } from '@/lib/finance';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function ledgerReport(entries: LedgerEntry[], printable: boolean) {
  const totals = [...totalsByCurrency(entries)]
    .map(
      ([currency, { income, expense }]) =>
        `<tr><th scope="row">${currency}</th><td>${money(income, currency)}</td><td>${money(expense, currency)}</td><td>${money(income - expense, currency)}</td></tr>`,
    )
    .join('');
  const rows = entries
    .map(
      ({ kind, amountMinor, currency, description, date }) =>
        `<tr><td>${date}</td><td>${escapeHtml(description)}</td><td>${kind}</td><td>${money(amountMinor, currency)}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Income and expenses report</title>
  <style>
    body { color: #182033; font: 15px/1.5 system-ui, sans-serif; max-width: 56rem; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-size: 2rem; margin-bottom: .25rem; } h2 { margin-top: 2rem; }
    p { color: #43516a; } table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: .55rem; border-bottom: 1px solid #c8d0de; overflow-wrap: anywhere; }
    th:last-child, td:last-child { text-align: right; } thead { background: #eef2f8; }
    @page { margin: 14mm; }
    @media print { body { margin: 0; padding: 0; } button, .print-help { display: none; } tr { break-inside: avoid; } h2 { break-after: avoid; } }
  </style></head><body>
  ${printable ? '<button id="print" type="button">Print / save PDF</button><p class="print-help">Choose Save as PDF in the print dialog.</p><script>document.getElementById("print").addEventListener("click", () => window.print());</script>' : ''}
  <h1>Income and expenses</h1><p>All entries · Generated ${new Date().toISOString().slice(0, 10)} UTC</p>
  ${
    entries.length
      ? `<h2>Totals by currency</h2><table><thead><tr><th>Currency</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead><tbody>${totals}</tbody></table>
  <h2>Transactions</h2><table><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>`
      : '<p>No entries to report.</p>'
  }
  </body></html>`;
}
