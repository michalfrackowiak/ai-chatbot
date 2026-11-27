import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { escapeHtml, renderReportHtml } from './html';
import { buildReportData } from './report-data';

describe('HTML reports', () => {
  it('escapes user-provided text', () => {
    assert.equal(
      escapeHtml('<script>alert("x")</script>'),
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });

  it('includes totals and rows in the generated report', () => {
    const report = buildReportData({
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.999Z'),
      now: new Date('2026-02-01T00:00:00.000Z'),
      transactions: [
        {
          type: 'income',
          amount: 100_00,
          category: 'salary',
          description: 'January salary',
          occurredAt: new Date('2026-01-05T12:00:00.000Z'),
        },
        {
          type: 'expense',
          amount: 25_50,
          category: 'groceries',
          description: 'Shop & <groceries>',
          occurredAt: new Date('2026-01-10T12:00:00.000Z'),
        },
        {
          type: 'expense',
          amount: 99_00,
          category: 'rent',
          description: 'Out of range',
          occurredAt: new Date('2026-02-10T12:00:00.000Z'),
        },
      ],
    });

    assert.equal(report.incomeCents, 10_000);
    assert.equal(report.expenseCents, 2_550);
    assert.equal(report.netCents, 7_450);
    assert.equal(report.rows.length, 2);

    const html = renderReportHtml(report);
    assert.match(html, /\$100\.00/);
    assert.match(html, /\$25\.50/);
    assert.match(html, /Shop &amp; &lt;groceries&gt;/);
    assert.doesNotMatch(html, /Out of range/);
  });
});
