import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dollarsToMicros,
  formatMicros,
  formatMoney,
  fromCents,
  microsToDollars,
  toCents,
} from './money';

describe('money helpers', () => {
  it('converts decimal amounts to integer cents', () => {
    assert.equal(toCents(12.5), 1250);
    assert.equal(toCents(0.1 + 0.2), 30);
    assert.equal(fromCents(1250), 12.5);
  });

  it('converts dollars to USD millionths', () => {
    assert.equal(dollarsToMicros(10), 10_000_000);
    assert.equal(dollarsToMicros(0.000001), 1);
    assert.equal(microsToDollars(10_000_000), 10);
  });

  it('formats amounts as USD', () => {
    assert.equal(formatMoney(1250), '$12.50');
    assert.equal(formatMoney(-1250), '-$12.50');
    assert.equal(formatMicros(1_500_000), '$1.50');
  });
});
