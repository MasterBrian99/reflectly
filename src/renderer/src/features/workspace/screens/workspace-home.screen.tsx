import { AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ChatPanel } from '@/features/chat/components/chat-panel'
import { SessionList } from '@/features/sessions/components/session-list'
import { useSessionShell } from '@/features/sessions/hooks/use-session-shell'
import type { WorkspaceViewStatus } from '../workspace.types'

type WorkspaceHomeScreenProps = {
  status: WorkspaceViewStatus
}

export function WorkspaceHomeScreen({ status }: WorkspaceHomeScreenProps): React.JSX.Element {
  const sessionShell = useSessionShell()

  return (
    <main className="app-page">
      <div className="app-page-inner app-page-inner-shell">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/80 pb-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="app-kicker">Workspace</p>
              <Badge variant="secondary">{status.workspaceName ?? 'Reflectly'}</Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground">
              Reflective sessions
            </h1>
            <p className="app-copy max-w-3xl text-base">
              Continue past threads, start a fresh session, and keep the transcript anchored to the
              workspace on this device.
            </p>
          </div>

          {status.workspacePath ? (
            <div className="max-w-md text-right text-sm leading-6 text-muted-foreground">
              <span className="font-medium text-foreground">Workspace path:</span>{' '}
              <span className="break-all">{status.workspacePath}</span>
            </div>
          ) : null}
        </header>

        {sessionShell.selectionError ? (
          <Card className="mt-6 border-destructive/25 bg-destructive/8">
            <CardContent className="flex items-start gap-3 p-4 text-sm leading-6 text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{sessionShell.selectionError}</p>
            </CardContent>
          </Card>
        ) : null}

        <section className="mt-6 grid flex-1 gap-4 xl:grid-cols-[23rem_minmax(0,1fr)]">
          <SessionList
            sessions={sessionShell.sessions}
            selectedSessionId={sessionShell.selectedSessionId}
            isBusy={sessionShell.isCreatingSession || sessionShell.isLoading}
            onCreateSession={sessionShell.createSession}
            onSelectSession={sessionShell.selectSession}
          />

          <ChatPanel
            detail={sessionShell.activeDetail}
            isLoadingSession={sessionShell.isLoadingSession}
            isSendingMessage={sessionShell.isSendingMessage}
            sendError={sessionShell.sendError}
            onCreateSession={sessionShell.createSession}
            onSendMessage={sessionShell.sendMessage}
          />
        </section>
      </div>
    </main>
  )
}
