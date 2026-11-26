import { myProvider } from '@/lib/ai/providers';
import { sheetPrompt, updateDocumentPrompt } from '@/lib/ai/prompts';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { streamObject } from 'ai';
import { z } from 'zod';
import { recordModelUsage } from '@/lib/ai/record-usage';

export const sheetDocumentHandler = createDocumentHandler<'sheet'>({
  kind: 'sheet',
  onCreateDocument: async ({ title, dataStream, session }) => {
    let draftContent = '';

    const result = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: sheetPrompt,
      prompt: title,
      schema: z.object({
        csv: z.string().describe('CSV data'),
      }),
    });

    for await (const delta of result.fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.writeData({
            type: 'sheet-delta',
            content: csv,
          });

          draftContent = csv;
        }
      }
    }

    dataStream.writeData({
      type: 'sheet-delta',
      content: draftContent,
    });

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
      system: updateDocumentPrompt(document.content, 'sheet'),
      prompt: description,
      schema: z.object({
        csv: z.string(),
      }),
    });

    for await (const delta of result.fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.writeData({
            type: 'sheet-delta',
            content: csv,
          });

          draftContent = csv;
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
