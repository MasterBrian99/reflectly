import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { EmbeddingModel, LanguageModel } from 'ai'
import type {
  AppSettings,
  ChatProviderOption,
  EmbeddingProviderOption,
  ProviderSettings
} from '../../shared/app-settings'
import { SessionChatAppError } from '../session-chat/error'
import { getChatProviderOption, getEmbeddingProviderOption } from '../settings/catalog'

function getProviderBaseUrl(
  provider: Pick<ChatProviderOption | EmbeddingProviderOption, 'defaultBaseUrl' | 'id'>,
  baseUrl?: string
): string | undefined {
  if (provider.id === 'openrouter') {
    return provider.defaultBaseUrl
  }

  return baseUrl?.trim() || provider.defaultBaseUrl
}

function assertProviderConfig(
  settings: ProviderSettings<string>,
  provider: ChatProviderOption | EmbeddingProviderOption,
  providerLabel: string,
  options?: {
    allowEmptyApiKey?: boolean
  }
): void {
  if (!options?.allowEmptyApiKey && !settings.apiKey.trim()) {
    throw new SessionChatAppError(
      'MODEL_CONFIG_MISSING',
      `Add a ${provider.apiKeyLabel.toLowerCase()} in settings before using ${providerLabel}.`
    )
  }

  if (provider.supportsCustomBaseUrl && !getProviderBaseUrl(provider, settings.baseUrl)) {
    throw new SessionChatAppError(
      'MODEL_CONFIG_MISSING',
      `Add a base URL for the ${provider.label.toLowerCase()} ${providerLabel} provider in settings.`
    )
  }
}

function buildChatModel(
  settings: AppSettings,
  provider: ChatProviderOption,
  modelId: string
): LanguageModel {
  switch (provider.id) {
    case 'openai':
      return createOpenAI({
        apiKey: settings.chat.apiKey.trim()
      }).languageModel(modelId)
    case 'anthropic':
      return createAnthropic({
        apiKey: settings.chat.apiKey.trim()
      }).languageModel(modelId)
    case 'openrouter':
      return createOpenAICompatible({
        name: 'openrouter',
        apiKey: settings.chat.apiKey.trim(),
        baseURL:
          getProviderBaseUrl(provider, settings.chat.baseUrl) ?? provider.defaultBaseUrl ?? ''
      }).languageModel(modelId)
    case 'custom-openai-compatible':
      return createOpenAICompatible({
        name: 'custom-openai-compatible',
        apiKey: settings.chat.apiKey.trim(),
        baseURL:
          getProviderBaseUrl(provider, settings.chat.baseUrl) ?? provider.defaultBaseUrl ?? ''
      }).languageModel(modelId)
  }
}

function buildEmbeddingModel(
  settings: AppSettings,
  provider: EmbeddingProviderOption,
  modelId: string
): EmbeddingModel {
  switch (provider.id) {
    case 'openai':
      return createOpenAI({
        apiKey: settings.embeddings.apiKey.trim()
      }).embeddingModel(modelId)
    case 'openrouter':
      return createOpenAICompatible({
        name: 'openrouter',
        apiKey: settings.embeddings.apiKey.trim(),
        baseURL:
          getProviderBaseUrl(provider, settings.embeddings.baseUrl) ?? provider.defaultBaseUrl ?? ''
      }).embeddingModel(modelId)
    case 'custom-openai-compatible':
      return createOpenAICompatible({
        name: 'custom-openai-compatible',
        apiKey: settings.embeddings.apiKey.trim() || undefined,
        baseURL:
          getProviderBaseUrl(provider, settings.embeddings.baseUrl) ?? provider.defaultBaseUrl ?? ''
      }).embeddingModel(modelId)
  }
}

export class ChatProviderRegistryBuilder {
  private readonly settings: AppSettings
  private readonly activeProvider: ChatProviderOption

  constructor(settings: AppSettings) {
    this.settings = settings
    this.activeProvider = getChatProviderOption(settings.chat.providerId)
  }

  build(): {
    model: LanguageModel
    provider: ChatProviderOption
    modelId: string
  } {
    assertProviderConfig(this.settings.chat, this.activeProvider, 'chat')
    const modelId = this.settings.chat.modelId.trim() || this.activeProvider.defaultModelId

    return {
      provider: this.activeProvider,
      modelId,
      model: buildChatModel(this.settings, this.activeProvider, modelId)
    }
  }
}

export class EmbeddingProviderRegistryBuilder {
  private readonly settings: AppSettings
  private readonly activeProvider: EmbeddingProviderOption

  constructor(settings: AppSettings) {
    this.settings = settings
    this.activeProvider = getEmbeddingProviderOption(settings.embeddings.providerId)
  }

  isConfigured(): boolean {
    if (
      this.activeProvider.id !== 'custom-openai-compatible' &&
      !this.settings.embeddings.apiKey.trim()
    ) {
      return false
    }

    if (this.activeProvider.supportsCustomBaseUrl) {
      return Boolean(getProviderBaseUrl(this.activeProvider, this.settings.embeddings.baseUrl))
    }

    return true
  }

  build(): {
    model: EmbeddingModel
    provider: EmbeddingProviderOption
    modelId: string
  } {
    assertProviderConfig(this.settings.embeddings, this.activeProvider, 'embeddings', {
      allowEmptyApiKey: this.activeProvider.id === 'custom-openai-compatible'
    })
    const modelId = this.settings.embeddings.modelId.trim() || this.activeProvider.defaultModelId

    return {
      provider: this.activeProvider,
      modelId,
      model: buildEmbeddingModel(this.settings, this.activeProvider, modelId)
    }
  }
}
