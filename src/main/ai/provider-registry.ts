import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { EmbeddingModel, LanguageModel } from 'ai'
import type {
  AppSettings,
  ChatProviderOption,
  ChatSettings,
  EmbeddingProviderOption,
  EmbeddingSettings
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

function assertProviderBaseUrl(
  settings: ChatSettings | EmbeddingSettings,
  provider: ChatProviderOption | EmbeddingProviderOption,
  providerLabel: string
): void {
  if (provider.supportsCustomBaseUrl && !getProviderBaseUrl(provider, settings.baseUrl)) {
    throw new SessionChatAppError(
      'MODEL_CONFIG_MISSING',
      `Add a base URL for the ${provider.label.toLowerCase()} ${providerLabel} provider in settings.`
    )
  }
}

function buildChatModel(
  chatSettings: ChatSettings,
  provider: ChatProviderOption,
  modelId: string
): LanguageModel {
  const apiKey = chatSettings.apiKey.trim() || undefined

  switch (provider.id) {
    case 'openai':
      return createOpenAI({ apiKey }).languageModel(modelId)
    case 'anthropic':
      return createAnthropic({ apiKey }).languageModel(modelId)
    case 'openrouter':
      return createOpenAICompatible({
        name: 'openrouter',
        apiKey,
        baseURL: getProviderBaseUrl(provider, chatSettings.baseUrl) ?? provider.defaultBaseUrl ?? ''
      }).languageModel(modelId)
    case 'custom-openai-compatible':
      return createOpenAICompatible({
        name: 'custom-openai-compatible',
        apiKey,
        baseURL: getProviderBaseUrl(provider, chatSettings.baseUrl) ?? provider.defaultBaseUrl ?? ''
      }).languageModel(modelId)
  }
}

function buildEmbeddingModel(
  embeddingSettings: EmbeddingSettings,
  provider: EmbeddingProviderOption,
  modelId: string
): EmbeddingModel {
  const apiKey = embeddingSettings.apiKey.trim() || undefined

  switch (provider.id) {
    case 'openai':
      return createOpenAI({ apiKey }).embeddingModel(modelId)
    case 'openrouter':
      return createOpenAICompatible({
        name: 'openrouter',
        apiKey,
        baseURL:
          getProviderBaseUrl(provider, embeddingSettings.baseUrl) ?? provider.defaultBaseUrl ?? ''
      }).embeddingModel(modelId)
    case 'custom-openai-compatible':
      return createOpenAICompatible({
        name: 'custom-openai-compatible',
        apiKey,
        baseURL:
          getProviderBaseUrl(provider, embeddingSettings.baseUrl) ?? provider.defaultBaseUrl ?? ''
      }).embeddingModel(modelId)
  }
}

function buildChatProvider(
  chatSettings: ChatSettings,
  label: string
): { model: LanguageModel; provider: ChatProviderOption; modelId: string } {
  const provider = getChatProviderOption(chatSettings.providerId)

  assertProviderBaseUrl(chatSettings, provider, label)

  const modelId = chatSettings.modelId.trim() || provider.defaultModelId

  return {
    provider,
    modelId,
    model: buildChatModel(chatSettings, provider, modelId)
  }
}

export class ChatProviderRegistryBuilder {
  private readonly settings: AppSettings

  constructor(settings: AppSettings) {
    this.settings = settings
  }

  build(): { model: LanguageModel; provider: ChatProviderOption; modelId: string } {
    return buildChatProvider(this.settings.chat, 'chat')
  }
}

export class Stage1ProviderRegistryBuilder {
  private readonly settings: AppSettings

  constructor(settings: AppSettings) {
    this.settings = settings
  }

  build(): { model: LanguageModel; provider: ChatProviderOption; modelId: string } {
    return buildChatProvider(this.settings.stage1, 'stage1')
  }
}

export class Stage3ProviderRegistryBuilder {
  private readonly settings: AppSettings

  constructor(settings: AppSettings) {
    this.settings = settings
  }

  build(): { model: LanguageModel; provider: ChatProviderOption; modelId: string } {
    return buildChatProvider(this.settings.stage3, 'stage3')
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
    assertProviderBaseUrl(this.settings.embeddings, this.activeProvider, 'embeddings')
    const modelId = this.settings.embeddings.modelId.trim() || this.activeProvider.defaultModelId

    return {
      provider: this.activeProvider,
      modelId,
      model: buildEmbeddingModel(this.settings.embeddings, this.activeProvider, modelId)
    }
  }
}
