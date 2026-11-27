/**
 * Published xAI rates per 1M tokens, used to turn token usage into USD.
 * These are estimates: providers change prices, and cached-token discounts
 * are not modelled. Update this table when the provider pricing changes.
 */
export interface ModelPricing {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
}

export const modelPricing: Record<string, ModelPricing> = {
  // grok-2-vision-1212
  'chat-model': { inputUsdPerMillion: 2, outputUsdPerMillion: 10 },
  'grok-2-vision-1212': { inputUsdPerMillion: 2, outputUsdPerMillion: 10 },
  // grok-3-mini-beta
  'chat-model-reasoning': {
    inputUsdPerMillion: 0.3,
    outputUsdPerMillion: 0.5,
  },
  'grok-3-mini-beta': { inputUsdPerMillion: 0.3, outputUsdPerMillion: 0.5 },
  // grok-2-1212 (titles and artifacts)
  'title-model': { inputUsdPerMillion: 2, outputUsdPerMillion: 10 },
  'artifact-model': { inputUsdPerMillion: 2, outputUsdPerMillion: 10 },
  'grok-2-1212': { inputUsdPerMillion: 2, outputUsdPerMillion: 10 },
};

export const FALLBACK_PRICING: ModelPricing = {
  inputUsdPerMillion: 2,
  outputUsdPerMillion: 10,
};

export function getModelPricing(model: string): ModelPricing {
  return modelPricing[model] ?? FALLBACK_PRICING;
}

/**
 * tokens * USD-per-million / 1e6 USD * 1e6 micros = tokens * USD-per-million.
 * Rounding to the nearest micro keeps the stored value an integer.
 */
export function calculateCostMicros({
  model,
  promptTokens,
  completionTokens,
}: {
  model: string;
  promptTokens: number;
  completionTokens: number;
}): number {
  const pricing = getModelPricing(model);

  return Math.round(
    promptTokens * pricing.inputUsdPerMillion +
      completionTokens * pricing.outputUsdPerMillion,
  );
}
