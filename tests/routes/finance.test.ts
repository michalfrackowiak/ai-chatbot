import { generateUUID } from '@/lib/utils';
import {
  calculateAiCostUsd,
  escapeHtml,
  getEffectiveAiLimit,
} from '@/lib/ai/costs';
import { expect, test } from '../fixtures';
import { createAuthenticatedContext } from '../helpers';

test.describe('finance and AI usage', () => {
  test('calculates model spend from input and output tokens', () => {
    expect(calculateAiCostUsd('chat-model', 1000000, 1000000)).toBe(12);
    expect(calculateAiCostUsd('chat-model-reasoning', 1000000, 1000000)).toBe(
      0.8,
    );
    expect(calculateAiCostUsd('artifact-model', 1000, 500)).toBe(0.007);
    expect(() => calculateAiCostUsd('unpriced-model', 1, 1)).toThrow(
      'Missing AI pricing',
    );
  });

  test('applies admin caps and escapes report fields', () => {
    expect(getEffectiveAiLimit(20, 10)).toBe(10);
    expect(getEffectiveAiLimit(5, 10)).toBe(5);
    expect(getEffectiveAiLimit(5, null)).toBe(5);
    expect(escapeHtml(`<script>&"'</script>`)).toBe(
      '&lt;script&gt;&amp;&quot;&#39;&lt;/script&gt;',
    );
  });

  test('keeps transactions private and escapes report content', async ({
    adaContext,
    babbageContext,
  }) => {
    const description = '<script>alert(1)</script>';
    const created = await adaContext.request.post('/api/transactions', {
      data: {
        kind: 'expense',
        amount: 12.5,
        description,
        category: 'Test',
        occurredAt: new Date().toISOString(),
      },
    });
    expect(created.status()).toBe(201);
    const { transaction } = await created.json();

    const foreignTransactions =
      await babbageContext.request.get('/api/transactions');
    const foreignData = await foreignTransactions.json();
    expect(
      foreignData.transactions.some(
        (item: { id: string }) => item.id === transaction.id,
      ),
    ).toBe(false);

    const foreignDelete = await babbageContext.request.delete(
      `/api/transactions?id=${transaction.id}`,
    );
    expect(foreignDelete.status()).toBe(404);

    const report = await adaContext.request.get('/api/reports');
    const reportHtml = await report.text();
    expect(reportHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(reportHtml).not.toContain('<script>alert(1)</script>');

    const deleted = await adaContext.request.delete(
      `/api/transactions?id=${transaction.id}`,
    );
    expect(deleted.status()).toBe(200);
  });

  test('adds sample rows only to an empty ledger', async ({ browser }) => {
    const sampleAccount = await createAuthenticatedContext({
      browser,
      name: generateUUID(),
    });
    try {
      const sample = await sampleAccount.request.post(
        '/api/transactions/sample',
      );
      expect(sample.status()).toBe(201);

      const response = await sampleAccount.request.get('/api/transactions');
      const data = await response.json();
      expect(data.transactions).toHaveLength(6);

      const duplicate = await sampleAccount.request.post(
        '/api/transactions/sample',
      );
      expect(duplicate.status()).toBe(409);
    } finally {
      await sampleAccount.context.close();
    }
  });

  test('blocks AI requests after the monthly limit is set to zero', async ({
    adaContext,
  }) => {
    try {
      const setLimit = await adaContext.request.put('/api/ai-usage', {
        data: { monthlyLimitUsd: 0 },
      });
      expect(setLimit.status()).toBe(200);

      const blocked = await adaContext.request.post('/api/chat', {
        data: {
          id: generateUUID(),
          message: {
            id: generateUUID(),
            role: 'user',
            content: 'Please help me.',
            parts: [{ type: 'text', text: 'Please help me.' }],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: 'chat-model',
          selectedVisibilityType: 'private',
        },
      });
      expect(blocked.status()).toBe(429);
    } finally {
      await adaContext.request.put('/api/ai-usage', {
        data: { monthlyLimitUsd: 10 },
      });
    }
  });
});
