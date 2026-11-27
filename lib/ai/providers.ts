import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { xai } from '@ai-sdk/xai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

import { meter } from './usage';

const textModel = () =>
  wrapLanguageModel({ model: xai('grok-4.3'), middleware: meter });

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': textModel(),
        'chat-model-reasoning': wrapLanguageModel({
          model: textModel(),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': textModel(),
        'artifact-model': textModel(),
      },
      imageModels: {
        'small-model': xai.image('grok-2-image'),
      },
    });
