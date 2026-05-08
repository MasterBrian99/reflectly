export type Stage1IntentCategory =
  | 'vent'
  | 'reflect'
  | 'problem_solve'
  | 'request_advice'
  | 'crisis_signal'
  | 'other'

export type Stage1EntityType = 'person' | 'relationship' | 'place' | 'event' | 'concept' | 'other'
export type Stage1Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed'
export type Stage1GoalStatus = 'new' | 'active' | 'blocked' | 'unclear'
export type Stage1QuestionType = 'open' | 'choice' | 'scale'
export type Stage1RiskType =
  | 'self_harm'
  | 'suicidal_ideation'
  | 'harm_to_others'
  | 'abuse'
  | 'acute_distress'
  | 'other'
export type Stage1RiskSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ClarificationUrgency = 'low' | 'medium' | 'high'
export type ClarificationStatus = 'pending' | 'resolved' | 'skipped'

export interface Stage1ParseOutput {
  schemaVersion: 1
  messageId: string
  sessionId: string
  summary: string
  emotionalTone: {
    primary: string
    secondary: string[]
    valence: number
    arousal: number
    confidence: number
  }
  intent: {
    expressed: string
    inferred: string
    category: Stage1IntentCategory
    confidence: number
  }
  entities: Array<{
    type: Stage1EntityType
    name: string
    description?: string
    sentiment?: Stage1Sentiment
  }>
  goalHints: Array<{
    description: string
    status: Stage1GoalStatus
  }>
  contextGaps: Array<{
    id: string
    description: string
    whyItMatters: string
    score: number
    questionType: Stage1QuestionType
    options?: string[]
    scaleAnchors?: [string, string]
  }>
  riskMarkers: Array<{
    type: Stage1RiskType
    severity: Stage1RiskSeverity
    evidence: string
    confidence: number
  }>
  shouldClarify: boolean
  clarification?: {
    questionType: Stage1QuestionType
    questionText: string
    options?: string[]
    scaleAnchors?: [string, string]
    gapBeingResolved: string
    urgency: ClarificationUrgency
  }
}

export interface ClarificationRequest {
  id: string
  sessionId: string
  sourceMessageId: string
  assistantMessageId: string | null
  resolvedByMessageId: string | null
  questionType: Stage1QuestionType
  questionText: string
  options?: string[]
  scaleAnchors?: [string, string]
  gapBeingResolved: string
  urgency: ClarificationUrgency
  status: ClarificationStatus
  createdAt: string
  updatedAt: string
}
