import { streamText } from 'ai'
import type { AppSettings } from '../../shared/app-settings'
import type { ChatStreamEvent, MessageRecord } from '../../shared/session-chat'
import type { RetrievedMemoryItem } from '../memory/retrieval'
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

  return sections.join('\n\n')
}

export async function streamAssistantReply(options: {
  settings: AppSettings
  messages: MessageRecord[]
  currentSessionSummary?: string | null
  retrievedMemory?: RetrievedMemoryItem[]
  requestId: string
  sessionId: string
  emit: (event: ChatStreamEvent) => void
}): Promise<string> {
  const { model } = new ChatProviderRegistryBuilder(options.settings).build()

  const result = streamText({
    model,
    system: buildSystemPrompt({
      currentSessionSummary: options.currentSessionSummary,
      retrievedMemory: options.retrievedMemory
    }),
    messages: mapMessages(options.messages),
    timeout: {
      totalMs: 60000,
      chunkMs: 10000
    }
  })

  let assistantContent = ''

  try {
    for await (const delta of result.textStream) {
      assistantContent += delta
      options.emit({
        type: 'delta',
        requestId: options.requestId,
        sessionId: options.sessionId,
        delta
      })
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
