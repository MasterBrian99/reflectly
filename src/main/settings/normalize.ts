import type {
  AgentActivitySettings,
  AppSettings,
  ChatProviderId,
  ChatSettings,
  EmbeddingSettings
} from '../../shared/app-settings'
import { defaultAppSettings, getChatProviderOption, getEmbeddingProviderOption } from './catalog'

export interface LegacyAppSettings {
  activeProviderId?: ChatProviderId
  modelId?: string
  customBaseUrl?: string
  providerApiKeys?: Partial<Record<ChatProviderId, string>>
}

function isLegacyAppSettings(settings: unknown): settings is LegacyAppSettings {
  return (
    typeof settings === 'object' &&
    settings !== null &&
    ('activeProviderId' in settings ||
      'modelId' in settings ||
      'customBaseUrl' in settings ||
      'providerApiKeys' in settings)
  )
}

function normalizeChatSettings(settings?: Partial<ChatSettings>): ChatSettings {
  const providerId = settings?.providerId ?? defaultAppSettings.chat.providerId
  const provider = getChatProviderOption(providerId)

  return {
    providerId,
    modelId: settings?.modelId?.trim() || provider.defaultModelId,
    apiKey: settings?.apiKey?.trim() || '',
    baseUrl: provider.supportsCustomBaseUrl
      ? settings?.baseUrl?.trim() || provider.defaultBaseUrl || ''
      : undefined
  }
}

function normalizeEmbeddingSettings(settings?: Partial<EmbeddingSettings>): EmbeddingSettings {
  const providerId = settings?.providerId ?? defaultAppSettings.embeddings.providerId
  const provider = getEmbeddingProviderOption(providerId)

  return {
    providerId,
    modelId: settings?.modelId?.trim() || provider.defaultModelId,
    apiKey: settings?.apiKey?.trim() || '',
    baseUrl: provider.supportsCustomBaseUrl
      ? settings?.baseUrl?.trim() || provider.defaultBaseUrl || ''
      : undefined
  }
}

function normalizeAgentActivitySettings(
  settings?: Partial<AgentActivitySettings>
): AgentActivitySettings {
  const reasoningEfforts = ['minimal', 'low', 'medium', 'high', 'xhigh'] as const
  const reasoningSummaries = ['auto', 'detailed'] as const

  return {
    showInChat: settings?.showInChat ?? defaultAppSettings.agentActivity.showInChat,
    showModelReasoning:
      settings?.showModelReasoning ?? defaultAppSettings.agentActivity.showModelReasoning,
    reasoningEffort: reasoningEfforts.includes(
      settings?.reasoningEffort as (typeof reasoningEfforts)[number]
    )
      ? (settings?.reasoningEffort as AgentActivitySettings['reasoningEffort'])
      : defaultAppSettings.agentActivity.reasoningEffort,
    reasoningSummary: reasoningSummaries.includes(
      settings?.reasoningSummary as (typeof reasoningSummaries)[number]
    )
      ? (settings?.reasoningSummary as AgentActivitySettings['reasoningSummary'])
      : defaultAppSettings.agentActivity.reasoningSummary
  }
}

function normalizeLegacyAppSettings(settings: LegacyAppSettings): AppSettings {
  const providerId = settings.activeProviderId ?? defaultAppSettings.chat.providerId
  const provider = getChatProviderOption(providerId)

  return {
    chat: normalizeChatSettings({
      providerId,
      modelId: settings.modelId?.trim() || provider.defaultModelId,
      apiKey: settings.providerApiKeys?.[providerId] ?? '',
      baseUrl: settings.customBaseUrl
    }),
    embeddings: normalizeEmbeddingSettings(defaultAppSettings.embeddings),
    agentActivity: normalizeAgentActivitySettings(defaultAppSettings.agentActivity)
  }
}

export function normalizeAppSettings(
  settings?: Partial<AppSettings> | LegacyAppSettings
): AppSettings {
  if (settings && isLegacyAppSettings(settings)) {
    return normalizeLegacyAppSettings(settings)
  }

  return {
    chat: normalizeChatSettings(settings?.chat),
    embeddings: normalizeEmbeddingSettings(settings?.embeddings),
    agentActivity: normalizeAgentActivitySettings(settings?.agentActivity)
  }
}
