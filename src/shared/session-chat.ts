export type MessageRole = 'user' | 'assistant'

export interface SessionSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

export interface MessageRecord {
  id: string
  sessionId: string
  role: MessageRole
  content: string
  createdAt: string
}

export interface SessionDetail {
  session: SessionSummary
  messages: MessageRecord[]
}

export interface CreateSessionSuccess {
  session: SessionSummary
  messages: MessageRecord[]
}

export interface SendMessageRequest {
  sessionId: string
  content: string
}

export interface SendMessageSuccess {
  requestId: string
  session: SessionSummary
  userMessage: MessageRecord
}

export type SessionChatErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'WORKSPACE_NOT_READY'
  | 'MODEL_CONFIG_MISSING'
  | 'MODEL_REQUEST_FAILED'
  | 'MODEL_RESPONSE_INVALID'
  | 'MESSAGE_PERSIST_FAILED'
  | 'INVALID_MESSAGE_CONTENT'

export interface SessionChatError {
  code: SessionChatErrorCode
  message: string
  retryable: boolean
  session?: SessionSummary
  userMessage?: MessageRecord
}

export type SessionChatResult<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: SessionChatError
    }

export interface GetSessionRequest {
  sessionId: string
}

export type ChatStreamEvent =
  | {
      type: 'delta'
      requestId: string
      sessionId: string
      delta: string
    }
  | {
      type: 'complete'
      requestId: string
      sessionId: string
      session: SessionSummary
      assistantMessage: MessageRecord
    }
  | {
      type: 'error'
      requestId: string
      sessionId: string
      error: SessionChatError
    }

export interface SessionChatApi {
  listSessions: () => Promise<SessionChatResult<{ sessions: SessionSummary[] }>>
  createSession: () => Promise<SessionChatResult<CreateSessionSuccess>>
  getSession: (request: GetSessionRequest) => Promise<SessionChatResult<SessionDetail>>
  sendMessage: (request: SendMessageRequest) => Promise<SessionChatResult<SendMessageSuccess>>
  onChatStreamEvent: (listener: (event: ChatStreamEvent) => void) => () => void
}
