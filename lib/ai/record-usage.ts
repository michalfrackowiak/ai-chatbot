import { calculateAiCostUsd } from './costs';
import { recordAiUsage } from '@/lib/db/queries';

export async function recordModelUsage({
  userId,
  model,
  promptTokens,
  completionTokens,
}: {
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}) {
  if (!promptTokens && !completionTokens) return;

  await recordAiUsage({
    userId,
    model,
    inputTokens: promptTokens,
    outputTokens: completionTokens,
    costUsd: calculateAiCostUsd(model, promptTokens, completionTokens),
  });
}
