import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import type { RequirementId } from './config';
import { recordCheck } from './results';

/**
 * Branch-specific domain unit checks. Each branch exposes its money math,
 * validation or pricing as a plain TypeScript module; importing those
 * modules from a detached worktree lets one suite exercise six independent
 * implementations without changing any candidate code.
 */

const branch = process.env.COMPARISON_BRANCH;
const worktree = process.env.COMPARISON_WORKTREE;

if (!branch || !worktree) {
  throw new Error('COMPARISON_BRANCH and COMPARISON_WORKTREE are required.');
}

async function load(relativePath: string) {
  return import(pathToFileURL(path.resolve(worktree!, relativePath)).href);
}

async function unitCase(
  id: string,
  requirement: RequirementId,
  name: string,
  run: () => void | Promise<void>,
): Promise<boolean> {
  try {
    await run();
    recordCheck('unit', { id, requirement, name, status: 'pass' });
    return true;
  } catch (error) {
    recordCheck('unit', {
      id,
      requirement,
      name,
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

test(`domain unit coverage: ${branch}`, async () => {
  const outcomes: boolean[] = [];
  switch (branch) {
    case 'expenses-nemotron-3-5-lightning': {
      const { parseIncomeExpenseFromText } = await load('lib/utils.ts');

      outcomes.push(
        await unitCase('u-parse-expense', 'R2', 'natural expense phrase parses', () => {
          assert.deepEqual(parseIncomeExpenseFromText('I spent $24.50 on coffee'), {
            type: 'expense',
            amount: '24.50',
            description: 'coffee',
          });
        }),
        await unitCase('u-parse-income', 'R1', 'natural income phrase parses', () => {
          assert.deepEqual(
            parseIncomeExpenseFromText('add income $1,200.50 for salary'),
            { type: 'income', amount: '1200.50', description: 'salary' },
          );
        }),
        await unitCase('u-cost-evidence', 'R5', 'cost/usage schema is present', () => {
          const schema = fs.readFileSync(
            path.join(worktree!, 'lib/db/schema.ts'),
            'utf8',
          );
          assert.match(schema, /AIUsageLog|usageLimits/i);
        }),
      );
      break;
    }

    case 'expenses-hy4': {
      const {
        dollarsToCents,
        transactionInputSchema,
        usageLimitSchema,
      } = await load('lib/finance/validation.ts');

      outcomes.push(
        await unitCase('u-money', 'R1', 'dollars convert to cents', () => {
          assert.equal(dollarsToCents(12.5), 1250);
          assert.equal(dollarsToCents(0.1 + 0.2), 30);
        }),
        await unitCase('u-validation', 'R1', 'transaction input is validated', () => {
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
        }),
        await unitCase('u-limits', 'R6', 'usage limit input is validated', () => {
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
        }),
        await unitCase('u-cost-evidence', 'R5', 'pricing and formatting work', async () => {
          const { calculateCostMicros, formatUsd } = await load(
            'lib/ai/pricing.ts',
          );
          assert.equal(formatUsd(1_250_000), '$1.25');
          assert.ok(
            calculateCostMicros({
              model: 'chat-model',
              promptTokens: 1000,
              completionTokens: 1000,
            }) > 0,
          );
        }),
      );
      break;
    }

    case 'expenses-gpt-6-2-sol': {
      const { entryInput, entryValues } = await load('lib/finance.ts');

      outcomes.push(
        await unitCase('u-money', 'R1', 'entry amounts use minor units', () => {
          const dollars = entryInput.parse({
            kind: 'expense',
            amount: 12.34,
            currency: 'USD',
            description: 'Groceries',
            date: '2026-11-27',
          });
          assert.equal(entryValues(dollars).amountMinor, 1234);
        }),
        await unitCase('u-validation', 'R1', 'invalid precision is rejected', () => {
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
        }),
        await unitCase('u-cost-evidence', 'R5', 'cost helpers are present', async () => {
          const { textCostMicros, usageUsd } = await load(
            'lib/ai/model-pricing.ts',
          );
          assert.equal(textCostMicros(1_000_000, 0), 1_250_000);
          assert.equal(usageUsd(1_250_000), '$1.25');
        }),
      );
      break;
    }

    case 'expenses-gpt-6-2-astra': {
      const { money } = await load('components/ledger.tsx');

      outcomes.push(
        await unitCase('u-money', 'R1', 'money formats positive and negative values', () => {
          assert.equal(money(1234), '$12.34');
          assert.equal(money(-1234), '-$12.34');
        }),
        await unitCase('u-cost-evidence', 'R5', 'usage module is present', () => {
          // lib/ai/usage.ts imports `server-only`, so inspect the source in
          // the worktree instead of importing it outside Next.js.
          const source = fs.readFileSync(
            path.join(worktree!, 'lib/ai/usage.ts'),
            'utf8',
          );
          assert.match(source, /reserveCall/);
          assert.match(source, /usd/);
        }),
      );
      break;
    }

    case 'expenses-big-pickle': {
      const { dollarsToMicros, fromCents, toCents } = await load(
        'lib/transactions/money.ts',
      );

      outcomes.push(
        await unitCase('u-money', 'R1', 'rounding and conversion are exact', () => {
          assert.equal(toCents(0.1 + 0.2), 30);
          assert.equal(fromCents(1250), 12.5);
          assert.equal(dollarsToMicros(0.000001), 1);
        }),
        await unitCase('u-cost-evidence', 'R5', 'pricing module is present', async () => {
          const { calculateCostMicros } = await load('lib/ai/pricing.ts');
          assert.equal(typeof calculateCostMicros, 'function');
        }),
      );
      break;
    }

    case 'expenses-copilot-luna-6': {
      const { calculateAiCostUsd, getEffectiveAiLimit } = await load(
        'lib/ai/costs.ts',
      );

      outcomes.push(
        await unitCase('u-cost-evidence', 'R5', 'model pricing is correct', () => {
          assert.equal(calculateAiCostUsd('chat-model', 1_000_000, 1_000_000), 12);
          assert.equal(
            calculateAiCostUsd('chat-model-reasoning', 1_000_000, 1_000_000),
            0.8,
          );
        }),
        await unitCase('u-limits', 'R6', 'admin cap overrides personal cap', () => {
          assert.equal(getEffectiveAiLimit(20, 10), 10);
          assert.equal(getEffectiveAiLimit(5, null), 5);
        }),
      );
      break;
    }

    default:
      throw new Error(`No unit adapter is defined for branch "${branch}".`);
  }
  if (outcomes.some((outcome) => !outcome)) {
    throw new Error(
      'One or more domain unit checks failed; see unit-results.json.',
    );
  }
});
