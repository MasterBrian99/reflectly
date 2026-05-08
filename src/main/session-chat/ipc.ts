import { randomUUID } from 'node:crypto'
import { ipcMain } from 'electron'
import type {
  AgentActivityItem,
  ChatStreamEvent,
  CreateSessionSuccess,
  GetSessionRequest,
  SendMessageRequest,
  SendMessageSuccess,
  SessionChatResult
} from '../../shared/session-chat'
import { getSessionSummary } from '../memory/repository'
import { MemoryRetrievalService } from '../memory/retrieval'
import { writeSessionMemory } from '../memory/write-back'
import { evaluateSafetyGate } from '../safety/gate'
import { crisisInterruptMessage } from '../safety/messages'
import { insertSafetyEvent } from '../safety/repository'
import { readAppSettings } from '../settings/store'
import { applyClarificationRules } from '../stage1/clarification'
import { runStage1Parser } from '../stage1/parser'
import {
  countRecentClarificationLoops,
  insertClarificationRequest,
  resolveLatestPendingClarificationRequest,
  upsertStage1ParseOutput
} from '../stage1/repository'
import { openWorkspace } from '../workspace/bootstrap'
import { readWorkspacePath } from '../workspace/store'
import { SessionChatAppError, toSessionChatError } from './error'
import { streamAssistantReply } from './model-adapter'
import {
  createSession,
  getSessionDetail,
  listSessions,
  persistAssistantMessage,
  persistUserMessageAndLoadContext,
  upsertMessageAgentActivities
} from './repository'

const memoryRetrievalService = new MemoryRetrievalService()

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

function createActivity(input: Omit<AgentActivityItem, 'createdAt'>): AgentActivityItem {
  return {
    ...input,
    createdAt: new Date().toISOString()
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

        resolveLatestPendingClarificationRequest(
          workspacePath,
          request.sessionId,
          persistedUserState.userMessage.id
        )

        const requestId = randomUUID()
        const settings = await readAppSettings()

        queueMicrotask(() => {
          void (async () => {
            const activityItemsById = new Map<string, AgentActivityItem>()
            const emit = (payload: ChatStreamEvent): void => {
              if (payload.type === 'activity') {
                activityItemsById.set(payload.activity.id, payload.activity)
              }

              event.sender.send('chat:stream-event', payload)
            }
            const persistBufferedActivities = (assistantMessageId: string): void => {
              if (!activityItemsById.size) {
                return
              }

              try {
                upsertMessageAgentActivities(
                  workspacePath,
                  assistantMessageId,
                  Array.from(activityItemsById.values())
                )
              } catch (error) {
                console.error('Agent activity persistence failed.', error)
              }
            }
            const emitActivity = (input: Omit<AgentActivityItem, 'createdAt'>): void => {
              if (!settings.agentActivity.showInChat) {
                return
              }

              emit({
                type: 'activity',
                requestId,
                sessionId: request.sessionId,
                activity: createActivity(input)
              })
            }

            try {
              const currentSessionSummary = getSessionSummary(workspacePath, request.sessionId)
              emitActivity({
                id: 'stage1-parse',
                kind: 'reasoning',
                status: 'running',
                label: 'Parsing the message',
                detail: 'Extracting tone, intent, context gaps, and risk markers.'
              })
              const rawStage1Output = await runStage1Parser({
                settings,
                userMessage: persistedUserState.userMessage,
                contextMessages: persistedUserState.contextMessages,
                currentSessionSummary
              })
              const stage1Output = applyClarificationRules(rawStage1Output, {
                recentLoopCount: countRecentClarificationLoops(workspacePath, request.sessionId)
              })

              upsertStage1ParseOutput(workspacePath, stage1Output)
              emitActivity({
                id: 'stage1-parse',
                kind: 'reasoning',
                status: 'complete',
                label: 'Parsed the message',
                detail: stage1Output.shouldClarify
                  ? 'A clarification would materially change the next response.'
                  : 'Enough context is available to continue.'
              })

              emitActivity({
                id: 'safety-gate',
                kind: 'stage',
                status: 'running',
                label: 'Checking safety markers',
                detail: 'Reviewing deterministic risk markers before continuing.'
              })
              const safetyDecision = evaluateSafetyGate(stage1Output.riskMarkers)

              if (safetyDecision.action === 'crisis_interrupt' && safetyDecision.marker) {
                const assistantState = persistAssistantMessage(
                  workspacePath,
                  request.sessionId,
                  crisisInterruptMessage
                )

                if (!assistantState) {
                  throw new SessionChatAppError(
                    'MESSAGE_PERSIST_FAILED',
                    'Reflectly saved your message, but could not save the safety response.',
                    true
                  )
                }

                try {
                  insertSafetyEvent(workspacePath, {
                    sessionId: request.sessionId,
                    sourceMessageId: persistedUserState.userMessage.id,
                    assistantMessageId: assistantState.assistantMessage.id,
                    riskType: safetyDecision.marker.type,
                    severity: safetyDecision.marker.severity,
                    evidence: safetyDecision.marker.evidence,
                    actionTaken: 'crisis_interrupt'
                  })
                } catch (error) {
                  console.error(
                    'Safety event persistence failed after assistant persistence.',
                    error
                  )
                }

                emitActivity({
                  id: 'safety-gate',
                  kind: 'stage',
                  status: 'complete',
                  label: 'Safety interrupt triggered',
                  detail: 'A fixed safety response was saved without model generation.'
                })
                persistBufferedActivities(assistantState.assistantMessage.id)
                emit({
                  type: 'safety_interrupt',
                  requestId,
                  sessionId: request.sessionId,
                  session: assistantState.session,
                  assistantMessage: assistantState.assistantMessage,
                  safety: {
                    riskType: safetyDecision.marker.type,
                    severity: safetyDecision.marker.severity,
                    actionTaken: 'crisis_interrupt'
                  }
                })
                return
              }

              emitActivity({
                id: 'safety-gate',
                kind: 'stage',
                status: 'complete',
                label: 'Safety gate cleared',
                detail:
                  safetyDecision.action === 'supportive_notice'
                    ? 'A medium-severity marker was noted for later prompt shaping.'
                    : 'No interrupt-level marker was found.'
              })

              if (stage1Output.shouldClarify && stage1Output.clarification) {
                emitActivity({
                  id: 'clarification',
                  kind: 'stage',
                  status: 'running',
                  label: 'Preparing a clarification',
                  detail: 'Saving one focused question in the transcript.'
                })
                const assistantState = persistAssistantMessage(
                  workspacePath,
                  request.sessionId,
                  stage1Output.clarification.questionText
                )

                if (!assistantState) {
                  throw new SessionChatAppError(
                    'MESSAGE_PERSIST_FAILED',
                    'Reflectly saved your message, but could not save the clarification question.',
                    true
                  )
                }

                const clarificationRequest = insertClarificationRequest(workspacePath, {
                  sessionId: request.sessionId,
                  sourceMessageId: persistedUserState.userMessage.id,
                  assistantMessageId: assistantState.assistantMessage.id,
                  clarification: stage1Output.clarification
                })

                emitActivity({
                  id: 'clarification',
                  kind: 'stage',
                  status: 'complete',
                  label: 'Clarification ready',
                  detail: 'The next user message can resolve this question.'
                })
                persistBufferedActivities(assistantState.assistantMessage.id)
                emit({
                  type: 'clarification',
                  requestId,
                  sessionId: request.sessionId,
                  session: assistantState.session,
                  assistantMessage: assistantState.assistantMessage,
                  clarification: {
                    questionType: clarificationRequest.questionType,
                    questionText: clarificationRequest.questionText,
                    options: clarificationRequest.options,
                    scaleAnchors: clarificationRequest.scaleAnchors
                  }
                })
                return
              }

              emitActivity({
                id: 'memory-retrieval',
                kind: 'retrieval',
                status: 'running',
                label: 'Searching memory',
                detail: 'Looking for relevant workspace context before generation.'
              })
              const retrievedMemory = await memoryRetrievalService.retrieve({
                workspacePath,
                settings,
                activeSessionId: request.sessionId,
                queryText: persistedUserState.userMessage.content
              })
              emitActivity({
                id: 'memory-retrieval',
                kind: 'retrieval',
                status: 'complete',
                label: 'Memory search complete',
                detail: retrievedMemory.length
                  ? `${retrievedMemory.length} relevant item${retrievedMemory.length === 1 ? '' : 's'} found.`
                  : 'No relevant memory was found.'
              })
              emitActivity({
                id: 'assistant-generation',
                kind: 'stage',
                status: 'running',
                label: 'Generating response',
                detail: 'Streaming the assistant reply.'
              })
              const assistantContent = await streamAssistantReply({
                settings,
                messages: persistedUserState.contextMessages,
                currentSessionSummary: currentSessionSummary?.summaryText ?? null,
                retrievedMemory,
                stage1Output,
                requestId,
                sessionId: request.sessionId,
                emit
              })
              emitActivity({
                id: 'assistant-generation',
                kind: 'stage',
                status: 'complete',
                label: 'Generated response',
                detail: 'The assistant reply finished streaming.'
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

              try {
                emitActivity({
                  id: 'memory-write-back',
                  kind: 'tool',
                  status: 'running',
                  label: 'Updating memory',
                  detail: 'Summarizing the exchange for future retrieval.'
                })
                await writeSessionMemory({
                  workspacePath,
                  settings,
                  session: assistantState.session,
                  userMessage: persistedUserState.userMessage,
                  assistantMessage: assistantState.assistantMessage,
                  previousSessionSummary: currentSessionSummary
                })
                emitActivity({
                  id: 'memory-write-back',
                  kind: 'tool',
                  status: 'complete',
                  label: 'Memory updated',
                  detail: 'The exchange was saved into local memory.'
                })
              } catch (error) {
                console.error('Memory write-back failed after assistant persistence.', error)
                emitActivity({
                  id: 'memory-write-back',
                  kind: 'tool',
                  status: 'error',
                  label: 'Memory update failed',
                  detail: 'The reply was saved, but memory write-back did not complete.'
                })
              }

              persistBufferedActivities(assistantState.assistantMessage.id)
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
