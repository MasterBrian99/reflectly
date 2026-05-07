import { Bell, RefreshCw, TriangleAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Outlet } from 'react-router-dom'
import { useSessionShell } from '@/features/sessions/hooks/use-session-shell'
import { useAppSettings } from '@/features/settings/hooks/use-app-settings'
import { WorkspaceSidebar } from '@/features/workspace/components/workspace-sidebar'
import type { WorkspaceShellContext } from '../workspace-shell.types'
import type { WorkspaceViewStatus } from '../workspace.types'

type WorkspaceHomeScreenProps = {
  status: WorkspaceViewStatus
}

export function WorkspaceHomeScreen({ status }: WorkspaceHomeScreenProps): React.JSX.Element {
  const sessionShell = useSessionShell()
  const appSettings = useAppSettings()
  const activeStreamingAssistant = sessionShell.streamingAssistant

  const streamingAssistantContent =
    activeStreamingAssistant &&
    activeStreamingAssistant.sessionId === sessionShell.activeDetail?.session.id
      ? activeStreamingAssistant.content
      : ''

  const outletContext: WorkspaceShellContext = {
    sessionShell,
    appSettings,
    streamingAssistantContent
  }

  return (
    <main className="workspace-app-shell">
      <WorkspaceSidebar
        workspaceName={status.workspaceName ?? 'Local Workspace'}
        sessions={sessionShell.sessions}
        selectedSessionId={sessionShell.selectedSessionId}
        isBusy={sessionShell.isCreatingSession || sessionShell.isLoading}
        onCreateSession={sessionShell.createSession}
        onSelectSession={sessionShell.selectSession}
      />

      <section className="workspace-main-shell">
        <header className="workspace-main-topbar">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Workspace</span>
            <span className="text-foreground/50">›</span>
            <span className="text-foreground">
              {sessionShell.activeDetail?.session.title ?? status.workspaceName ?? 'Reflectly'}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button type="button" className="workspace-topbar-icon">
              <RefreshCw className="size-5" />
            </button>
            <button type="button" className="workspace-topbar-icon">
              <Bell className="size-5" />
            </button>
            <div className="h-10 w-px bg-border/80" />
            <div className="workspace-avatar">R</div>
          </div>
        </header>

        {sessionShell.selectionError ? (
          <Card className="mx-12 mt-4 border-destructive/25 bg-destructive/8">
            <CardContent className="flex items-start gap-3 p-4 text-sm leading-6 text-destructive">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>{sessionShell.selectionError}</p>
            </CardContent>
          </Card>
        ) : null}

        <Outlet context={outletContext} />
      </section>
    </main>
  )
}
