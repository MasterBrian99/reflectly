import type { Stage1ParseOutput, Stage1RiskSeverity, Stage1RiskType } from '../stage1/types'

export type SafetyRiskType = Stage1RiskType
export type SafetyRiskSeverity = Stage1RiskSeverity
export type SafetyRiskMarker = Stage1ParseOutput['riskMarkers'][number]
export type SafetyAction = 'proceed' | 'supportive_notice' | 'crisis_interrupt'

export interface SafetyDecision {
  action: SafetyAction
  marker: SafetyRiskMarker | null
}

export interface SafetyEventRecord {
  id: string
  sessionId: string
  sourceMessageId: string
  assistantMessageId: string | null
  riskType: SafetyRiskType
  severity: SafetyRiskSeverity
  evidence: string
  actionTaken: SafetyAction
  createdAt: string
}
