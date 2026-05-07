import type { AppSettings, ChatProviderOption } from '../../shared/app-settings'

export const chatProviderOptions: ChatProviderOption[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'Direct OpenAI access through the AI SDK provider.',
    apiKeyLabel: 'OpenAI API key',
    apiKeyPlaceholder: 'sk-...',
    supportsCustomBaseUrl: false,
    defaultModelId: 'gpt-4.1-mini',
    modelPresets: [
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'gpt-5-mini', label: 'GPT-5 Mini' },
      { id: 'gpt-5', label: 'GPT-5' }
    ]
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Claude models through the native Anthropic provider.',
    apiKeyLabel: 'Anthropic API key',
    apiKeyPlaceholder: 'sk-ant-...',
    supportsCustomBaseUrl: false,
    defaultModelId: 'claude-3-7-sonnet-20250219',
    modelPresets: [
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
      { id: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' }
    ]
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'OpenRouter through an OpenAI-compatible provider.',
    apiKeyLabel: 'OpenRouter API key',
    apiKeyPlaceholder: 'sk-or-v1-...',
    supportsCustomBaseUrl: false,
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModelId: 'openai/gpt-4.1-mini',
    modelPresets: [
      { id: 'openai/gpt-4.1-mini', label: 'OpenAI GPT-4.1 Mini' },
      { id: 'anthropic/claude-3.7-sonnet', label: 'Anthropic Claude 3.7 Sonnet' },
      { id: 'google/gemini-2.5-flash', label: 'Google Gemini 2.5 Flash' }
    ]
  },
  {
    id: 'custom-openai-compatible',
    label: 'Custom OpenAI-Compatible',
    description: 'Any provider that exposes an OpenAI-compatible chat endpoint.',
    apiKeyLabel: 'Provider API key',
    apiKeyPlaceholder: 'API key',
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'http://localhost:1234/v1',
    defaultModelId: 'model-id',
    modelPresets: [{ id: 'model-id', label: 'Custom model id' }]
  }
]

export const defaultAppSettings: AppSettings = {
  activeProviderId: 'openrouter',
  modelId: 'openai/gpt-4.1-mini',
  customBaseUrl: 'http://localhost:1234/v1',
  providerApiKeys: {}
}

export function getProviderOption(providerId: AppSettings['activeProviderId']): ChatProviderOption {
  return (
    chatProviderOptions.find((provider) => provider.id === providerId) ?? chatProviderOptions[0]
  )
}
