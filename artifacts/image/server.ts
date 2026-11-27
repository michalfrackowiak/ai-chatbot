import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { experimental_generateImage } from 'ai';
import { imageModel, imageUsd } from '@/lib/ai/model-pricing';
import { beginAiCall, finishAiCall } from '@/lib/db/ai-usage';

async function generateImage(prompt: string) {
  const id = await beginAiCall(imageModel);
  const { image } = await experimental_generateImage({
    model: myProvider.imageModel('small-model'),
    prompt,
    n: 1,
    maxRetries: 0,
  });
  await finishAiCall(id, {
    imageCount: 1,
    costMicros: Math.round(imageUsd * 1_000_000),
  });
  return image.base64;
}

export const imageDocumentHandler = createDocumentHandler<'image'>({
  kind: 'image',
  onCreateDocument: async ({ title, dataStream }) => {
    const draftContent = await generateImage(title);

    dataStream.writeData({
      type: 'image-delta',
      content: draftContent,
    });

    return draftContent;
  },
  onUpdateDocument: async ({ description, dataStream }) => {
    const draftContent = await generateImage(description);

    dataStream.writeData({
      type: 'image-delta',
      content: draftContent,
    });

    return draftContent;
  },
});
