import {
  CircleHelp,
  Compass,
  Home,
  MessageSquarePlus,
  Settings,
  ShieldCheck,
  Sparkles,
  SwatchBook,
  WandSparkles
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { SessionSummary } from '@shared/session-chat'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

type WorkspaceSidebarProps = {
  workspaceName?: string
  sessions: SessionSummary[]
  selectedSessionId: string | null
  isBusy: boolean
  onCreateSession: () => Promise<void>
  onSelectSession: (sessionId: string) => Promise<void>
}

function formatSessionLabel(title: string): string {
  return title.trim() || 'Untitled session'
}

export function WorkspaceSidebar({
  workspaceName,
  sessions,
  selectedSessionId,
  isBusy,
  onCreateSession,
  onSelectSession
}: WorkspaceSidebarProps): React.JSX.Element {
  const navigate = useNavigate()

  async function handleCreateSession(): Promise<void> {
    await onCreateSession()
    void navigate('/chat')
  }

  async function handleSelectSession(sessionId: string): Promise<void> {
    await onSelectSession(sessionId)
    void navigate('/chat')
  }

  return (
    <aside className="workspace-sidebar">
      <div className="workspace-sidebar-top">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[2rem] leading-none font-medium tracking-[-0.04em] text-primary">
              Reflectly
            </h1>
            <p className="mt-1 text-lg leading-none text-foreground/85">
              {workspaceName ?? 'Local Workspace'}
            </p>
          </div>
        </div>

        <Button
          className="mt-10 h-15 w-full justify-center rounded-2xl bg-primary px-5 text-lg font-medium hover:bg-primary-strong"
          onClick={() => void handleCreateSession()}
          disabled={isBusy}
        >
          <MessageSquarePlus className="size-5" />
          New Session
        </Button>
      </div>

      <div className="workspace-sidebar-body">
        <div>
          <p className="workspace-sidebar-label">Main</p>
          <div className="mt-4 space-y-1.5">
            <NavLink
              to="/chat"
              className={({ isActive }) =>
                cn('workspace-sidebar-link', isActive && 'workspace-sidebar-link-active')
              }
            >
              <Home className="size-5" />
              Home
            </NavLink>
            <button type="button" className="workspace-sidebar-link workspace-sidebar-link-muted">
              <Compass className="size-5" />
              Reflections
            </button>
            <button type="button" className="workspace-sidebar-link workspace-sidebar-link-muted">
              <WandSparkles className="size-5" />
              Themes
            </button>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn('workspace-sidebar-link', isActive && 'workspace-sidebar-link-active')
              }
            >
              <Settings className="size-5" />
              Settings
            </NavLink>
          </div>
        </div>

        <div className="mt-9 min-h-0 flex-1">
          <p className="workspace-sidebar-label">Recent Sessions</p>
          <ScrollArea className="mt-4 h-full min-h-0 pr-2">
            <div className="space-y-1.5">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={cn(
                    'workspace-session-link',
                    session.id === selectedSessionId && 'workspace-session-link-active'
                  )}
                  onClick={() => void handleSelectSession(session.id)}
                  disabled={isBusy}
                >
                  {formatSessionLabel(session.title)}
                </button>
              ))}
              {sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/65 bg-white/35 px-4 py-5 text-sm leading-6 text-muted-foreground">
                  Your recent sessions will appear here after the first reflection.
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="workspace-sidebar-footer">
        <button type="button" className="workspace-sidebar-footer-link">
          <CircleHelp className="size-5" />
          Help
        </button>
        <button type="button" className="workspace-sidebar-footer-link">
          <ShieldCheck className="size-5" />
          Privacy
        </button>
        <button type="button" className="workspace-sidebar-footer-link">
          <SwatchBook className="size-5" />
          Local-first
        </button>
      </div>
    </aside>
  )
}
