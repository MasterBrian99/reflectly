import { useOutletContext } from 'react-router-dom'
import { SettingsScreen } from '@/features/settings/screens/settings.screen'
import type { WorkspaceShellContext } from '../workspace-shell.types'

export function WorkspaceSettingsRoute(): React.JSX.Element {
  const { appSettings } = useOutletContext<WorkspaceShellContext>()

  return (
    <section className="min-h-0 flex-1 overflow-hidden px-12 pt-8 pb-8">
      <SettingsScreen
        providers={appSettings.snapshot?.providers ?? []}
        draft={appSettings.draft}
        isLoading={appSettings.isLoading}
        isSaving={appSettings.isSaving}
        error={appSettings.error}
        onProviderChange={appSettings.setActiveProviderId}
        onModelChange={appSettings.setModelId}
        onApiKeyChange={appSettings.setApiKey}
        onCustomBaseUrlChange={appSettings.setCustomBaseUrl}
        onSave={appSettings.save}
      />
    </section>
  )
}
