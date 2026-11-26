import { z } from 'zod';
import { streamObject } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { codePrompt, updateDocumentPrompt } from '@/lib/ai/prompts';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { recordModelUsage } from '@/lib/ai/record-usage';

export const codeDocumentHandler = createDocumentHandler<'code'>({
  kind: 'code',
  onCreateDocument: async ({ title, dataStream, session }) => {
    let draftContent = '';

    const result = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: codePrompt,
      prompt: title,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of result.fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.writeData({
            type: 'code-delta',
            content: code ?? '',
          });

          draftContent = code;
        }
      }
    }

    if (session.user?.id) {
      const usage = await result.usage;
      await recordModelUsage({
        userId: session.user.id,
        model: 'artifact-model',
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
      });
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, session }) => {
    let draftContent = '';

    const result = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: updateDocumentPrompt(document.content, 'code'),
      prompt: description,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of result.fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.writeData({
            type: 'code-delta',
            content: code ?? '',
          });

          draftContent = code;
        }
      }
    }

    if (session.user?.id) {
      const usage = await result.usage;
      await recordModelUsage({
        userId: session.user.id,
        model: 'artifact-model',
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
      });
    }

    return draftContent;
  },
});
