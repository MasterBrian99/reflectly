import { embed, generateText } from 'ai'
import type { AppSettings } from '../../shared/app-settings'
import type {
  MessageRecord,
  SessionClosingResponses,
  SessionSummary
} from '../../shared/session-chat'
import {
  ChatProviderRegistryBuilder,
  EmbeddingProviderRegistryBuilder
} from '../ai/provider-registry'
import {
  getSessionSummary,
  insertMemoryChunk,
  upsertSessionSummary,
  type PersistedSessionSummary
} from './repository'

export interface MemoryWriteBackResult {
  turnSummary: string
  sessionSummary: string
}

const memoryWriteBackSystemPrompt = `You compress a journaling exchange into durable memory artifacts.
Return strict JSON with exactly two string fields: "turnSummary" and "sessionSummary".
The turnSummary should be one or two sentences about what mattered in the latest user-assistant exchange.
The sessionSummary should refresh the whole session in at most five concise sentences.
Do not include markdown, code fences, or extra keys.`

function extractJsonObject(text: string): string | null {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null
  }

  return text.slice(firstBrace, lastBrace + 1)
}

export function parseMemoryWriteBackResult(text: string): MemoryWriteBackResult | null {
  const jsonPayload = extractJsonObject(text)

  if (!jsonPayload) {
    return null
  }

  try {
    const parsed = JSON.parse(jsonPayload) as Partial<MemoryWriteBackResult>
    const turnSummary = parsed.turnSummary?.trim()
    const sessionSummary = parsed.sessionSummary?.trim()

    if (!turnSummary || !sessionSummary) {
      return null
    }

    return {
      turnSummary,
      sessionSummary
    }
  } catch {
    return null
  }
}

async function summarizeExchange(options: {
  settings: AppSettings
  session: SessionSummary
  userMessage: MessageRecord
  assistantMessage: MessageRecord
  previousSessionSummary: PersistedSessionSummary | null
}): Promise<MemoryWriteBackResult> {
  const { model } = new ChatProviderRegistryBuilder(options.settings).build()
  const previousSummaryText = options.previousSessionSummary?.summaryText?.trim() || 'None yet.'
  const result = await generateText({
    model,
    system: memoryWriteBackSystemPrompt,
    prompt: [
      `Session title: ${options.session.title}`,
      `Previous session summary: ${previousSummaryText}`,
      `Latest user message: ${options.userMessage.content}`,
      `Latest assistant reply: ${options.assistantMessage.content}`
    ].join('\n\n'),
    maxRetries: 1,
    timeout: 45000
  })

  const parsed = parseMemoryWriteBackResult(result.text)

  if (!parsed) {
    throw new Error('Memory write-back summary returned invalid JSON.')
  }

  return parsed
}

async function buildEmbeddingPayloads(options: {
  settings: AppSettings
  turnSummary: string
  sessionSummary: string
}): Promise<{
  embeddingProvider: string | null
  embeddingModel: string | null
  turnSummaryVector: number[] | null
  sessionSummaryVector: number[] | null
}> {
  const registry = new EmbeddingProviderRegistryBuilder(options.settings)

  if (!registry.isConfigured()) {
    return {
      embeddingProvider: null,
      embeddingModel: null,
      turnSummaryVector: null,
      sessionSummaryVector: null
    }
  }

  try {
    const { model, provider, modelId } = registry.build()
    const [turnResult, sessionResult] = await Promise.all([
      embed({
        model,
        value: options.turnSummary,
        maxRetries: 1
      }),
      embed({
        model,
        value: options.sessionSummary,
        maxRetries: 1
      })
    ])

    return {
      embeddingProvider: provider.id,
      embeddingModel: modelId,
      turnSummaryVector: turnResult.embedding,
      sessionSummaryVector: sessionResult.embedding
    }
  } catch (error) {
    console.error(
      'Embedding generation failed for memory write-back. Saving text-only memory.',
      error
    )

    return {
      embeddingProvider: null,
      embeddingModel: null,
      turnSummaryVector: null,
      sessionSummaryVector: null
    }
  }
}

async function buildSingleEmbeddingPayload(options: {
  settings: AppSettings
  value: string
}): Promise<{
  embeddingProvider: string | null
  embeddingModel: string | null
  embeddingVector: number[] | null
}> {
  const registry = new EmbeddingProviderRegistryBuilder(options.settings)

  if (!registry.isConfigured()) {
    return {
      embeddingProvider: null,
      embeddingModel: null,
      embeddingVector: null
    }
  }

  try {
    const { model, provider, modelId } = registry.build()
    const result = await embed({
      model,
      value: options.value,
      maxRetries: 1
    })

    return {
      embeddingProvider: provider.id,
      embeddingModel: modelId,
      embeddingVector: result.embedding
    }
  } catch (error) {
    console.error('Embedding generation failed for closing memory. Saving text-only memory.', error)

    return {
      embeddingProvider: null,
      embeddingModel: null,
      embeddingVector: null
    }
  }
}

function formatClosingContext(closing: SessionClosingResponses): string | null {
  const lines: string[] = []

  if (closing.standout?.trim()) {
    lines.push(`What stood out: ${closing.standout.trim()}`)
  }

  if (closing.carryForward?.trim()) {
    lines.push(`Carry forward: ${closing.carryForward.trim()}`)
  }

  if (closing.mood) {
    lines.push(`Final mood: ${closing.mood} out of 5`)
  }

  return lines.length ? ['Closing context:', ...lines].join('\n') : null
}

export async function writeSessionMemory(options: {
  workspacePath: string
  settings: AppSettings
  session: SessionSummary
  userMessage: MessageRecord
  assistantMessage: MessageRecord
  previousSessionSummary?: PersistedSessionSummary | null
}): Promise<MemoryWriteBackResult> {
  const previousSessionSummary =
    options.previousSessionSummary ?? getSessionSummary(options.workspacePath, options.session.id)
  const memorySummary = await summarizeExchange({
    settings: options.settings,
    session: options.session,
    userMessage: options.userMessage,
    assistantMessage: options.assistantMessage,
    previousSessionSummary
  })
  const embeddings = await buildEmbeddingPayloads({
    settings: options.settings,
    turnSummary: memorySummary.turnSummary,
    sessionSummary: memorySummary.sessionSummary
  })

  insertMemoryChunk(options.workspacePath, {
    sessionId: options.session.id,
    sourceMessageId: options.assistantMessage.id,
    chunkKind: 'turn_summary',
    content: memorySummary.turnSummary,
    embeddingProvider: embeddings.embeddingProvider,
    embeddingModel: embeddings.embeddingModel,
    embeddingVector: embeddings.turnSummaryVector
  })

  upsertSessionSummary(options.workspacePath, {
    sessionId: options.session.id,
    summaryText: memorySummary.sessionSummary,
    sourceMessageId: options.assistantMessage.id,
    turnCountSnapshot: Math.floor(options.session.messageCount / 2),
    embeddingProvider: embeddings.embeddingProvider,
    embeddingModel: embeddings.embeddingModel,
    embeddingVector: embeddings.sessionSummaryVector
  })

  return memorySummary
}

export async function writeSessionClosingMemory(options: {
  workspacePath: string
  settings: AppSettings
  session: SessionSummary
  sourceMessage: MessageRecord
  closing: SessionClosingResponses
  previousSessionSummary?: PersistedSessionSummary | null
}): Promise<void> {
  const closingContext = formatClosingContext(options.closing)

  if (!closingContext) {
    return
  }

  const previousSessionSummary =
    options.previousSessionSummary ?? getSessionSummary(options.workspacePath, options.session.id)
  const summaryText = previousSessionSummary?.summaryText?.trim()
    ? `${previousSessionSummary.summaryText.trim()}\n\n${closingContext}`
    : closingContext
  const summaryEmbedding = await buildSingleEmbeddingPayload({
    settings: options.settings,
    value: summaryText
  })

  if (options.closing.carryForward?.trim()) {
    const carryForward = options.closing.carryForward.trim()
    const carryForwardEmbedding = await buildSingleEmbeddingPayload({
      settings: options.settings,
      value: carryForward
    })

    insertMemoryChunk(options.workspacePath, {
      sessionId: options.session.id,
      sourceMessageId: options.sourceMessage.id,
      chunkKind: 'carry_forward',
      content: carryForward,
      embeddingProvider: carryForwardEmbedding.embeddingProvider,
      embeddingModel: carryForwardEmbedding.embeddingModel,
      embeddingVector: carryForwardEmbedding.embeddingVector
    })
  }

  upsertSessionSummary(options.workspacePath, {
    sessionId: options.session.id,
    summaryText,
    sourceMessageId: options.sourceMessage.id,
    turnCountSnapshot: Math.floor(options.session.messageCount / 2),
    embeddingProvider: summaryEmbedding.embeddingProvider,
    embeddingModel: summaryEmbedding.embeddingModel,
    embeddingVector: summaryEmbedding.embeddingVector
  })
}
