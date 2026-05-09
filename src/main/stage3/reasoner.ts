import { generateText } from 'ai'
import type { AppSettings } from '../../shared/app-settings'
import type { MessageRecord } from '../../shared/session-chat'
import { Stage3ProviderRegistryBuilder } from '../ai/provider-registry'
import type { RetrievedMemoryItem } from '../memory/retrieval'
import type { PersistedSessionSummary } from '../memory/repository'
import type { Stage1ParseOutput } from '../stage1/types'
import { buildStage3Prompt, stage3SystemPrompt } from './prompts'
import {
  type Stage3ReasoningOutput,
  type Stage3SupportMode,
  type Stage3DepthLevel,
  supportModes,
  depthLevels
} from './types'

const stage3AttemptTimeoutMs = 45000
const stage3ProviderMaxRetries = 1

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function readStringArray(value: unknown, limit = 10): string[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const strings = value
    .map((item) => readString(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, limit)

  return strings.length > 0 ? strings : []
}

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

export function parseStage3ReasoningOutput(
  text: string,
  identity: { messageId: string; sessionId: string }
): Stage3ReasoningOutput | null {
  const jsonPayload = extractJsonObject(text)

  if (!jsonPayload) {
    return null
  }

  try {
    const parsed = JSON.parse(jsonPayload) as unknown

    if (!isRecord(parsed) || parsed.schemaVersion !== 1) {
      return null
    }

    const supportMode = readString(parsed.supportMode)
    const depthLevel = readString(parsed.depthLevel)
    const responseGoal = readString(parsed.responseGoal)

    if (
      !supportMode ||
      !depthLevel ||
      !responseGoal ||
      !supportModes.has(supportMode as Stage3SupportMode) ||
      !depthLevels.has(depthLevel as Stage3DepthLevel)
    ) {
      return null
    }

    const emotionalHypothesis = isRecord(parsed.emotionalHypothesis)
      ? parsed.emotionalHypothesis
      : null
    const memoryUse = isRecord(parsed.memoryUse) ? parsed.memoryUse : null
    const responsePlan = isRecord(parsed.responsePlan) ? parsed.responsePlan : null
    const safetyNotes = isRecord(parsed.safetyNotes) ? parsed.safetyNotes : null

    if (!emotionalHypothesis || !memoryUse || !responsePlan || !safetyNotes) {
      return null
    }

    const ehSummary = readString(emotionalHypothesis.summary)
    const ehEvidence = readStringArray(emotionalHypothesis.evidence) ?? []
    const ehConfidence = readNumber(emotionalHypothesis.confidence)

    if (!ehSummary || ehConfidence === null) {
      return null
    }

    const muRelevantIds = readStringArray(memoryUse.relevantMemoryIds) ?? []
    const muSummary = readString(memoryUse.summary)
    const muCaution = readString(memoryUse.caution)

    if (!muSummary) {
      return null
    }

    const rpOpeningMove = readString(responsePlan.openingMove)
    const rpKeyPoints = readStringArray(responsePlan.keyPoints) ?? []
    const rpSuggestedQuestion = readString(responsePlan.suggestedQuestion)
    const rpAvoid = readStringArray(responsePlan.avoid) ?? []

    if (!rpOpeningMove) {
      return null
    }

    const snHasActiveRisk = readBoolean(safetyNotes.hasActiveRiskMarkers)
    const snNotes = readStringArray(safetyNotes.notes) ?? []

    if (snHasActiveRisk === null) {
      return null
    }

    return {
      schemaVersion: 1,
      messageId: identity.messageId,
      sessionId: identity.sessionId,
      supportMode: supportMode as Stage3SupportMode,
      depthLevel: depthLevel as Stage3DepthLevel,
      responseGoal,
      emotionalHypothesis: {
        summary: ehSummary,
        evidence: ehEvidence,
        confidence: ehConfidence
      },
      memoryUse: {
        relevantMemoryIds: muRelevantIds,
        summary: muSummary,
        ...(muCaution ? { caution: muCaution } : {})
      },
      responsePlan: {
        openingMove: rpOpeningMove,
        keyPoints: rpKeyPoints,
        ...(rpSuggestedQuestion ? { suggestedQuestion: rpSuggestedQuestion } : {}),
        avoid: rpAvoid
      },
      safetyNotes: {
        hasActiveRiskMarkers: snHasActiveRisk,
        notes: snNotes
      }
    }
  } catch {
    return null
  }
}

export function buildFallbackStage3Output(options: {
  messageId: string
  sessionId: string
  stage1Summary?: string | null
  userMessage: string
  retrievedMemoryIds?: string[]
  hasRiskMarkers?: boolean
}): Stage3ReasoningOutput {
  const summary = options.stage1Summary?.trim() || options.userMessage.slice(0, 240)

  return {
    schemaVersion: 1,
    messageId: options.messageId,
    sessionId: options.sessionId,
    supportMode: 'supportive',
    depthLevel: 'light',
    responseGoal: summary,
    emotionalHypothesis: {
      summary: 'Unable to determine emotional state with structured reasoning.',
      evidence: [],
      confidence: 0
    },
    memoryUse: {
      relevantMemoryIds: options.retrievedMemoryIds ?? [],
      summary: options.retrievedMemoryIds?.length
        ? 'Memory was retrieved but should be used cautiously without structured reasoning.'
        : 'No memory was retrieved.',
      caution: 'Fallback reasoning was used. Treat memory references with extra care.'
    },
    responsePlan: {
      openingMove: 'Acknowledge the user and reflect back what was shared.',
      keyPoints: ['Stay supportive and grounded.', 'Do not over-interpret.'],
      avoid: ['Diagnosing or labeling.', 'Making assumptions beyond what was shared.']
    },
    safetyNotes: {
      hasActiveRiskMarkers: options.hasRiskMarkers ?? false,
      notes: options.hasRiskMarkers
        ? ['Risk markers were detected by Stage 1 but did not trigger crisis interrupt.']
        : []
    }
  }
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return error.name === 'TimeoutError' || error.message.toLowerCase().includes('timeout')
}

export async function runStage3Reasoner(options: {
  settings: AppSettings
  userMessage: MessageRecord
  contextMessages: MessageRecord[]
  stage1Output: Stage1ParseOutput
  currentSessionSummary?: PersistedSessionSummary | null
  retrievedMemory: RetrievedMemoryItem[]
}): Promise<Stage3ReasoningOutput> {
  const fallback = buildFallbackStage3Output({
    messageId: options.userMessage.id,
    sessionId: options.userMessage.sessionId,
    stage1Summary: options.stage1Output.summary,
    userMessage: options.userMessage.content,
    retrievedMemoryIds: options.retrievedMemory.map((m) => m.id),
    hasRiskMarkers: options.stage1Output.riskMarkers.length > 0
  })

  try {
    const { model } = new Stage3ProviderRegistryBuilder(options.settings).build()
    const result = await generateText({
      model,
      system: stage3SystemPrompt,
      prompt: buildStage3Prompt({
        messageId: options.userMessage.id,
        sessionId: options.userMessage.sessionId,
        latestUserMessage: options.userMessage.content,
        currentSessionSummary: options.currentSessionSummary?.summaryText ?? null,
        recentTranscript: options.contextMessages.map((m) => ({
          role: m.role,
          content: m.content
        })),
        stage1Output: options.stage1Output,
        retrievedMemory: options.retrievedMemory
      }),
      maxRetries: stage3ProviderMaxRetries,
      timeout: {
        totalMs: stage3AttemptTimeoutMs,
        stepMs: stage3AttemptTimeoutMs
      }
    })

    const parsed = parseStage3ReasoningOutput(result.text, {
      messageId: options.userMessage.id,
      sessionId: options.userMessage.sessionId
    })

    if (!parsed) {
      console.warn('Stage 3 reasoner returned invalid JSON. Using fallback.')
      return fallback
    }

    return parsed
  } catch (error) {
    if (isTimeoutError(error)) {
      console.warn('Stage 3 reasoner timed out. Using fallback.')
    } else {
      console.warn(
        'Stage 3 reasoner failed. Using fallback.',
        error instanceof Error ? `${error.name}: ${error.message}` : error
      )
    }

    return fallback
  }
}
