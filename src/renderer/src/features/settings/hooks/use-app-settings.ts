import { useEffect, useState } from 'react'
import type {
  AppSettings,
  AppSettingsSnapshot,
  ChatProviderOption,
  EmbeddingProviderOption
} from '@shared/app-settings'
import { settingsIpcService } from '../services/settings-ipc.service'

export function useAppSettings(): {
  snapshot: AppSettingsSnapshot | null
  draft: AppSettings | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  setChatProviderId: (providerId: ChatProviderOption['id']) => void
  setChatModelId: (modelId: string) => void
  setChatApiKey: (value: string) => void
  setChatBaseUrl: (value: string) => void
  setStage1ProviderId: (providerId: ChatProviderOption['id']) => void
  setStage1ModelId: (modelId: string) => void
  setStage1ApiKey: (value: string) => void
  setStage1BaseUrl: (value: string) => void
  setStage3ProviderId: (providerId: ChatProviderOption['id']) => void
  setStage3ModelId: (modelId: string) => void
  setStage3ApiKey: (value: string) => void
  setStage3BaseUrl: (value: string) => void
  setEmbeddingProviderId: (providerId: EmbeddingProviderOption['id']) => void
  setEmbeddingModelId: (modelId: string) => void
  setEmbeddingApiKey: (value: string) => void
  setEmbeddingBaseUrl: (value: string) => void
  setAgentActivityShowInChat: (value: boolean) => void
  setAgentActivityShowModelReasoning: (value: boolean) => void
  setAgentActivityReasoningEffort: (value: AppSettings['agentActivity']['reasoningEffort']) => void
  setAgentActivityReasoningSummary: (
    value: AppSettings['agentActivity']['reasoningSummary']
  ) => void
  save: () => Promise<void>
} {
  const [snapshot, setSnapshot] = useState<AppSettingsSnapshot | null>(null)
  const [draft, setDraft] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        setIsLoading(true)
        setError(null)

        try {
          const nextSnapshot = await settingsIpcService.get()
          setSnapshot(nextSnapshot)
          setDraft(nextSnapshot.settings)
        } catch (loadError) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.')
        } finally {
          setIsLoading(false)
        }
      })()
    })
  }, [])

  // --- Chat (Stage 5) ---

  function setChatProviderId(providerId: ChatProviderOption['id']): void {
    if (!draft || !snapshot) {
      return
    }

    const provider = snapshot.chatProviders.find((item) => item.id === providerId)

    setDraft({
      ...draft,
      chat: {
        ...draft.chat,
        providerId,
        modelId: provider?.defaultModelId ?? draft.chat.modelId,
        baseUrl: provider?.supportsCustomBaseUrl ? provider.defaultBaseUrl : undefined
      }
    })
  }

  function setChatModelId(modelId: string): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, chat: { ...draft.chat, modelId } })
  }

  function setChatApiKey(value: string): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, chat: { ...draft.chat, apiKey: value } })
  }

  function setChatBaseUrl(value: string): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, chat: { ...draft.chat, baseUrl: value } })
  }

  // --- Stage 1 ---

  function setStage1ProviderId(providerId: ChatProviderOption['id']): void {
    if (!draft || !snapshot) {
      return
    }

    const provider = snapshot.chatProviders.find((item) => item.id === providerId)

    setDraft({
      ...draft,
      stage1: {
        ...draft.stage1,
        providerId,
        modelId: provider?.defaultModelId ?? draft.stage1.modelId,
        baseUrl: provider?.supportsCustomBaseUrl ? provider.defaultBaseUrl : undefined
      }
    })
  }

  function setStage1ModelId(modelId: string): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, stage1: { ...draft.stage1, modelId } })
  }

  function setStage1ApiKey(value: string): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, stage1: { ...draft.stage1, apiKey: value } })
  }

  function setStage1BaseUrl(value: string): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, stage1: { ...draft.stage1, baseUrl: value } })
  }

  // --- Stage 3 ---

  function setStage3ProviderId(providerId: ChatProviderOption['id']): void {
    if (!draft || !snapshot) {
      return
    }

    const provider = snapshot.chatProviders.find((item) => item.id === providerId)

    setDraft({
      ...draft,
      stage3: {
        ...draft.stage3,
        providerId,
        modelId: provider?.defaultModelId ?? draft.stage3.modelId,
        baseUrl: provider?.supportsCustomBaseUrl ? provider.defaultBaseUrl : undefined
      }
    })
  }

  function setStage3ModelId(modelId: string): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, stage3: { ...draft.stage3, modelId } })
  }

  function setStage3ApiKey(value: string): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, stage3: { ...draft.stage3, apiKey: value } })
  }

  function setStage3BaseUrl(value: string): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, stage3: { ...draft.stage3, baseUrl: value } })
  }

  // --- Embeddings ---

  function setEmbeddingProviderId(providerId: EmbeddingProviderOption['id']): void {
    if (!draft || !snapshot) {
      return
    }

    const provider = snapshot.embeddingProviders.find((item) => item.id === providerId)

    setDraft({
      ...draft,
      embeddings: {
        ...draft.embeddings,
        providerId,
        modelId: provider?.defaultModelId ?? draft.embeddings.modelId,
        baseUrl: provider?.supportsCustomBaseUrl ? provider.defaultBaseUrl : undefined
      }
    })
  }

  function setEmbeddingModelId(modelId: string): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, embeddings: { ...draft.embeddings, modelId } })
  }

  function setEmbeddingApiKey(value: string): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, embeddings: { ...draft.embeddings, apiKey: value } })
  }

  function setEmbeddingBaseUrl(value: string): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, embeddings: { ...draft.embeddings, baseUrl: value } })
  }

  // --- Agent Activity ---

  function setAgentActivityShowInChat(value: boolean): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, agentActivity: { ...draft.agentActivity, showInChat: value } })
  }

  function setAgentActivityShowModelReasoning(value: boolean): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, agentActivity: { ...draft.agentActivity, showModelReasoning: value } })
  }

  function setAgentActivityReasoningEffort(
    value: AppSettings['agentActivity']['reasoningEffort']
  ): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, agentActivity: { ...draft.agentActivity, reasoningEffort: value } })
  }

  function setAgentActivityReasoningSummary(
    value: AppSettings['agentActivity']['reasoningSummary']
  ): void {
    if (!draft) {
      return
    }

    setDraft({ ...draft, agentActivity: { ...draft.agentActivity, reasoningSummary: value } })
  }

  async function save(): Promise<void> {
    if (!draft) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const nextSnapshot = await settingsIpcService.update(draft)
      setSnapshot(nextSnapshot)
      setDraft(nextSnapshot.settings)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save settings.')
    } finally {
      setIsSaving(false)
    }
  }

  return {
    snapshot,
    draft,
    isLoading,
    isSaving,
    error,
    setChatProviderId,
    setChatModelId,
    setChatApiKey,
    setChatBaseUrl,
    setStage1ProviderId,
    setStage1ModelId,
    setStage1ApiKey,
    setStage1BaseUrl,
    setStage3ProviderId,
    setStage3ModelId,
    setStage3ApiKey,
    setStage3BaseUrl,
    setEmbeddingProviderId,
    setEmbeddingModelId,
    setEmbeddingApiKey,
    setEmbeddingBaseUrl,
    setAgentActivityShowInChat,
    setAgentActivityShowModelReasoning,
    setAgentActivityReasoningEffort,
    setAgentActivityReasoningSummary,
    save
  }
}
