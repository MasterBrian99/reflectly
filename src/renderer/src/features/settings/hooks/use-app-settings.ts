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
  setEmbeddingProviderId: (providerId: EmbeddingProviderOption['id']) => void
  setEmbeddingModelId: (modelId: string) => void
  setEmbeddingApiKey: (value: string) => void
  setEmbeddingBaseUrl: (value: string) => void
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

    setDraft({
      ...draft,
      chat: {
        ...draft.chat,
        modelId
      }
    })
  }

  function setChatApiKey(value: string): void {
    if (!draft) {
      return
    }

    setDraft({
      ...draft,
      chat: {
        ...draft.chat,
        apiKey: value
      }
    })
  }

  function setChatBaseUrl(value: string): void {
    if (!draft) {
      return
    }

    setDraft({
      ...draft,
      chat: {
        ...draft.chat,
        baseUrl: value
      }
    })
  }

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

    setDraft({
      ...draft,
      embeddings: {
        ...draft.embeddings,
        modelId
      }
    })
  }

  function setEmbeddingApiKey(value: string): void {
    if (!draft) {
      return
    }

    setDraft({
      ...draft,
      embeddings: {
        ...draft.embeddings,
        apiKey: value
      }
    })
  }

  function setEmbeddingBaseUrl(value: string): void {
    if (!draft) {
      return
    }

    setDraft({
      ...draft,
      embeddings: {
        ...draft.embeddings,
        baseUrl: value
      }
    })
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
    setEmbeddingProviderId,
    setEmbeddingModelId,
    setEmbeddingApiKey,
    setEmbeddingBaseUrl,
    save
  }
}
