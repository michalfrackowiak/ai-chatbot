import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveLimits } from './limits';

describe('usage limit resolution', () => {
  it('falls back to built-in entitlements when nothing is configured', () => {
    const limits = resolveLimits({
      userType: 'guest',
      defaults: null,
      override: null,
    });

    assert.equal(limits.maxMessagesPerDay, 20);
    assert.equal(limits.maxMonthlySpendMicros, 10_000_000);
  });

  it('lets global defaults override built-in entitlements', () => {
    const limits = resolveLimits({
      userType: 'guest',
      defaults: { maxMessagesPerDay: 5, maxMonthlySpendMicros: 2_000_000 },
      override: null,
    });

    assert.equal(limits.maxMessagesPerDay, 5);
    assert.equal(limits.maxMonthlySpendMicros, 2_000_000);
  });

  it('lets per-user overrides win over global defaults', () => {
    const limits = resolveLimits({
      userType: 'regular',
      defaults: { maxMessagesPerDay: 5, maxMonthlySpendMicros: 2_000_000 },
      override: { maxMessagesPerDay: 50, maxMonthlySpendMicros: null },
    });

    assert.equal(limits.maxMessagesPerDay, 50);
    assert.equal(limits.maxMonthlySpendMicros, 2_000_000);
  });

  it('supports unlimited values', () => {
    const limits = resolveLimits({
      userType: 'regular',
      defaults: null,
      override: { maxMessagesPerDay: -1, maxMonthlySpendMicros: -1 },
    });

    assert.equal(limits.maxMessagesPerDay, -1);
    assert.equal(limits.maxMonthlySpendMicros, -1);
  });
});
