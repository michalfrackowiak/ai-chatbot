import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { experimental_generateImage } from 'ai';
import { reserveCall, recordImage } from '@/lib/ai/usage';

async function generateImage(prompt: string) {
  const id = await reserveCall('grok-2-image');
  const result = await experimental_generateImage({
    model: myProvider.imageModel('small-model'),
    prompt,
    n: 1,
    maxRetries: 0,
  });
  await recordImage(id);
  return result;
}

export const imageDocumentHandler = createDocumentHandler<'image'>({
  kind: 'image',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    const { image } = await generateImage(title);

    draftContent = image.base64;

    dataStream.writeData({
      type: 'image-delta',
      content: image.base64,
    });

    return draftContent;
  },
  onUpdateDocument: async ({ description, dataStream }) => {
    let draftContent = '';

    const { image } = await generateImage(description);

    draftContent = image.base64;

    dataStream.writeData({
      type: 'image-delta',
      content: image.base64,
    });

    return draftContent;
  },
});
