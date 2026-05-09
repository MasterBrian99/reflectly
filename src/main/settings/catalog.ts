import type {
  AppSettings,
  ChatProviderId,
  ChatProviderOption,
  EmbeddingProviderId,
  EmbeddingProviderOption
} from '../../shared/app-settings'

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

export const embeddingProviderOptions: EmbeddingProviderOption[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'OpenAI embedding models for semantic retrieval.',
    apiKeyLabel: 'OpenAI embedding API key',
    apiKeyPlaceholder: 'sk-...',
    supportsCustomBaseUrl: false,
    defaultModelId: 'text-embedding-3-small',
    modelPresets: [
      { id: 'text-embedding-3-small', label: 'text-embedding-3-small' },
      { id: 'text-embedding-3-large', label: 'text-embedding-3-large' }
    ]
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'OpenRouter embeddings through an OpenAI-compatible endpoint.',
    apiKeyLabel: 'OpenRouter embedding API key',
    apiKeyPlaceholder: 'sk-or-v1-...',
    supportsCustomBaseUrl: false,
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModelId: 'openai/text-embedding-3-small',
    modelPresets: [
      { id: 'openai/text-embedding-3-small', label: 'OpenAI text-embedding-3-small' },
      { id: 'openai/text-embedding-3-large', label: 'OpenAI text-embedding-3-large' }
    ]
  },
  {
    id: 'custom-openai-compatible',
    label: 'Custom OpenAI-Compatible',
    description: 'Any provider that exposes an OpenAI-compatible embeddings endpoint.',
    apiKeyLabel: 'Embedding API key',
    apiKeyPlaceholder: 'API key',
    supportsCustomBaseUrl: true,
    defaultBaseUrl: 'http://localhost:1234/v1',
    defaultModelId: 'text-embedding-3-small',
    modelPresets: [{ id: 'text-embedding-3-small', label: 'Custom embedding model id' }]
  }
]

export const defaultAppSettings: AppSettings = {
  chat: {
    providerId: 'openrouter',
    modelId: 'openai/gpt-4.1-mini',
    apiKey: ''
  },
  stage1: {
    providerId: 'openrouter',
    modelId: 'openai/gpt-4.1-mini',
    apiKey: ''
  },
  stage3: {
    providerId: 'openrouter',
    modelId: 'openai/gpt-4.1-mini',
    apiKey: ''
  },
  embeddings: {
    providerId: 'openai',
    modelId: 'text-embedding-3-small',
    apiKey: ''
  },
  agentActivity: {
    showInChat: true,
    showModelReasoning: false,
    reasoningEffort: 'low',
    reasoningSummary: 'auto'
  }
}

export function getChatProviderOption(providerId: ChatProviderId): ChatProviderOption {
  return (
    chatProviderOptions.find((provider) => provider.id === providerId) ?? chatProviderOptions[0]
  )
}

export function getEmbeddingProviderOption(
  providerId: EmbeddingProviderId
): EmbeddingProviderOption {
  return (
    embeddingProviderOptions.find((provider) => provider.id === providerId) ??
    embeddingProviderOptions[0]
  )
}
