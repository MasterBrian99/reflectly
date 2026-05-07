export type ChatProviderId = 'openai' | 'anthropic' | 'openrouter' | 'custom-openai-compatible'

export interface ChatModelPreset {
  id: string
  label: string
}

export interface ChatProviderOption {
  id: ChatProviderId
  label: string
  description: string
  apiKeyLabel: string
  apiKeyPlaceholder: string
  supportsCustomBaseUrl: boolean
  defaultBaseUrl?: string
  defaultModelId: string
  modelPresets: ChatModelPreset[]
}

export interface AppSettings {
  activeProviderId: ChatProviderId
  modelId: string
  customBaseUrl: string
  providerApiKeys: Partial<Record<ChatProviderId, string>>
}

export interface AppSettingsSnapshot {
  settings: AppSettings
  providers: ChatProviderOption[]
}

export interface UpdateAppSettingsRequest {
  settings: AppSettings
}

export interface AppSettingsApi {
  getAppSettings: () => Promise<AppSettingsSnapshot>
  updateAppSettings: (request: UpdateAppSettingsRequest) => Promise<AppSettingsSnapshot>
}
