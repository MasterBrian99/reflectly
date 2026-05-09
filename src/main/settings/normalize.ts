import type {
  AgentActivitySettings,
  AppSettings,
  ChatSettings,
  EmbeddingSettings
} from '../../shared/app-settings'
import { defaultAppSettings, getChatProviderOption, getEmbeddingProviderOption } from './catalog'

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

export function normalizeAppSettings(settings?: Partial<AppSettings>): AppSettings {
  return {
    chat: normalizeChatSettings(settings?.chat),
    stage1: normalizeChatSettings(settings?.stage1),
    stage3: normalizeChatSettings(settings?.stage3),
    embeddings: normalizeEmbeddingSettings(settings?.embeddings),
    agentActivity: normalizeAgentActivitySettings(settings?.agentActivity)
  }
}
