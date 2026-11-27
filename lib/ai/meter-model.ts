import { wrapLanguageModel, type LanguageModelV1 } from 'ai';
import { beginAiCall, finishAiCall } from '@/lib/db/ai-usage';
import { textCostMicros } from './model-pricing';

export function meterModel(model: LanguageModelV1) {
  async function record(
    id: string,
    {
      promptTokens,
      completionTokens,
    }: { promptTokens: number; completionTokens: number },
  ) {
    if (!Number.isFinite(promptTokens) || !Number.isFinite(completionTokens))
      return;
    await finishAiCall(id, {
      inputTokens: promptTokens,
      outputTokens: completionTokens,
      costMicros: textCostMicros(promptTokens, completionTokens),
    });
  }

  return wrapLanguageModel({
    model,
    middleware: {
      wrapGenerate: async ({ doGenerate }) => {
        const id = await beginAiCall(model.modelId);
        const result = await doGenerate();
        await record(id, result.usage);
        return result;
      },
      wrapStream: async ({ doStream }) => {
        const id = await beginAiCall(model.modelId);
        const result = await doStream();
        return {
          ...result,
          stream: result.stream.pipeThrough(
            new TransformStream({
              async transform(chunk, controller) {
                if (chunk.type === 'finish') await record(id, chunk.usage);
                controller.enqueue(chunk);
              },
            }),
          ),
        };
      },
    },
  });
}
