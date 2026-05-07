import { LoaderCircle, SendHorizontal, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { SessionChatError, SessionDetail } from '@shared/session-chat'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type ChatPanelProps = {
  detail: SessionDetail | null
  isLoadingSession: boolean
  isSendingMessage: boolean
  sendError: SessionChatError | null
  onCreateSession: () => Promise<void>
  onSendMessage: (content: string) => Promise<SessionChatError | null>
}

function MessageBubble({
  role,
  content,
  createdAt
}: {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}): React.JSX.Element {
  const isUser = role === 'user'

  return (
    <article className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[42rem] rounded-[1.5rem] px-4 py-3 shadow-sm',
          isUser
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md border border-border/80 bg-white/85 text-foreground'
        )}
      >
        <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] opacity-80">
          <span>{isUser ? 'You' : 'Reflectly'}</span>
          <span>
            {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
              new Date(createdAt)
            )}
          </span>
        </div>
        <p
          className={cn(
            'whitespace-pre-wrap text-sm leading-7',
            isUser ? 'text-primary-foreground' : 'text-foreground'
          )}
        >
          {content}
        </p>
      </div>
    </article>
  )
}

export function ChatPanel({
  detail,
  isLoadingSession,
  isSendingMessage,
  sendError,
  onCreateSession,
  onSendMessage
}: ChatPanelProps): React.JSX.Element {
  const [draft, setDraft] = useState('')

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

  if (!detail) {
    return (
      <Card className="flex h-full min-h-[36rem] flex-col items-center justify-center border-white/65 bg-white/70 text-center">
        <CardHeader className="max-w-xl items-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <CardTitle className="mt-2 text-3xl tracking-[-0.03em]">
            Open a session to begin reflecting
          </CardTitle>
          <CardDescription className="max-w-md text-base">
            The next milestone is live now: create a session, send a message, and Reflectly will
            save both sides of the exchange inside your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" onClick={() => void onCreateSession()}>
            Start first session
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid h-full min-h-[36rem] gap-4 lg:grid-rows-[minmax(0,1fr)_auto]">
      <Card className="flex min-h-0 flex-col overflow-hidden border-white/65 bg-white/70">
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="app-kicker">Transcript</p>
                <Badge variant="secondary">
                  {detail.session.messageCount}{' '}
                  {detail.session.messageCount === 1 ? 'message' : 'messages'}
                </Badge>
              </div>
              <CardTitle className="text-[1.6rem]">{detail.session.title}</CardTitle>
            </div>

            {isLoadingSession ? (
              <Badge variant="secondary" className="gap-2">
                <LoaderCircle className="size-3.5 animate-spin" />
                Loading
              </Badge>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            {detail.messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
                createdAt={message.createdAt}
              />
            ))}

            {isSendingMessage ? (
              <article className="flex justify-start">
                <div className="rounded-[1.5rem] rounded-bl-md border border-border/80 bg-white/85 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" />
                    Reflectly is writing back
                  </div>
                </div>
              </article>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/65 bg-white/78">
        <CardContent className="p-5">
          <div className="space-y-4">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write what’s on your mind. Reflectly saves your message locally before asking for a reply."
              disabled={isSendingMessage}
            />

            {sendError ? (
              <div className="rounded-[1rem] border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm leading-6 text-destructive">
                {sendError.message}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm leading-6 text-muted-foreground">
                Messages stay inside this workspace. Provider failures keep your saved user turn.
              </p>

              <Button
                size="lg"
                onClick={() => void handleSend()}
                disabled={isSendingMessage || !draft.trim()}
              >
                {isSendingMessage ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <SendHorizontal className="size-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
