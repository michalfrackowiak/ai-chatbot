import type { UserType } from '@/app/(auth)/auth';

/**
 * Prices are in USD per 1 million tokens, expressed in micro-dollars
 * (1 USD = 1,000,000 micro-dollars) so all arithmetic stays in integers.
 *
 * Verify against https://docs.x.ai/developers/pricing before deploying —
 * models and prices change. Override any entry here in one place.
 */
export type ModelPricing = {
  promptMicrosPerMillion: number;
  completionMicrosPerMillion: number;
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'grok-2-1212': {
    promptMicrosPerMillion: 2_000_000,
    completionMicrosPerMillion: 10_000_000,
  },
  'grok-2-vision-1212': {
    promptMicrosPerMillion: 2_000_000,
    completionMicrosPerMillion: 10_000_000,
  },
  'grok-3-mini-beta': {
    promptMicrosPerMillion: 300_000,
    completionMicrosPerMillion: 500_000,
  },
};

/** Friendly model ids used by the UI map to concrete xAI model ids. */
export const MODEL_ID_ALIASES: Record<string, string> = {
  'chat-model': 'grok-2-vision-1212',
  'chat-model-reasoning': 'grok-3-mini-beta',
  'title-model': 'grok-2-1212',
  'artifact-model': 'grok-2-1212',
};

export function resolveModelId(modelId: string): string {
  return MODEL_ID_ALIASES[modelId] ?? modelId;
}

/**
 * Cost of one request in micro-dollars, rounded to the nearest micro-dollar.
 * Unknown models are billed at the most expensive known rate so that an
 * unpriced model can never silently under-report spend.
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
  const pricing = MODEL_PRICING[resolveModelId(model)] ?? {
    promptMicrosPerMillion: Math.max(
      ...Object.values(MODEL_PRICING).map((p) => p.promptMicrosPerMillion),
    ),
    completionMicrosPerMillion: Math.max(
      ...Object.values(MODEL_PRICING).map((p) => p.completionMicrosPerMillion),
    ),
  };

  return Math.round(
    (promptTokens * pricing.promptMicrosPerMillion +
      completionTokens * pricing.completionMicrosPerMillion) /
      1_000_000,
  );
}

export function formatUsd(micros: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(micros / 1_000_000);
}

export type LimitDefaults = {
  monthlyCostMicros: number;
  monthlyTokenLimit: number;
};

/** $5 / 2M tokens per month for signed-in users, $1 / 400k for guests. */
export const DEFAULT_GLOBAL_LIMIT: LimitDefaults = {
  monthlyCostMicros: 5_000_000,
  monthlyTokenLimit: 2_000_000,
};

export const DEFAULT_GUEST_LIMIT: LimitDefaults = {
  monthlyCostMicros: 1_000_000,
  monthlyTokenLimit: 400_000,
};

export function getDefaultLimit(userType: UserType): LimitDefaults {
  return userType === 'guest' ? DEFAULT_GUEST_LIMIT : DEFAULT_GLOBAL_LIMIT;
}
