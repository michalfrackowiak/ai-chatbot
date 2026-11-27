import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateCostMicros, getModelPricing } from './pricing';

describe('AI pricing', () => {
  it('uses published rates for known models', () => {
    assert.deepEqual(getModelPricing('chat-model'), {
      inputUsdPerMillion: 2,
      outputUsdPerMillion: 10,
    });
    assert.equal(getModelPricing('chat-model-reasoning').outputUsdPerMillion, 0.5);
  });

  it('calculates 4k in / 800 out at $2 / $10 per million as $0.016', () => {
    assert.equal(
      calculateCostMicros({
        model: 'chat-model',
        promptTokens: 4_000,
        completionTokens: 800,
      }),
      16_000,
    );
  });

  it('calculates reasoning model cost', () => {
    assert.equal(
      calculateCostMicros({
        model: 'chat-model-reasoning',
        promptTokens: 4_000,
        completionTokens: 800,
      }),
      1_600,
    );
  });

  it('falls back to a conservative rate for unknown models', () => {
    assert.equal(
      calculateCostMicros({
        model: 'unknown',
        promptTokens: 1_000,
        completionTokens: 0,
      }),
      2_000,
    );
  });
});
