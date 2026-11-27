import { dollarsToMicros } from '@/lib/transactions/money';
import type { UserType } from '@/app/(auth)/auth';
import { entitlementsByUserType } from './entitlements';

export interface UsageLimits {
  /** -1 means unlimited. */
  maxMessagesPerDay: number;
  /** USD encoded as millionths; -1 means unlimited. */
  maxMonthlySpendMicros: number;
}

export interface StoredUsageLimits {
  maxMessagesPerDay: number | null;
  maxMonthlySpendMicros: number | null;
}

export const DEFAULT_USAGE_LIMITS: UsageLimits = {
  maxMessagesPerDay: 100,
  maxMonthlySpendMicros: dollarsToMicros(10),
};

/**
 * Precedence: per-user override, then the admin-configured global default,
 * then the built-in entitlement for the user type.
 */
export function resolveLimits({
  userType,
  defaults,
  override,
}: {
  userType: UserType;
  defaults: StoredUsageLimits | null;
  override: StoredUsageLimits | null;
}): UsageLimits {
  const builtInMessages = entitlementsByUserType[userType].maxMessagesPerDay;

  return {
    maxMessagesPerDay:
      override?.maxMessagesPerDay ??
      defaults?.maxMessagesPerDay ??
      builtInMessages,
    maxMonthlySpendMicros:
      override?.maxMonthlySpendMicros ??
      defaults?.maxMonthlySpendMicros ??
      DEFAULT_USAGE_LIMITS.maxMonthlySpendMicros,
  };
}
