import { generateText } from 'ai'
import type { AppSettings } from '../../shared/app-settings'
import type { MessageRecord } from '../../shared/session-chat'
import { ChatProviderRegistryBuilder } from '../ai/provider-registry'
import type { PersistedSessionSummary } from '../memory/repository'
import { buildStage1Prompt, stage1SystemPrompt } from './prompts'
import type {
  ClarificationUrgency,
  Stage1EntityType,
  Stage1GoalStatus,
  Stage1IntentCategory,
  Stage1ParseOutput,
  Stage1QuestionType,
  Stage1RiskSeverity,
  Stage1RiskType,
  Stage1Sentiment
} from './types'

const intentCategories = new Set<Stage1IntentCategory>([
  'vent',
  'reflect',
  'problem_solve',
  'request_advice',
  'crisis_signal',
  'other'
])
const entityTypes = new Set<Stage1EntityType>([
  'person',
  'relationship',
  'place',
  'event',
  'concept',
  'other'
])
const sentiments = new Set<Stage1Sentiment>(['positive', 'neutral', 'negative', 'mixed'])
const goalStatuses = new Set<Stage1GoalStatus>(['new', 'active', 'blocked', 'unclear'])
const questionTypes = new Set<Stage1QuestionType>(['open', 'choice', 'scale'])
const riskTypes = new Set<Stage1RiskType>([
  'self_harm',
  'suicidal_ideation',
  'harm_to_others',
  'abuse',
  'acute_distress',
  'other'
])
const riskSeverities = new Set<Stage1RiskSeverity>(['low', 'medium', 'high', 'critical'])
const urgencyLevels = new Set<ClarificationUrgency>(['low', 'medium', 'high'])
const stage1ModelAttempts = 2
const stage1AttemptTimeoutMs = 45000
const stage1ProviderMaxRetries = 1

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

function readEnum<T extends string>(value: unknown, allowed: Set<T>): T | null {
  return typeof value === 'string' && allowed.has(value as T) ? (value as T) : null
}

function readStringArray(value: unknown, limit = 8): string[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const strings = value
    .map((item) => readString(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, limit)

  return strings.length === value.length ? strings : null
}

function readScaleAnchors(value: unknown): [string, string] | undefined {
  const strings = readStringArray(value, 2)

  if (!strings || strings.length !== 2) {
    return undefined
  }

  return [strings[0], strings[1]]
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

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term))
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return error.name === 'TimeoutError' || error.message.toLowerCase().includes('timeout')
}

function logStage1Fallback(error: unknown): void {
  if (isTimeoutError(error)) {
    console.warn('Stage 1 parser timed out after retry. Using local fallback parse output.')
    return
  }

  console.warn(
    'Stage 1 parser failed. Using local fallback parse output.',
    error instanceof Error ? `${error.name}: ${error.message}` : error
  )
}

async function generateStage1Text(options: {
  model: Parameters<typeof generateText>[0]['model']
  system: string
  prompt: string
}): Promise<string> {
  let lastError: unknown

  for (let attempt = 1; attempt <= stage1ModelAttempts; attempt += 1) {
    try {
      const result = await generateText({
        model: options.model,
        system: options.system,
        prompt: options.prompt,
        maxRetries: stage1ProviderMaxRetries,
        timeout: {
          totalMs: stage1AttemptTimeoutMs,
          stepMs: stage1AttemptTimeoutMs
        }
      })

      return result.text
    } catch (error) {
      lastError = error

      if (!isTimeoutError(error) || attempt === stage1ModelAttempts) {
        throw error
      }

      console.warn(`Stage 1 parser attempt ${attempt} timed out. Retrying once.`)
    }
  }

  throw lastError
}

export function buildFallbackStage1ParseOutput(options: {
  messageId: string
  sessionId: string
  content: string
}): Stage1ParseOutput {
  const normalizedContent = options.content.replace(/\s+/g, ' ').trim()
  const lowerContent = normalizedContent.toLowerCase()
  const hasSuicidalSignal = includesAny(lowerContent, [
    'kill myself',
    'suicide',
    'suicidal',
    'end it all',
    'i want to disappear',
    "i can't go on",
    'i cannot go on'
  ])
  const hasSelfHarmSignal = includesAny(lowerContent, [
    'hurt myself',
    'hurting myself',
    'harm myself',
    'i might hurt myself',
    'i want to hurt myself'
  ])
  const hasHarmToOthersSignal = includesAny(lowerContent, [
    'hurt someone',
    'harm someone',
    'i want to hurt someone',
    'i might hurt someone'
  ])
  const hasRiskSignal = hasSuicidalSignal || hasSelfHarmSignal || hasHarmToOthersSignal
  const feelsStuck = includesAny(lowerContent, [
    'feel stuck',
    'feeling stuck',
    'i am stuck',
    "i'm stuck",
    'don’t know what to do',
    "don't know what to do",
    'not sure what to do',
    'prefer interactive',
    'buttons'
  ])
  const feelsOverwhelmed = includesAny(lowerContent, [
    'too much',
    'overwhelmed',
    'overwhelming',
    'cannot handle',
    "can't handle"
  ])
  const contextGaps: Stage1ParseOutput['contextGaps'] = []

  if (!hasRiskSignal && feelsStuck) {
    contextGaps.push({
      id: 'preferred-support-style',
      description: 'Whether the user wants reflective support or one practical next step.',
      whyItMatters: 'The next assistant response would differ based on the support style.',
      score: 0.82,
      questionType: 'choice',
      options: ['Talk it through', 'Find one next step']
    })
  }

  if (!hasRiskSignal && !feelsStuck && feelsOverwhelmed) {
    contextGaps.push({
      id: 'current-impact-level',
      description: 'How much the situation is affecting the user right now.',
      whyItMatters: 'The assistant can calibrate the response to the current level of distress.',
      score: 0.78,
      questionType: 'scale',
      scaleAnchors: ['Barely affecting me', 'Affecting me a lot']
    })
  }

  return {
    schemaVersion: 1,
    messageId: options.messageId,
    sessionId: options.sessionId,
    summary: normalizedContent.slice(0, 240) || 'User shared a message.',
    emotionalTone: {
      primary: hasRiskSignal
        ? 'distressed'
        : feelsOverwhelmed
          ? 'overwhelmed'
          : feelsStuck
            ? 'stuck'
            : 'unclear',
      secondary: [],
      valence: hasRiskSignal || feelsOverwhelmed || feelsStuck ? -0.4 : 0,
      arousal: hasRiskSignal || feelsOverwhelmed ? 0.7 : feelsStuck ? 0.4 : 0,
      confidence: hasRiskSignal || feelsOverwhelmed || feelsStuck ? 0.55 : 0
    },
    intent: {
      expressed: normalizedContent || 'User shared a message.',
      inferred: hasRiskSignal
        ? 'Respond supportively without blocking on clarification.'
        : 'Continue the reflective conversation.',
      category: hasRiskSignal
        ? 'crisis_signal'
        : feelsStuck || feelsOverwhelmed
          ? 'reflect'
          : 'other',
      confidence: hasRiskSignal || feelsOverwhelmed || feelsStuck ? 0.55 : 0
    },
    entities: [],
    goalHints: [],
    contextGaps,
    riskMarkers: hasRiskSignal
      ? [
          {
            type: hasSuicidalSignal
              ? 'suicidal_ideation'
              : hasHarmToOthersSignal
                ? 'harm_to_others'
                : 'self_harm',
            severity: hasSuicidalSignal ? 'high' : 'medium',
            evidence: normalizedContent.slice(0, 240),
            confidence: 0.7
          }
        ]
      : [],
    shouldClarify: false
  }
}

export function parseStage1ParseOutput(
  text: string,
  identity: {
    messageId: string
    sessionId: string
  }
): Stage1ParseOutput | null {
  const jsonPayload = extractJsonObject(text)

  if (!jsonPayload) {
    return null
  }

  try {
    const parsed = JSON.parse(jsonPayload) as unknown

    if (!isRecord(parsed) || parsed.schemaVersion !== 1) {
      return null
    }

    if (!readString(parsed.messageId) || !readString(parsed.sessionId)) {
      return null
    }

    const summary = readString(parsed.summary)
    const emotionalTone = isRecord(parsed.emotionalTone) ? parsed.emotionalTone : null
    const intent = isRecord(parsed.intent) ? parsed.intent : null
    const shouldClarify = readBoolean(parsed.shouldClarify)

    if (!summary || !emotionalTone || !intent || shouldClarify === null) {
      return null
    }

    const primary = readString(emotionalTone.primary)
    const secondary = readStringArray(emotionalTone.secondary)
    const valence = readNumber(emotionalTone.valence)
    const arousal = readNumber(emotionalTone.arousal)
    const emotionalConfidence = readNumber(emotionalTone.confidence)
    const expressed = readString(intent.expressed)
    const inferred = readString(intent.inferred)
    const category = readEnum(intent.category, intentCategories)
    const intentConfidence = readNumber(intent.confidence)

    if (
      !primary ||
      !secondary ||
      valence === null ||
      arousal === null ||
      emotionalConfidence === null ||
      !expressed ||
      !inferred ||
      !category ||
      intentConfidence === null
    ) {
      return null
    }

    if (
      !Array.isArray(parsed.entities) ||
      !Array.isArray(parsed.goalHints) ||
      !Array.isArray(parsed.contextGaps) ||
      !Array.isArray(parsed.riskMarkers)
    ) {
      return null
    }

    const entities = parsed.entities.map((entity) => {
      if (!isRecord(entity)) {
        return null
      }

      const type = readEnum(entity.type, entityTypes)
      const name = readString(entity.name)
      const description = readString(entity.description)
      const sentiment = readEnum(entity.sentiment, sentiments)

      if (!type || !name) {
        return null
      }

      return {
        type,
        name,
        ...(description ? { description } : {}),
        ...(sentiment ? { sentiment } : {})
      }
    })
    const goalHints = parsed.goalHints.map((goalHint) => {
      if (!isRecord(goalHint)) {
        return null
      }

      const description = readString(goalHint.description)
      const status = readEnum(goalHint.status, goalStatuses)

      return description && status ? { description, status } : null
    })
    const contextGaps = parsed.contextGaps.map((contextGap) => {
      if (!isRecord(contextGap)) {
        return null
      }

      const id = readString(contextGap.id)
      const description = readString(contextGap.description)
      const whyItMatters = readString(contextGap.whyItMatters)
      const score = readNumber(contextGap.score)
      const questionType = readEnum(contextGap.questionType, questionTypes)
      const options = readStringArray(contextGap.options, 4) ?? undefined
      const scaleAnchors = readScaleAnchors(contextGap.scaleAnchors)

      if (!id || !description || !whyItMatters || score === null || !questionType) {
        return null
      }

      return {
        id,
        description,
        whyItMatters,
        score,
        questionType,
        ...(options ? { options } : {}),
        ...(scaleAnchors ? { scaleAnchors } : {})
      }
    })
    const riskMarkers = parsed.riskMarkers.map((riskMarker) => {
      if (!isRecord(riskMarker)) {
        return null
      }

      const type = readEnum(riskMarker.type, riskTypes)
      const severity = readEnum(riskMarker.severity, riskSeverities)
      const evidence = readString(riskMarker.evidence)
      const confidence = readNumber(riskMarker.confidence)

      if (!type || !severity || !evidence || confidence === null) {
        return null
      }

      return {
        type,
        severity,
        evidence,
        confidence
      }
    })

    if (
      entities.some((entity) => !entity) ||
      goalHints.some((goalHint) => !goalHint) ||
      contextGaps.some((contextGap) => !contextGap) ||
      riskMarkers.some((riskMarker) => !riskMarker)
    ) {
      return null
    }

    const clarification = isRecord(parsed.clarification) ? parsed.clarification : null
    const questionType = clarification ? readEnum(clarification.questionType, questionTypes) : null
    const questionText = clarification ? readString(clarification.questionText) : null
    const gapBeingResolved = clarification ? readString(clarification.gapBeingResolved) : null
    const urgency = clarification ? readEnum(clarification.urgency, urgencyLevels) : null
    const clarificationOptions = clarification
      ? (readStringArray(clarification.options, 4) ?? undefined)
      : undefined
    const clarificationScaleAnchors = clarification
      ? readScaleAnchors(clarification.scaleAnchors)
      : undefined

    return {
      schemaVersion: 1,
      messageId: identity.messageId,
      sessionId: identity.sessionId,
      summary,
      emotionalTone: {
        primary,
        secondary,
        valence,
        arousal,
        confidence: emotionalConfidence
      },
      intent: {
        expressed,
        inferred,
        category,
        confidence: intentConfidence
      },
      entities: entities as Stage1ParseOutput['entities'],
      goalHints: goalHints as Stage1ParseOutput['goalHints'],
      contextGaps: contextGaps as Stage1ParseOutput['contextGaps'],
      riskMarkers: riskMarkers as Stage1ParseOutput['riskMarkers'],
      shouldClarify,
      ...(questionType && questionText && gapBeingResolved && urgency
        ? {
            clarification: {
              questionType,
              questionText,
              ...(clarificationOptions ? { options: clarificationOptions } : {}),
              ...(clarificationScaleAnchors ? { scaleAnchors: clarificationScaleAnchors } : {}),
              gapBeingResolved,
              urgency
            }
          }
        : {})
    }
  } catch {
    return null
  }
}

export async function runStage1Parser(options: {
  settings: AppSettings
  userMessage: MessageRecord
  contextMessages: MessageRecord[]
  currentSessionSummary?: PersistedSessionSummary | null
}): Promise<Stage1ParseOutput> {
  const fallback = buildFallbackStage1ParseOutput({
    messageId: options.userMessage.id,
    sessionId: options.userMessage.sessionId,
    content: options.userMessage.content
  })

  try {
    const { model } = new ChatProviderRegistryBuilder(options.settings).build()
    const text = await generateStage1Text({
      model,
      system: stage1SystemPrompt,
      prompt: buildStage1Prompt({
        messageId: options.userMessage.id,
        sessionId: options.userMessage.sessionId,
        latestUserMessage: options.userMessage.content,
        currentSessionSummary: options.currentSessionSummary?.summaryText ?? null,
        recentMessages: options.contextMessages
      })
    })
    const parsed = parseStage1ParseOutput(text, {
      messageId: options.userMessage.id,
      sessionId: options.userMessage.sessionId
    })

    if (!parsed) {
      throw new Error('Stage 1 parser returned invalid JSON.')
    }

    return parsed
  } catch (error) {
    logStage1Fallback(error)
    return fallback
  }
}
