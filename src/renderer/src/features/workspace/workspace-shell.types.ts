import type { useAppSettings } from '@/features/settings/hooks/use-app-settings'
import type { useSessionShell } from '@/features/sessions/hooks/use-session-shell'

export interface WorkspaceShellContext {
  sessionShell: ReturnType<typeof useSessionShell>
  appSettings: ReturnType<typeof useAppSettings>
  streamingAssistantContent: string
  activeAgentActivities: ReturnType<typeof useSessionShell>['agentActivitiesByRequestId'][string]
}
