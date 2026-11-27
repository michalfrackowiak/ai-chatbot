import { customProvider } from 'ai';
import { xai } from '@ai-sdk/xai';
import { isTestEnvironment } from '../constants';
import { meterModel } from './meter-model';
import { imageModel, reasoningModelId, textModel } from './model-pricing';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

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
        'chat-model': meterModel(xai(textModel)),
        'chat-model-reasoning': meterModel(xai(reasoningModelId)),
        'title-model': meterModel(xai(textModel)),
        'artifact-model': meterModel(xai(textModel)),
      },
      imageModels: {
        'small-model': xai.image(imageModel),
      },
    });
