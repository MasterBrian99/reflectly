import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleDashed,
  ImagePlus,
  LoaderCircle,
  Mic,
  SendHorizontal,
  ShieldAlert,
  Sparkles
} from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import type {
  AgentActivityItem,
  ClarificationPayload,
  SafetyInterruptMetadata,
  SessionClosingResponses,
  SessionChatError,
  SessionDetail
} from '@shared/session-chat'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type ChatPanelProps = {
  detail: SessionDetail | null
  isLoadingSession: boolean
  isSendingMessage: boolean
  isUpdatingSessionLifecycle: boolean
  sendError: SessionChatError | null
  streamingAssistantContent: string
  activeAgentActivities: AgentActivityItem[]
  agentActivitiesByMessageId: Record<string, AgentActivityItem[]>
  clarificationControlsByMessageId: Record<string, ClarificationPayload>
  onCreateSession: () => Promise<void>
  onSetIntention: (intention: string) => Promise<void>
  onSkipIntention: () => Promise<void>
  onBeginClosing: () => Promise<void>
  onCloseSession: (closing: SessionClosingResponses) => Promise<void>
  onSkipClosing: () => Promise<void>
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

function SessionPhaseBadge({
  phase
}: {
  phase: SessionDetail['session']['phase']
}): React.JSX.Element {
  const labelByPhase = {
    opening: 'Opening',
    working: 'In progress',
    closing: 'Closing',
    completed: 'Completed'
  } satisfies Record<SessionDetail['session']['phase'], string>

  return (
    <span className="workspace-phase-badge" data-phase={phase}>
      {labelByPhase[phase]}
    </span>
  )
}

function TranscriptBlock({
  role,
  content,
  isStreaming = false,
  clarification,
  safety,
  isAnsweringClarification = false,
  onClarificationAnswer
}: {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  clarification?: ClarificationPayload
  safety?: SafetyInterruptMetadata
  isAnsweringClarification?: boolean
  onClarificationAnswer?: (content: string) => Promise<void>
}): React.JSX.Element {
  const isUser = role === 'user'
  const isSafetyInterrupt = Boolean(safety)

  async function handleScaleAnswer(value: number): Promise<void> {
    await onClarificationAnswer?.(`${value} out of 10`)
  }

  return (
    <article
      className={cn(
        'workspace-transcript-block',
        isUser && 'workspace-transcript-block-user',
        isSafetyInterrupt && 'workspace-transcript-block-safety'
      )}
    >
      {isSafetyInterrupt ? (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-destructive/20 bg-[#fff5f3] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-destructive">
          <ShieldAlert className="size-3.5" />
          Safety
        </div>
      ) : null}
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

      {!isUser && clarification?.questionType === 'choice' && clarification.options?.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {clarification.options.map((option) => (
            <Button
              key={option}
              type="button"
              variant="outline"
              size="sm"
              disabled={isAnsweringClarification}
              onClick={() => void onClarificationAnswer?.(option)}
              className="rounded-xl bg-white/75"
            >
              {option}
            </Button>
          ))}
        </div>
      ) : null}

      {!isUser && clarification?.questionType === 'scale' ? (
        <div className="mt-5 max-w-xl">
          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
              <Button
                key={value}
                type="button"
                variant="outline"
                size="xs"
                disabled={isAnsweringClarification}
                onClick={() => void handleScaleAnswer(value)}
                className="h-9 rounded-lg bg-white/75 px-0"
              >
                {value}
              </Button>
            ))}
          </div>
          {clarification.scaleAnchors ? (
            <div className="mt-2 flex justify-between gap-4 text-xs leading-5 text-muted-foreground">
              <span>{clarification.scaleAnchors[0]}</span>
              <span className="text-right">{clarification.scaleAnchors[1]}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function AgentActivityAccordion({
  activities,
  defaultOpen = true
}: {
  activities: AgentActivityItem[]
  defaultOpen?: boolean
}): React.JSX.Element | null {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (!activities.length) {
    return null
  }

  const runningCount = activities.filter((activity) => activity.status === 'running').length

  return (
    <div className="workspace-agent-activity">
      <button
        type="button"
        className="workspace-agent-activity-trigger"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {runningCount > 0 ? (
            <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0 text-success" />
          )}
          <span className="truncate">
            Agent activity {runningCount > 0 ? `(${runningCount} running)` : 'complete'}
          </span>
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen ? (
        <div className="workspace-agent-activity-body">
          {activities.map((activity) => (
            <div key={activity.id} className="workspace-agent-activity-row">
              {activity.status === 'running' ? (
                <CircleDashed className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
              ) : activity.status === 'error' ? (
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{activity.label}</p>
                  <span className="rounded-full bg-[#edf4f1] px-2 py-0.5 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-primary">
                    {activity.kind}
                  </span>
                </div>
                {activity.detail ? (
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{activity.detail}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function IntentionPrompt({
  isBusy,
  onSubmit,
  onSkip
}: {
  isBusy: boolean
  onSubmit: (intention: string) => Promise<void>
  onSkip: () => Promise<void>
}): React.JSX.Element {
  const [intention, setIntention] = useState('')

  return (
    <div className="workspace-lifecycle-card">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary/75">
          New session
        </p>
        <h3 className="mt-3 text-3xl font-light tracking-[-0.03em] text-foreground">
          What would feel useful to focus on today?
        </h3>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          A short intention helps Reflectly keep this conversation pointed toward what matters now.
        </p>
      </div>
      <Textarea
        value={intention}
        onChange={(event) => setIntention(event.target.value)}
        placeholder="I want to understand what has been weighing on me..."
        className="workspace-lifecycle-textarea"
        disabled={isBusy}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="lg" disabled={isBusy} onClick={() => void onSubmit(intention)}>
          {isBusy ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Begin Session
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isBusy}
          onClick={() => void onSkip()}
          className="text-muted-foreground"
        >
          Skip
        </Button>
      </div>
    </div>
  )
}

function ClosingPrompt({
  isBusy,
  onSubmit,
  onSkip
}: {
  isBusy: boolean
  onSubmit: (closing: SessionClosingResponses) => Promise<void>
  onSkip: () => Promise<void>
}): React.JSX.Element {
  const [standout, setStandout] = useState('')
  const [carryForward, setCarryForward] = useState('')
  const [mood, setMood] = useState<SessionClosingResponses['mood']>()

  return (
    <div className="workspace-lifecycle-card">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary/75">Closing</p>
        <h3 className="mt-3 text-3xl font-light tracking-[-0.03em] text-foreground">
          Before you go...
        </h3>
      </div>
      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="settings-field-label">What stood out for you today?</span>
          <Textarea
            value={standout}
            onChange={(event) => setStandout(event.target.value)}
            className="workspace-lifecycle-textarea"
            disabled={isBusy}
          />
        </label>
        <label className="grid gap-2">
          <span className="settings-field-label">What do you want to carry forward?</span>
          <Textarea
            value={carryForward}
            onChange={(event) => setCarryForward(event.target.value)}
            className="workspace-lifecycle-textarea"
            disabled={isBusy}
          />
        </label>
        <div className="grid gap-2">
          <span className="settings-field-label">
            How are you feeling leaving this conversation?
          </span>
          <div className="workspace-mood-selector">
            {([1, 2, 3, 4, 5] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={cn('workspace-mood-button', mood === value && 'workspace-mood-active')}
                disabled={isBusy}
                onClick={() => setMood(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="lg"
          disabled={isBusy}
          onClick={() =>
            void onSubmit({
              standout,
              carryForward,
              ...(mood ? { mood } : {})
            })
          }
        >
          {isBusy ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Complete Session
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isBusy}
          onClick={() => void onSkip()}
          className="text-muted-foreground"
        >
          Skip
        </Button>
      </div>
    </div>
  )
}

function SessionBookendSummary({
  detail,
  section
}: {
  detail: SessionDetail
  section: 'intention' | 'closing'
}): React.JSX.Element | null {
  const hasContent =
    section === 'intention'
      ? Boolean(detail.session.intention)
      : Boolean(
          detail.session.closingStandout ||
          detail.session.closingCarryForward ||
          detail.session.closingMood
        )

  if (!hasContent) {
    return null
  }

  return (
    <div className="workspace-lifecycle-summary">
      {section === 'intention' ? (
        <div>
          <p className="settings-field-label">Intention</p>
          <p className="mt-2 text-base leading-7 text-foreground/86">{detail.session.intention}</p>
        </div>
      ) : null}
      {section === 'closing' ? (
        <div>
          <p className="settings-field-label">Closing</p>
          <div className="mt-2 grid gap-2 text-base leading-7 text-foreground/86">
            {detail.session.closingStandout ? (
              <p>Stood out: {detail.session.closingStandout}</p>
            ) : null}
            {detail.session.closingCarryForward ? (
              <p>Carry forward: {detail.session.closingCarryForward}</p>
            ) : null}
            {detail.session.closingMood ? (
              <p>Final mood: {detail.session.closingMood} out of 5</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function ChatPanel({
  detail,
  isLoadingSession,
  isSendingMessage,
  isUpdatingSessionLifecycle,
  sendError,
  streamingAssistantContent,
  activeAgentActivities,
  agentActivitiesByMessageId,
  clarificationControlsByMessageId,
  onCreateSession,
  onSetIntention,
  onSkipIntention,
  onBeginClosing,
  onCloseSession,
  onSkipClosing,
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
    if (!draft.trim() || !detail || detail.session.phase !== 'working' || isSendingMessage) {
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
        <div className="flex items-start justify-between gap-6 px-16 pt-12 pb-5">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h2 className="truncate text-6xl leading-none font-light tracking-[-0.05em] text-foreground">
                {detail.session.title}
              </h2>
              <SessionPhaseBadge phase={detail.session.phase} />
            </div>
            <p className="mt-5 text-2xl font-light text-muted-foreground">
              {formatRelativeTime(detail.session.createdAt)}
            </p>
            {detail.session.intention ? (
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Focus: {detail.session.intention}
              </p>
            ) : null}
          </div>
          {detail.session.phase === 'working' ? (
            <Button
              type="button"
              variant="outline"
              disabled={isSendingMessage || isUpdatingSessionLifecycle}
              onClick={() => void onBeginClosing()}
              className="mt-2 shrink-0 rounded-2xl bg-white/75"
            >
              End Session
            </Button>
          ) : detail.session.phase === 'completed' ? (
            <div className="mt-2 shrink-0 rounded-full border border-success/25 bg-[#f0f7f1] px-4 py-2 text-sm font-medium uppercase tracking-[0.14em] text-success">
              Session completed
            </div>
          ) : null}
        </div>

        <ScrollArea className="workspace-chat-scroll flex-1">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-14 px-16 pt-10 pb-14">
            {detail.session.phase === 'completed' ? (
              <SessionBookendSummary detail={detail} section="intention" />
            ) : null}

            {detail.messages.map((message) => {
              const persistedActivities =
                message.role === 'assistant' ? (agentActivitiesByMessageId[message.id] ?? []) : []

              return (
                <Fragment key={message.id}>
                  {persistedActivities.length ? (
                    <AgentActivityAccordion activities={persistedActivities} defaultOpen={false} />
                  ) : null}
                  <TranscriptBlock
                    role={message.role}
                    content={message.content}
                    clarification={clarificationControlsByMessageId[message.id]}
                    safety={detail.safetyByMessageId?.[message.id]}
                    isAnsweringClarification={
                      isSendingMessage || detail.session.phase === 'completed'
                    }
                    onClarificationAnswer={
                      detail.session.phase === 'completed'
                        ? undefined
                        : async (content) => {
                            await onSendMessage(content)
                          }
                    }
                  />
                </Fragment>
              )
            })}

            {detail.session.phase === 'completed' ? (
              <SessionBookendSummary detail={detail} section="closing" />
            ) : null}

            {streamingAssistantContent ? (
              <>
                <AgentActivityAccordion activities={activeAgentActivities} />
                <TranscriptBlock role="assistant" content={streamingAssistantContent} isStreaming />
              </>
            ) : null}

            {isSendingMessage && !streamingAssistantContent ? (
              <article className="workspace-transcript-block">
                <AgentActivityAccordion activities={activeAgentActivities} />
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

      {detail.session.phase === 'opening' ? (
        <div className="workspace-composer-shell">
          <IntentionPrompt
            isBusy={isUpdatingSessionLifecycle}
            onSubmit={onSetIntention}
            onSkip={onSkipIntention}
          />
        </div>
      ) : null}

      {detail.session.phase === 'closing' ? (
        <div className="workspace-composer-shell">
          <ClosingPrompt
            isBusy={isUpdatingSessionLifecycle}
            onSubmit={onCloseSession}
            onSkip={onSkipClosing}
          />
        </div>
      ) : null}

      {detail.session.phase === 'working' ? (
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
              <div className="px-7 pb-4 text-sm leading-6 text-destructive">
                {sendError.message}
              </div>
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
      ) : null}
    </section>
  )
}
