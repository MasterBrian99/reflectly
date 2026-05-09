export type Stage3SupportMode =
  | 'reflective'
  | 'practical'
  | 'psychoeducation'
  | 'grounding'
  | 'values'
  | 'problem_solving'
  | 'supportive'

export type Stage3DepthLevel = 'light' | 'moderate' | 'deep'

export interface Stage3ReasoningOutput {
  schemaVersion: 1
  messageId: string
  sessionId: string
  supportMode: Stage3SupportMode
  depthLevel: Stage3DepthLevel
  responseGoal: string
  emotionalHypothesis: {
    summary: string
    evidence: string[]
    confidence: number
  }
  memoryUse: {
    relevantMemoryIds: string[]
    summary: string
    caution?: string
  }
  responsePlan: {
    openingMove: string
    keyPoints: string[]
    suggestedQuestion?: string
    avoid: string[]
  }
  safetyNotes: {
    hasActiveRiskMarkers: boolean
    notes: string[]
  }
}

export const supportModes = new Set<Stage3SupportMode>([
  'reflective',
  'practical',
  'psychoeducation',
  'grounding',
  'values',
  'problem_solving',
  'supportive'
])

export const depthLevels = new Set<Stage3DepthLevel>(['light', 'moderate', 'deep'])
