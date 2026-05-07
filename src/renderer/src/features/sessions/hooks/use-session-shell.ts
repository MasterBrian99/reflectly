import { startTransition, useEffect, useMemo, useState } from 'react'
import type {
  MessageRecord,
  SessionChatError,
  SessionDetail,
  SessionSummary
} from '@shared/session-chat'
import { sessionIpcService } from '../services/session-ipc.service'

function sortSessions(sessions: SessionSummary[]): SessionSummary[] {
  return [...sessions].sort((left, right) => {
    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt.localeCompare(left.updatedAt)
    }

    if (left.createdAt !== right.createdAt) {
      return right.createdAt.localeCompare(left.createdAt)
    }

    return right.id.localeCompare(left.id)
  })
}

function mergeSession(sessions: SessionSummary[], nextSession: SessionSummary): SessionSummary[] {
  const remainingSessions = sessions.filter((session) => session.id !== nextSession.id)
  return sortSessions([nextSession, ...remainingSessions])
}

function appendUniqueMessage(
  messages: MessageRecord[],
  nextMessage: MessageRecord
): MessageRecord[] {
  if (messages.some((message) => message.id === nextMessage.id)) {
    return messages
  }

  return [...messages, nextMessage]
}

function buildDetail(session: SessionSummary, nextMessages: MessageRecord[]): SessionDetail {
  return {
    session,
    messages: nextMessages
  }
}

export function useSessionShell(): {
  sessions: SessionSummary[]
  activeDetail: SessionDetail | null
  selectedSessionId: string | null
  isLoading: boolean
  isCreatingSession: boolean
  isLoadingSession: boolean
  isSendingMessage: boolean
  selectionError: string | null
  sendError: SessionChatError | null
  createSession: () => Promise<void>
  selectSession: (sessionId: string) => Promise<void>
  sendMessage: (content: string) => Promise<SessionChatError | null>
} {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [activeDetail, setActiveDetail] = useState<SessionDetail | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<SessionChatError | null>(null)

  const selectedSummary = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions]
  )

  async function loadSession(sessionId: string): Promise<void> {
    setIsLoadingSession(true)
    setSelectionError(null)

    const result = await sessionIpcService.getSession({ sessionId })

    if (!result.ok) {
      setSelectionError(result.error.message)
      setIsLoadingSession(false)
      return
    }

    startTransition(() => {
      setActiveDetail(result.data)
      setSessions((currentSessions) => mergeSession(currentSessions, result.data.session))
      setSelectedSessionId(result.data.session.id)
    })
    setIsLoadingSession(false)
  }

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        setIsLoading(true)
        setSelectionError(null)

        const result = await sessionIpcService.listSessions()

        if (!result.ok) {
          setSelectionError(result.error.message)
          setIsLoading(false)
          return
        }

        const nextSessions = sortSessions(result.data.sessions)
        const nextSelectedSessionId = nextSessions[0]?.id ?? null

        startTransition(() => {
          setSessions(nextSessions)
          setSelectedSessionId(nextSelectedSessionId)

          if (!nextSelectedSessionId) {
            setActiveDetail(null)
          }
        })
        setIsLoading(false)

        if (nextSelectedSessionId) {
          await loadSession(nextSelectedSessionId)
        }
      })()
    })
  }, [])

  async function createSession(): Promise<void> {
    setIsCreatingSession(true)
    setSelectionError(null)

    const result = await sessionIpcService.createSession()

    if (!result.ok) {
      setSelectionError(result.error.message)
      setIsCreatingSession(false)
      return
    }

    startTransition(() => {
      setSessions((currentSessions) => mergeSession(currentSessions, result.data.session))
      setActiveDetail(result.data)
      setSelectedSessionId(result.data.session.id)
      setSendError(null)
    })
    setIsCreatingSession(false)
  }

  async function selectSession(sessionId: string): Promise<void> {
    if (sessionId === selectedSessionId && activeDetail?.session.id === sessionId) {
      return
    }

    setSelectedSessionId(sessionId)
    await loadSession(sessionId)
  }

  async function sendMessage(content: string): Promise<SessionChatError | null> {
    const activeSessionId = activeDetail?.session.id ?? selectedSummary?.id

    if (!activeSessionId || isSendingMessage) {
      return null
    }

    setSendError(null)
    setIsSendingMessage(true)

    const result = await sessionIpcService.sendMessage({
      sessionId: activeSessionId,
      content
    })

    if (!result.ok) {
      startTransition(() => {
        setSendError(result.error)

        if (result.error.session) {
          setSessions((currentSessions) => mergeSession(currentSessions, result.error.session!))
        }

        if (
          result.error.session &&
          result.error.userMessage &&
          activeDetail?.session.id === activeSessionId
        ) {
          setActiveDetail((currentDetail) => {
            const nextMessages = appendUniqueMessage(
              currentDetail?.messages ?? [],
              result.error.userMessage!
            )
            return buildDetail(result.error.session!, nextMessages)
          })
        }
      })
      setIsSendingMessage(false)
      return result.error
    }

    startTransition(() => {
      setSessions((currentSessions) => mergeSession(currentSessions, result.data.session))
      setActiveDetail((currentDetail) => {
        const messagesWithUser = appendUniqueMessage(
          currentDetail?.messages ?? [],
          result.data.userMessage
        )
        const nextMessages = appendUniqueMessage(messagesWithUser, result.data.assistantMessage)
        return buildDetail(result.data.session, nextMessages)
      })
    })
    setIsSendingMessage(false)

    return null
  }

  return {
    sessions,
    activeDetail,
    selectedSessionId,
    isLoading,
    isCreatingSession,
    isLoadingSession,
    isSendingMessage,
    selectionError,
    sendError,
    createSession,
    selectSession,
    sendMessage
  }
}
