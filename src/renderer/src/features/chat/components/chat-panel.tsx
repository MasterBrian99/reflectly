import { ImagePlus, LoaderCircle, Mic, SendHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SessionChatError, SessionDetail } from '@shared/session-chat'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type ChatPanelProps = {
  detail: SessionDetail | null
  isLoadingSession: boolean
  isSendingMessage: boolean
  sendError: SessionChatError | null
  streamingAssistantContent: string
  onCreateSession: () => Promise<void>
  onSendMessage: (content: string) => Promise<SessionChatError | null>
}

function formatRelativeTime(isoTimestamp: string): string {
  const timestamp = new Date(isoTimestamp).getTime()
  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000))

  if (diffMinutes < 60) {
    return `Session started ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  }

  const diffHours = Math.round(diffMinutes / 60)

  if (diffHours < 24) {
    return `Session started ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }

  const diffDays = Math.round(diffHours / 24)
  return `Session started ${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

function TranscriptBlock({
  role,
  content,
  isStreaming = false
}: {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}): React.JSX.Element {
  const isUser = role === 'user'

  return (
    <article
      className={cn('workspace-transcript-block', isUser && 'workspace-transcript-block-user')}
    >
      <p
        className={cn(
          'workspace-transcript-copy whitespace-pre-wrap',
          isUser ? 'not-italic text-foreground' : 'italic text-foreground/95'
        )}
      >
        {isUser ? content : `Reflectly: ${content}`}
      </p>
      {isStreaming ? (
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Streaming
        </p>
      ) : null}
    </article>
  )
}

export function ChatPanel({
  detail,
  isLoadingSession,
  isSendingMessage,
  sendError,
  streamingAssistantContent,
  onCreateSession,
  onSendMessage
}: ChatPanelProps): React.JSX.Element {
  const [draft, setDraft] = useState('')
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({
      block: 'end'
    })
  }, [detail?.session.id, detail?.messages.length, isLoadingSession, streamingAssistantContent])

  async function handleSend(): Promise<void> {
    if (!draft.trim() || !detail || isSendingMessage) {
      return
    }

    const sentDraft = draft
    const error = await onSendMessage(sentDraft)

    if (!error || error.userMessage) {
      setDraft('')
    }
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void handleSend()
    }
  }

  if (!detail) {
    return (
      <section className="flex h-full min-h-0 flex-col items-center justify-center px-10 text-center">
        <div className="max-w-xl">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <h2 className="mt-6 text-4xl tracking-[-0.03em] text-foreground">
            Open a session to begin reflecting
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-8 text-muted-foreground">
            Create a session, stream a reply, and keep provider settings separate from the workspace
            data.
          </p>
          <Button size="lg" className="mt-8" onClick={() => void onCreateSession()}>
            Start first session
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="px-16 pt-12 pb-5">
          <h2 className="text-6xl leading-none font-light tracking-[-0.05em] text-foreground">
            {detail.session.title}
          </h2>
          <p className="mt-5 text-2xl font-light text-muted-foreground">
            {formatRelativeTime(detail.session.createdAt)}
          </p>
        </div>

        <ScrollArea className="workspace-chat-scroll flex-1">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-14 px-16 pt-10 pb-14">
            {detail.messages.map((message) => (
              <TranscriptBlock key={message.id} role={message.role} content={message.content} />
            ))}

            {streamingAssistantContent ? (
              <TranscriptBlock role="assistant" content={streamingAssistantContent} isStreaming />
            ) : null}

            {isSendingMessage && !streamingAssistantContent ? (
              <article className="workspace-transcript-block">
                <div className="flex items-center gap-3 text-sm uppercase tracking-[0.18em] text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Reflectly is responding
                </div>
              </article>
            ) : null}

            <div ref={transcriptBottomRef} />
          </div>
        </ScrollArea>
      </div>

      <div className="workspace-composer-shell">
        <div className="workspace-composer-card">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Share a reflection..."
            className="workspace-composer-textarea"
            disabled={isSendingMessage}
          />

          {sendError ? (
            <div className="px-7 pb-4 text-sm leading-6 text-destructive">{sendError.message}</div>
          ) : null}

          <div className="workspace-composer-footer">
            <div className="flex items-center gap-5 text-muted-foreground">
              <button type="button" className="workspace-composer-icon">
                <Mic className="size-4.5" />
              </button>
              <button type="button" className="workspace-composer-icon">
                <ImagePlus className="size-4.5" />
              </button>
              <div className="h-6 w-px bg-border/80" />
              <p className="text-base text-muted-foreground">Press Cmd + Enter to save</p>
            </div>

            <Button
              size="lg"
              className="h-13 rounded-2xl px-7 text-2xl font-medium"
              onClick={() => void handleSend()}
              disabled={isSendingMessage || !draft.trim()}
            >
              {isSendingMessage ? <LoaderCircle className="size-5 animate-spin" /> : null}
              Reflect
              <SendHorizontal className="size-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
