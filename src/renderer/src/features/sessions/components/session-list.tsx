import { MessageSquarePlus, Sparkles } from 'lucide-react'
import type { SessionSummary } from '@shared/session-chat'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type SessionListProps = {
  sessions: SessionSummary[]
  selectedSessionId: string | null
  isBusy: boolean
  onCreateSession: () => Promise<void>
  onSelectSession: (sessionId: string) => Promise<void>
}

function formatSessionDate(isoTimestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric'
  }).format(new Date(isoTimestamp))
}

export function SessionList({
  sessions,
  selectedSessionId,
  isBusy,
  onCreateSession,
  onSelectSession
}: SessionListProps): React.JSX.Element {
  return (
    <Card className="flex h-full min-h-[36rem] flex-col overflow-hidden border-white/65 bg-white/70">
      <CardHeader className="gap-4 border-b border-border/70">
        <div className="space-y-2">
          <p className="app-kicker">Sessions</p>
          <CardTitle className="text-[1.4rem]">Reflection threads</CardTitle>
          <CardDescription>
            Start a new session when you want a fresh thread, or continue an earlier exchange.
          </CardDescription>
        </div>

        <Button size="lg" onClick={() => void onCreateSession()} disabled={isBusy}>
          <MessageSquarePlus className="size-4" />
          New session
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-3">
        {sessions.length === 0 ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-border/80 bg-secondary/35 px-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Nothing started yet</h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              Create your first session to open a private transcript and send the first message.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const isSelected = session.id === selectedSessionId

              return (
                <button
                  key={session.id}
                  type="button"
                  className={cn(
                    'w-full rounded-[1.25rem] border px-4 py-3 text-left transition-colors',
                    isSelected
                      ? 'border-primary/30 bg-primary/10 shadow-sm'
                      : 'border-transparent bg-white/60 hover:border-border/70 hover:bg-white/80'
                  )}
                  onClick={() => void onSelectSession(session.id)}
                  disabled={isBusy}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {session.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {session.messageCount} {session.messageCount === 1 ? 'message' : 'messages'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatSessionDate(session.updatedAt)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
