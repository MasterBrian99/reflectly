import type { SessionChatError, SessionChatErrorCode } from '../../shared/session-chat'

export class SessionChatAppError extends Error {
  code: SessionChatErrorCode
  retryable: boolean

  constructor(code: SessionChatErrorCode, message: string, retryable = false) {
    super(message)
    this.name = 'SessionChatAppError'
    this.code = code
    this.retryable = retryable
  }
}

export function toSessionChatError(error: unknown): SessionChatError {
  if (error instanceof SessionChatAppError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable
    }
  }

  return {
    code: 'MODEL_REQUEST_FAILED',
    message: 'Reflectly could not complete that action right now.',
    retryable: true
  }
}
