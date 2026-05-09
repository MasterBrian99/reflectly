import { useOutletContext } from 'react-router-dom'
import { ChatPanel } from '@/features/chat/components/chat-panel'
import type { WorkspaceShellContext } from '../workspace-shell.types'

export function WorkspaceChatRoute(): React.JSX.Element {
  const { sessionShell, streamingAssistantContent, activeAgentActivities } =
    useOutletContext<WorkspaceShellContext>()

  return (
    <section className="min-h-0 flex-1 overflow-hidden">
      <ChatPanel
        detail={sessionShell.activeDetail}
        isLoadingSession={sessionShell.isLoadingSession}
        isSendingMessage={sessionShell.isSendingMessage}
        isUpdatingSessionLifecycle={sessionShell.isUpdatingSessionLifecycle}
        sendError={sessionShell.sendError}
        streamingAssistantContent={streamingAssistantContent}
        activeAgentActivities={activeAgentActivities}
        agentActivitiesByMessageId={sessionShell.agentActivitiesByMessageId}
        clarificationControlsByMessageId={sessionShell.clarificationControlsByMessageId}
        onCreateSession={sessionShell.createSession}
        onSetIntention={sessionShell.setIntention}
        onSkipIntention={sessionShell.skipIntention}
        onBeginClosing={sessionShell.beginClosing}
        onCloseSession={sessionShell.closeSession}
        onSkipClosing={sessionShell.skipClosing}
        onSendMessage={sessionShell.sendMessage}
      />
    </section>
  )
}
