import { useOutletContext } from 'react-router-dom'
import { ChatPanel } from '@/features/chat/components/chat-panel'
import type { WorkspaceShellContext } from '../workspace-shell.types'

export function WorkspaceChatRoute(): React.JSX.Element {
  const { sessionShell, streamingAssistantContent } = useOutletContext<WorkspaceShellContext>()

  return (
    <section className="min-h-0 flex-1 overflow-hidden">
      <ChatPanel
        detail={sessionShell.activeDetail}
        isLoadingSession={sessionShell.isLoadingSession}
        isSendingMessage={sessionShell.isSendingMessage}
        sendError={sessionShell.sendError}
        streamingAssistantContent={streamingAssistantContent}
        onCreateSession={sessionShell.createSession}
        onSendMessage={sessionShell.sendMessage}
      />
    </section>
  )
}
