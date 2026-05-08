import { useOutletContext } from 'react-router-dom'
import { SettingsScreen } from '@/features/settings/screens/settings.screen'
import type { WorkspaceShellContext } from '../workspace-shell.types'

export function WorkspaceSettingsRoute(): React.JSX.Element {
  const { appSettings } = useOutletContext<WorkspaceShellContext>()

  return (
    <section className="min-h-0 flex-1 overflow-hidden px-12 pt-8 pb-8">
      <SettingsScreen
        chatProviders={appSettings.snapshot?.chatProviders ?? []}
        embeddingProviders={appSettings.snapshot?.embeddingProviders ?? []}
        draft={appSettings.draft}
        isLoading={appSettings.isLoading}
        isSaving={appSettings.isSaving}
        error={appSettings.error}
        onChatProviderChange={appSettings.setChatProviderId}
        onChatModelChange={appSettings.setChatModelId}
        onChatApiKeyChange={appSettings.setChatApiKey}
        onChatBaseUrlChange={appSettings.setChatBaseUrl}
        onEmbeddingProviderChange={appSettings.setEmbeddingProviderId}
        onEmbeddingModelChange={appSettings.setEmbeddingModelId}
        onEmbeddingApiKeyChange={appSettings.setEmbeddingApiKey}
        onEmbeddingBaseUrlChange={appSettings.setEmbeddingBaseUrl}
        onSave={appSettings.save}
      />
    </section>
  )
}
