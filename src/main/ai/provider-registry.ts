import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createProviderRegistry } from 'ai'
import type { LanguageModel } from 'ai'
import type { AppSettings, ChatProviderOption } from '../../shared/app-settings'
import { SessionChatAppError } from '../session-chat/error'
import { chatProviderOptions, getProviderOption } from '../settings/catalog'

function getProviderApiKey(
  settings: AppSettings,
  providerId: AppSettings['activeProviderId']
): string {
  return settings.providerApiKeys[providerId]?.trim() || ''
}

export class ChatProviderRegistryBuilder {
  private readonly settings: AppSettings
  private readonly activeProvider: ChatProviderOption

  constructor(settings: AppSettings) {
    this.settings = settings
    this.activeProvider = getProviderOption(settings.activeProviderId)
  }

  build(): {
    model: LanguageModel
    provider: ChatProviderOption
    modelId: string
  } {
    const apiKey = getProviderApiKey(this.settings, this.activeProvider.id)

    if (!apiKey) {
      throw new SessionChatAppError(
        'MODEL_CONFIG_MISSING',
        `Add a ${this.activeProvider.apiKeyLabel.toLowerCase()} in settings before sending a message.`
      )
    }

    if (
      this.activeProvider.id === 'custom-openai-compatible' &&
      !this.settings.customBaseUrl.trim()
    ) {
      throw new SessionChatAppError(
        'MODEL_CONFIG_MISSING',
        'Add a base URL for the custom OpenAI-compatible provider in settings.'
      )
    }

    const registry = createProviderRegistry({
      openai: createOpenAI({
        apiKey: getProviderApiKey(this.settings, 'openai')
      }),
      anthropic: createAnthropic({
        apiKey: getProviderApiKey(this.settings, 'anthropic')
      }),
      openrouter: createOpenAICompatible({
        name: 'openrouter',
        apiKey: getProviderApiKey(this.settings, 'openrouter'),
        baseURL:
          chatProviderOptions.find((provider) => provider.id === 'openrouter')?.defaultBaseUrl ??
          'https://openrouter.ai/api/v1'
      }),
      'custom-openai-compatible': createOpenAICompatible({
        name: 'custom-openai-compatible',
        apiKey: getProviderApiKey(this.settings, 'custom-openai-compatible'),
        baseURL: this.settings.customBaseUrl.trim()
      })
    })

    const modelId = this.settings.modelId.trim() || this.activeProvider.defaultModelId

    return {
      provider: this.activeProvider,
      modelId,
      model: registry.languageModel(`${this.activeProvider.id}:${modelId}`)
    }
  }
}
