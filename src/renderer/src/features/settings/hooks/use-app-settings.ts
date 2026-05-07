import { useEffect, useState } from 'react'
import type { AppSettings, AppSettingsSnapshot, ChatProviderOption } from '@shared/app-settings'
import { settingsIpcService } from '../services/settings-ipc.service'

export function useAppSettings(): {
  snapshot: AppSettingsSnapshot | null
  draft: AppSettings | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  setActiveProviderId: (providerId: ChatProviderOption['id']) => void
  setModelId: (modelId: string) => void
  setApiKey: (value: string) => void
  setCustomBaseUrl: (value: string) => void
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

  function setActiveProviderId(providerId: ChatProviderOption['id']): void {
    if (!draft || !snapshot) {
      return
    }

    const provider = snapshot.providers.find((item) => item.id === providerId)

    setDraft({
      ...draft,
      activeProviderId: providerId,
      modelId: provider?.defaultModelId ?? draft.modelId
    })
  }

  function setModelId(modelId: string): void {
    if (!draft) {
      return
    }

    setDraft({
      ...draft,
      modelId
    })
  }

  function setApiKey(value: string): void {
    if (!draft) {
      return
    }

    setDraft({
      ...draft,
      providerApiKeys: {
        ...draft.providerApiKeys,
        [draft.activeProviderId]: value
      }
    })
  }

  function setCustomBaseUrl(value: string): void {
    if (!draft) {
      return
    }

    setDraft({
      ...draft,
      customBaseUrl: value
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
    setActiveProviderId,
    setModelId,
    setApiKey,
    setCustomBaseUrl,
    save
  }
}
