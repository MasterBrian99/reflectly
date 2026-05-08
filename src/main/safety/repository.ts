import { randomUUID } from 'node:crypto'
import type { SafetyAction, SafetyEventRecord, SafetyRiskSeverity, SafetyRiskType } from './types'
import { openWorkspaceDatabase } from '../workspace/database'

interface SafetyEventRow {
  id: string
  session_id: string
  source_message_id: string
  assistant_message_id: string | null
  risk_type: SafetyRiskType
  severity: SafetyRiskSeverity
  evidence: string
  action_taken: SafetyAction
  created_at: string
}

function mapSafetyEvent(row: SafetyEventRow): SafetyEventRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    sourceMessageId: row.source_message_id,
    assistantMessageId: row.assistant_message_id,
    riskType: row.risk_type,
    severity: row.severity,
    evidence: row.evidence,
    actionTaken: row.action_taken,
    createdAt: row.created_at
  }
}

export function insertSafetyEvent(
  workspacePath: string,
  input: {
    sessionId: string
    sourceMessageId: string
    assistantMessageId: string | null
    riskType: SafetyRiskType
    severity: SafetyRiskSeverity
    evidence: string
    actionTaken: SafetyAction
  }
): SafetyEventRecord {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const id = randomUUID()
    const now = new Date().toISOString()

    database
      .prepare(
        `
          INSERT INTO safety_events (
            id,
            session_id,
            source_message_id,
            assistant_message_id,
            risk_type,
            severity,
            evidence,
            action_taken,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        id,
        input.sessionId,
        input.sourceMessageId,
        input.assistantMessageId,
        input.riskType,
        input.severity,
        input.evidence,
        input.actionTaken,
        now
      )

    const row = database
      .prepare(
        `
          SELECT
            id,
            session_id,
            source_message_id,
            assistant_message_id,
            risk_type,
            severity,
            evidence,
            action_taken,
            created_at
          FROM safety_events
          WHERE id = ?
        `
      )
      .get(id) as SafetyEventRow | undefined

    if (!row) {
      throw new Error('Safety event insert could not be read back.')
    }

    return mapSafetyEvent(row)
  } finally {
    database.close()
  }
}

export function listSafetyEventsForSession(
  workspacePath: string,
  sessionId: string
): SafetyEventRecord[] {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const rows = database
      .prepare(
        `
          SELECT
            id,
            session_id,
            source_message_id,
            assistant_message_id,
            risk_type,
            severity,
            evidence,
            action_taken,
            created_at
          FROM safety_events
          WHERE session_id = ?
          ORDER BY created_at DESC, id DESC
        `
      )
      .all(sessionId) as unknown as SafetyEventRow[]

    return rows.map(mapSafetyEvent)
  } finally {
    database.close()
  }
}
