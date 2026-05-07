import { randomUUID } from 'node:crypto'
import { ipcMain } from 'electron'
import type {
  ChatStreamEvent,
  CreateSessionSuccess,
  GetSessionRequest,
  SendMessageRequest,
  SendMessageSuccess,
  SessionChatResult
} from '../../shared/session-chat'
import { readAppSettings } from '../settings/store'
import { openWorkspace } from '../workspace/bootstrap'
import { readWorkspacePath } from '../workspace/store'
import { SessionChatAppError, toSessionChatError } from './error'
import { streamAssistantReply } from './model-adapter'
import {
  createSession,
  getSessionDetail,
  listSessions,
  persistAssistantMessage,
  persistUserMessageAndLoadContext
} from './repository'

async function resolveActiveWorkspacePath(): Promise<string> {
  const workspacePath = await readWorkspacePath()

  if (!workspacePath) {
    throw new SessionChatAppError(
      'WORKSPACE_NOT_READY',
      'Select or reopen a workspace before using sessions.'
    )
  }

  try {
    await openWorkspace(workspacePath)
  } catch {
    throw new SessionChatAppError(
      'WORKSPACE_NOT_READY',
      'The current workspace is not ready. Reopen it and try again.',
      true
    )
  }

  return workspacePath
}

function failureResult<T>(error: unknown): SessionChatResult<T> {
  return {
    ok: false,
    error: toSessionChatError(error)
  }
}

export function registerSessionChatIpc(): void {
  ipcMain.handle(
    'sessions:list',
    async (): Promise<SessionChatResult<{ sessions: ReturnType<typeof listSessions> }>> => {
      try {
        const workspacePath = await resolveActiveWorkspacePath()

        return {
          ok: true,
          data: {
            sessions: listSessions(workspacePath)
          }
        }
      } catch (error) {
        return failureResult(error)
      }
    }
  )

  ipcMain.handle('sessions:create', async (): Promise<SessionChatResult<CreateSessionSuccess>> => {
    try {
      const workspacePath = await resolveActiveWorkspacePath()
      const detail = createSession(workspacePath)

      return {
        ok: true,
        data: detail
      }
    } catch (error) {
      return failureResult(error)
    }
  })

  ipcMain.handle(
    'sessions:get',
    async (
      _,
      request: GetSessionRequest
    ): Promise<
      SessionChatResult<
        ReturnType<typeof getSessionDetail> extends infer T ? (T extends null ? never : T) : never
      >
    > => {
      try {
        const workspacePath = await resolveActiveWorkspacePath()
        const detail = getSessionDetail(workspacePath, request.sessionId)

        if (!detail) {
          throw new SessionChatAppError(
            'SESSION_NOT_FOUND',
            'That session no longer exists in this workspace.'
          )
        }

        return {
          ok: true,
          data: detail
        }
      } catch (error) {
        return failureResult(error)
      }
    }
  )

  ipcMain.handle(
    'chat:send-message',
    async (event, request: SendMessageRequest): Promise<SessionChatResult<SendMessageSuccess>> => {
      try {
        const workspacePath = await resolveActiveWorkspacePath()

        if (!request.content.trim()) {
          throw new SessionChatAppError(
            'INVALID_MESSAGE_CONTENT',
            'Enter a message before sending.'
          )
        }

        const persistedUserState = persistUserMessageAndLoadContext(
          workspacePath,
          request.sessionId,
          request.content
        )

        if (!persistedUserState) {
          throw new SessionChatAppError(
            'SESSION_NOT_FOUND',
            'That session no longer exists in this workspace.'
          )
        }

        const requestId = randomUUID()
        const settings = await readAppSettings()

        queueMicrotask(() => {
          void (async () => {
            const emit = (payload: ChatStreamEvent): void => {
              event.sender.send('chat:stream-event', payload)
            }

            try {
              const assistantContent = await streamAssistantReply({
                settings,
                messages: persistedUserState.contextMessages,
                requestId,
                sessionId: request.sessionId,
                emit
              })
              const assistantState = persistAssistantMessage(
                workspacePath,
                request.sessionId,
                assistantContent
              )

              if (!assistantState) {
                throw new SessionChatAppError(
                  'MESSAGE_PERSIST_FAILED',
                  'Reflectly saved your message, but could not save the reply.',
                  true
                )
              }

              emit({
                type: 'complete',
                requestId,
                sessionId: request.sessionId,
                session: assistantState.session,
                assistantMessage: assistantState.assistantMessage
              })
            } catch (error) {
              emit({
                type: 'error',
                requestId,
                sessionId: request.sessionId,
                error: {
                  ...toSessionChatError(error),
                  session: persistedUserState.session,
                  userMessage: persistedUserState.userMessage
                }
              })
            }
          })()
        })

        return {
          ok: true,
          data: {
            requestId,
            session: persistedUserState.session,
            userMessage: persistedUserState.userMessage
          }
        }
      } catch (error) {
        return failureResult(error)
      }
    }
  )
}
