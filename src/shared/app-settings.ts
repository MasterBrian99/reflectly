export type ChatProviderId = 'openai' | 'anthropic' | 'openrouter' | 'custom-openai-compatible'
export type EmbeddingProviderId = 'openai' | 'openrouter' | 'custom-openai-compatible'

export interface ModelPreset {
  id: string
  label: string
}

export interface ProviderOption<PROVIDER_ID extends string> {
  id: PROVIDER_ID
  label: string
  description: string
  apiKeyLabel: string
  apiKeyPlaceholder: string
  supportsCustomBaseUrl: boolean
  defaultBaseUrl?: string
  defaultModelId: string
  modelPresets: ModelPreset[]
}

export type ChatProviderOption = ProviderOption<ChatProviderId>
export type EmbeddingProviderOption = ProviderOption<EmbeddingProviderId>

export interface ProviderSettings<PROVIDER_ID extends string> {
  providerId: PROVIDER_ID
  modelId: string
  apiKey: string
  baseUrl?: string
}

export type ChatSettings = ProviderSettings<ChatProviderId>
export type EmbeddingSettings = ProviderSettings<EmbeddingProviderId>

export interface AppSettings {
  chat: ChatSettings
  embeddings: EmbeddingSettings
}

export interface AppSettingsSnapshot {
  settings: AppSettings
  chatProviders: ChatProviderOption[]
  embeddingProviders: EmbeddingProviderOption[]
}

export interface UpdateAppSettingsRequest {
  settings: AppSettings
}

export interface AppSettingsApi {
  getAppSettings: () => Promise<AppSettingsSnapshot>
  updateAppSettings: (request: UpdateAppSettingsRequest) => Promise<AppSettingsSnapshot>
}
