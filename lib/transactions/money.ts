/**
 * Money is stored as integer cents (transactions) and integer USD millionths
 * (AI spend) so sums never accumulate floating point drift.
 */

export function toCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function dollarsToMicros(dollars: number): number {
  return Math.round((dollars + Number.EPSILON) * 1_000_000);
}

export function microsToDollars(micros: number): number {
  return micros / 1_000_000;
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(fromCents(cents));
}

export function formatMicros(micros: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(microsToDollars(micros));
}
