export const DEFAULT_MONTHLY_AI_LIMIT_USD = 10;

export const AI_MODEL_PRICING = {
  'chat-model': {
    providerModel: 'grok-2-vision-1212',
    inputPerMillionUsd: 2,
    outputPerMillionUsd: 10,
  },
  'title-model': {
    providerModel: 'grok-2-1212',
    inputPerMillionUsd: 2,
    outputPerMillionUsd: 10,
  },
  'artifact-model': {
    providerModel: 'grok-2-1212',
    inputPerMillionUsd: 2,
    outputPerMillionUsd: 10,
  },
  'chat-model-reasoning': {
    providerModel: 'grok-3-mini-beta',
    inputPerMillionUsd: 0.3,
    outputPerMillionUsd: 0.5,
  },
} as const;

export function calculateAiCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
) {
  const pricing = (() => {
    switch (model) {
      case 'chat-model':
        return AI_MODEL_PRICING['chat-model'];
      case 'chat-model-reasoning':
        return AI_MODEL_PRICING['chat-model-reasoning'];
      case 'title-model':
        return AI_MODEL_PRICING['title-model'];
      case 'artifact-model':
        return AI_MODEL_PRICING['artifact-model'];
      default:
        throw new Error(`Missing AI pricing for model: ${model}`);
    }
  })();

  return (
    (inputTokens * pricing.inputPerMillionUsd +
      outputTokens * pricing.outputPerMillionUsd) /
    1_000_000
  );
}

export function getEffectiveAiLimit(
  personalLimitUsd: number,
  adminLimitUsd: number | null,
) {
  return adminLimitUsd === null
    ? personalLimitUsd
    : Math.min(personalLimitUsd, adminLimitUsd);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email.toLowerCase());
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[character];
  });
}
