export const textModel = 'grok-4.20-0309-non-reasoning';
export const reasoningModelId = 'grok-4.20-0309-reasoning';
export const imageModel = 'grok-imagine-image';

export const textInputUsdPerMillion = 1.25;
export const textOutputUsdPerMillion = 2.5;
export const imageUsd = 0.02;

export function textCostMicros(input: number, output: number) {
  return Math.round(
    input * textInputUsdPerMillion + output * textOutputUsdPerMillion,
  );
}

export function usageUsd(micros: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(micros / 1_000_000);
}
