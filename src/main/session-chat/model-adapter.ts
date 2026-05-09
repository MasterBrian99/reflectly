import { streamText } from 'ai'
import type { AppSettings } from '../../shared/app-settings'
import type { ChatStreamEvent, MessageRecord } from '../../shared/session-chat'
import type { RetrievedMemoryItem } from '../memory/retrieval'
import type { Stage1ParseOutput } from '../stage1/types'
import type { Stage3ReasoningOutput } from '../stage3/types'
import { ChatProviderRegistryBuilder } from '../ai/provider-registry'
import { SessionChatAppError } from './error'

const systemPrompt =
  'You are Reflectly, a calm and thoughtful journaling assistant. Reply with grounded, concise, supportive reflection. Do not claim to be a therapist or offer crisis instructions unless the user explicitly asks for urgent help.'

function mapMessages(
  messages: MessageRecord[]
): Array<{ role: MessageRecord['role']; content: string }> {
  return messages.map((message) => ({
    role: message.role,
    content: message.content
  }))
}

function buildSystemPrompt(options: {
  currentSessionSummary?: string | null
  retrievedMemory?: RetrievedMemoryItem[]
  stage1Output?: Stage1ParseOutput
  stage3Output?: Stage3ReasoningOutput
}): string {
  const sections = [systemPrompt]
  const memoryLines: string[] = []

  if (options.currentSessionSummary?.trim()) {
    memoryLines.push('Current session summary:')
    memoryLines.push(options.currentSessionSummary.trim())
  }

  if (options.retrievedMemory?.length) {
    if (memoryLines.length) {
      memoryLines.push('')
    }

    memoryLines.push('Retrieved memory:')

    for (const memory of options.retrievedMemory) {
      memoryLines.push(
        `[${memory.scopeLabel}] ${memory.sessionTitle} | ${memory.chunkKind} | similarity ${memory.similarity.toFixed(3)}`
      )
      memoryLines.push(memory.content)
      memoryLines.push('')
    }
  }

  if (memoryLines.length) {
    sections.push(
      [
        'Memory context:',
        "Use this only when it is relevant to the user's current message.",
        'Treat it as background context, not as a replacement for the current transcript.',
        '',
        ...memoryLines
      ].join('\n')
    )
  }

  if (options.stage1Output) {
    const stage1 = options.stage1Output
    const entityLines = stage1.entities.map((entity) =>
      [entity.name, entity.type, entity.sentiment, entity.description].filter(Boolean).join(' | ')
    )
    const goalLines = stage1.goalHints.map((goal) => `${goal.status}: ${goal.description}`)
    const riskLines = stage1.riskMarkers.map(
      (risk) => `${risk.severity} ${risk.type}: ${risk.evidence}`
    )

    sections.push(
      [
        'Stage 1 structured context:',
        `- Message summary: ${stage1.summary}`,
        `- Emotional tone: ${stage1.emotionalTone.primary}; valence ${stage1.emotionalTone.valence}; arousal ${stage1.emotionalTone.arousal}`,
        `- Expressed intent: ${stage1.intent.expressed}`,
        `- Inferred intent: ${stage1.intent.inferred}`,
        `- Intent category: ${stage1.intent.category}`,
        `- Relevant entities: ${entityLines.length ? entityLines.join('; ') : 'None extracted.'}`,
        `- Goal hints: ${goalLines.length ? goalLines.join('; ') : 'None extracted.'}`,
        `- Risk markers: ${riskLines.length ? riskLines.join('; ') : 'None extracted.'}`,
        '',
        'Use this as structured context. Do not mention internal labels to the user unless it is naturally useful.'
      ].join('\n')
    )
  }

  if (options.stage3Output) {
    const s3 = options.stage3Output
    const avoidLines = s3.responsePlan.avoid.map((item) => `- ${item}`)
    const safetyLines = s3.safetyNotes.notes.map((note) => `- ${note}`)

    sections.push(
      [
        'Stage 3 response guidance:',
        `- Support mode: ${s3.supportMode}`,
        `- Depth level: ${s3.depthLevel}`,
        `- Response goal: ${s3.responseGoal}`,
        `- Emotional hypothesis: ${s3.emotionalHypothesis.summary} (confidence ${s3.emotionalHypothesis.confidence})`,
        `- Memory use: ${s3.memoryUse.summary}${s3.memoryUse.caution ? ` (caution: ${s3.memoryUse.caution})` : ''}`,
        `- Opening move: ${s3.responsePlan.openingMove}`,
        `- Key points: ${s3.responsePlan.keyPoints.join('; ') || 'None.'}`,
        s3.responsePlan.suggestedQuestion
          ? `- Suggested question: ${s3.responsePlan.suggestedQuestion}`
          : null,
        avoidLines.length ? `- Avoid:\n${avoidLines.join('\n')}` : '- Avoid: Nothing specific.',
        `- Safety notes: ${s3.safetyNotes.hasActiveRiskMarkers ? 'Active risk markers present.' : 'No active risk markers.'}`,
        safetyLines.length ? safetyLines.join('\n') : null,
        '',
        'Use this as private planning guidance. Do not mention internal labels or stages.',
        "If the guidance conflicts with safety rules or the user's actual message, prioritize safety and the user's message."
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  return sections.join('\n\n')
}

function buildReasoningProviderOptions(
  settings: AppSettings
): Parameters<typeof streamText>[0]['providerOptions'] | undefined {
  if (!settings.agentActivity.showModelReasoning) {
    return undefined
  }

  const effort = settings.agentActivity.reasoningEffort

  switch (settings.chat.providerId) {
    case 'openai':
      return {
        openai: {
          reasoningEffort: effort,
          reasoningSummary: settings.agentActivity.reasoningSummary
        }
      }
    case 'anthropic':
      return {
        anthropic: {
          thinking: {
            type: 'adaptive',
            display: 'summarized'
          },
          effort: effort === 'minimal' ? 'low' : effort
        }
      }
    case 'openrouter':
      return {
        openrouter: {
          reasoningEffort: effort
        }
      }
    case 'custom-openai-compatible':
      return {
        'custom-openai-compatible': {
          reasoningEffort: effort
        }
      }
  }
}

function trimReasoningDetail(detail: string): string {
  const normalized = detail.replace(/\s+/g, ' ').trim()

  if (normalized.length <= 900) {
    return normalized
  }

  return `${normalized.slice(0, 900).trim()}...`
}

export async function streamAssistantReply(options: {
  settings: AppSettings
  messages: MessageRecord[]
  currentSessionSummary?: string | null
  retrievedMemory?: RetrievedMemoryItem[]
  stage1Output?: Stage1ParseOutput
  stage3Output?: Stage3ReasoningOutput
  requestId: string
  sessionId: string
  emit: (event: ChatStreamEvent) => void
}): Promise<string> {
  const { model } = new ChatProviderRegistryBuilder(options.settings).build()

  const result = streamText({
    model,
    system: buildSystemPrompt({
      currentSessionSummary: options.currentSessionSummary,
      retrievedMemory: options.retrievedMemory,
      stage1Output: options.stage1Output,
      stage3Output: options.stage3Output
    }),
    messages: mapMessages(options.messages),
    providerOptions: buildReasoningProviderOptions(options.settings),
    timeout: {
      totalMs: 60000,
      chunkMs: 10000
    }
  })

  let assistantContent = ''
  const reasoningById = new Map<string, string>()
  const emitActivity = (activity: ChatStreamEvent & { type: 'activity' }): void => {
    if (options.settings.agentActivity.showInChat) {
      options.emit(activity)
    }
  }

  try {
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        assistantContent += part.text
        options.emit({
          type: 'delta',
          requestId: options.requestId,
          sessionId: options.sessionId,
          delta: part.text
        })
        continue
      }

      if (part.type === 'reasoning-start') {
        reasoningById.set(part.id, '')
        emitActivity({
          type: 'activity',
          requestId: options.requestId,
          sessionId: options.sessionId,
          activity: {
            id: `model-reasoning-${part.id}`,
            kind: 'reasoning',
            status: 'running',
            label: 'Model reasoning summary',
            detail: 'Waiting for model-provided reasoning summary.',
            createdAt: new Date().toISOString()
          }
        })
        continue
      }

      if (part.type === 'reasoning-delta') {
        const nextReasoning = `${reasoningById.get(part.id) ?? ''}${part.text}`
        reasoningById.set(part.id, nextReasoning)
        emitActivity({
          type: 'activity',
          requestId: options.requestId,
          sessionId: options.sessionId,
          activity: {
            id: `model-reasoning-${part.id}`,
            kind: 'reasoning',
            status: 'running',
            label: 'Model reasoning summary',
            detail: trimReasoningDetail(nextReasoning),
            createdAt: new Date().toISOString()
          }
        })
        continue
      }

      if (part.type === 'reasoning-end') {
        const reasoning = reasoningById.get(part.id)
        emitActivity({
          type: 'activity',
          requestId: options.requestId,
          sessionId: options.sessionId,
          activity: {
            id: `model-reasoning-${part.id}`,
            kind: 'reasoning',
            status: 'complete',
            label: 'Model reasoning summary',
            detail: reasoning?.trim()
              ? trimReasoningDetail(reasoning)
              : 'The provider did not return visible reasoning text for this model.',
            createdAt: new Date().toISOString()
          }
        })
        continue
      }

      if (part.type === 'tool-call') {
        emitActivity({
          type: 'activity',
          requestId: options.requestId,
          sessionId: options.sessionId,
          activity: {
            id: `tool-${part.toolCallId}`,
            kind: 'tool',
            status: 'running',
            label: `Calling ${part.toolName}`,
            detail: 'The model requested a tool call.',
            createdAt: new Date().toISOString()
          }
        })
        continue
      }

      if (part.type === 'tool-result') {
        emitActivity({
          type: 'activity',
          requestId: options.requestId,
          sessionId: options.sessionId,
          activity: {
            id: `tool-${part.toolCallId}`,
            kind: 'tool',
            status: 'complete',
            label: `Completed ${part.toolName}`,
            detail: 'The tool result was returned to the model.',
            createdAt: new Date().toISOString()
          }
        })
        continue
      }

      if (part.type === 'finish-step' && part.usage.outputTokenDetails?.reasoningTokens) {
        emitActivity({
          type: 'activity',
          requestId: options.requestId,
          sessionId: options.sessionId,
          activity: {
            id: `reasoning-usage-${part.response.id}`,
            kind: 'reasoning',
            status: 'complete',
            label: 'Reasoning tokens used',
            detail: `${part.usage.outputTokenDetails.reasoningTokens} reasoning token${part.usage.outputTokenDetails.reasoningTokens === 1 ? '' : 's'} reported by the provider.`,
            createdAt: new Date().toISOString()
          }
        })
      }
    }
  } catch {
    throw new SessionChatAppError(
      'MODEL_REQUEST_FAILED',
      'Reflectly could not complete the streamed reply. Try again in a moment.',
      true
    )
  }

  if (!assistantContent.trim()) {
    throw new SessionChatAppError(
      'MODEL_RESPONSE_INVALID',
      'The model returned an empty reply. Try again.',
      true
    )
  }

  return assistantContent
}
