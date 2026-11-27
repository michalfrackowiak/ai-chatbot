import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

const branch = process.env.COMPARISON_BRANCH;
const worktree = process.env.COMPARISON_WORKTREE;

if (!branch || !worktree) {
  throw new Error('COMPARISON_BRANCH and COMPARISON_WORKTREE are required.');
}

async function load(relativePath: string) {
  return import(pathToFileURL(path.resolve(worktree!, relativePath)).href);
}

test(`domain unit coverage: ${branch}`, async () => {
  switch (branch) {
    case 'expenses-nemotron-3-5-lightning': {
      const { parseIncomeExpenseFromText } = await load('lib/utils.ts');

      assert.deepEqual(
        parseIncomeExpenseFromText('add income $1,200.50 for salary'),
        { type: 'income', amount: '1200.50', description: 'salary' },
      );
      break;
    }

    case 'expenses-hy4': {
      const {
        dollarsToCents,
        transactionInputSchema,
        usageLimitSchema,
      } = await load('lib/finance/validation.ts');

      assert.equal(dollarsToCents(12.5), 1250);
      assert.equal(
        transactionInputSchema.safeParse({
          type: 'expense',
          amount: 12.5,
          category: '  Groceries  ',
          description: 'Weekly groceries',
        }).success,
        true,
      );
      assert.equal(
        transactionInputSchema.safeParse({
          type: 'expense',
          amount: 0,
          category: 'Groceries',
          description: 'Weekly groceries',
        }).success,
        false,
      );
      assert.equal(
        usageLimitSchema.safeParse({
          userId: '00000000-0000-4000-8000-000000000001',
          monthlyCostMicros: 5_000_000,
          monthlyTokenLimit: 100_000,
          enabled: true,
        }).success,
        true,
      );
      assert.equal(
        usageLimitSchema.safeParse({
          userId: '00000000-0000-4000-8000-000000000001',
          monthlyCostMicros: 0,
          monthlyTokenLimit: 100_000,
          enabled: true,
        }).success,
        false,
      );
      break;
    }

    case 'expenses-gpt-6-2-sol': {
      const { entryInput, entryValues } = await load('lib/finance.ts');
      const dollars = entryInput.parse({
        kind: 'expense',
        amount: 12.34,
        currency: 'USD',
        description: 'Groceries',
        date: '2026-11-27',
      });

      assert.equal(entryValues(dollars).amountMinor, 1234);
      assert.equal(
        entryInput.safeParse({
          kind: 'expense',
          amount: 12.345,
          currency: 'USD',
          description: 'Groceries',
          date: '2026-11-27',
        }).success,
        false,
      );
      assert.equal(
        entryInput.parse({
          kind: 'income',
          amount: 1200,
          currency: 'JPY',
          description: 'Salary',
          date: '2026-11-27',
        }).amount,
        1200,
      );
      break;
    }

    case 'expenses-gpt-6-2-astra': {
      const { money } = await load('components/ledger.tsx');
      assert.equal(money(1234), '$12.34');
      assert.equal(money(-1234), '-$12.34');
      break;
    }

    case 'expenses-big-pickle': {
      const { dollarsToMicros, fromCents, toCents } = await load(
        'lib/transactions/money.ts',
      );

      assert.equal(toCents(0.1 + 0.2), 30);
      assert.equal(fromCents(1250), 12.5);
      assert.equal(dollarsToMicros(0.000001), 1);
      break;
    }

    case 'expenses-copilot-luna-6': {
      const { calculateAiCostUsd, getEffectiveAiLimit } = await load(
        'lib/ai/costs.ts',
      );

      assert.equal(calculateAiCostUsd('chat-model', 1_000_000, 1_000_000), 12);
      assert.equal(
        calculateAiCostUsd('chat-model-reasoning', 1_000_000, 1_000_000),
        0.8,
      );
      assert.equal(getEffectiveAiLimit(20, 10), 10);
      assert.equal(getEffectiveAiLimit(5, null), 5);
      break;
    }

    default:
      throw new Error(`No unit adapter is defined for branch "${branch}".`);
  }
});

test('natural spending language is recognized by the chat parser', async (context) => {
  if (branch !== 'expenses-nemotron-3-5-lightning') {
    context.skip('No standalone natural-language parser on this branch.');
    return;
  }

  const { parseIncomeExpenseFromText } = await load('lib/utils.ts');
  assert.deepEqual(
    parseIncomeExpenseFromText('I spent $24.50 on coffee'),
    { type: 'expense', amount: '24.50', description: 'coffee' },
  );
});
