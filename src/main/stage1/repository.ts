import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import { openWorkspaceDatabase } from '../workspace/database'
import type { ClarificationRequest, Stage1ParseOutput } from './types'

interface ClarificationRequestRow {
  id: string
  session_id: string
  source_message_id: string
  assistant_message_id: string | null
  resolved_by_message_id: string | null
  question_type: ClarificationRequest['questionType']
  question_text: string
  options: string | null
  scale_anchors: string | null
  gap_being_resolved: string
  urgency: ClarificationRequest['urgency']
  status: ClarificationRequest['status']
  created_at: string
  updated_at: string
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value)
}

function parseStringArray(raw: string | null): string[] | undefined {
  if (!raw) {
    return undefined
  }

  try {
    const parsed = JSON.parse(raw) as unknown

    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      return undefined
    }

    return parsed
  } catch {
    return undefined
  }
}

function parseScaleAnchors(raw: string | null): [string, string] | undefined {
  const parsed = parseStringArray(raw)

  if (!parsed || parsed.length !== 2) {
    return undefined
  }

  return [parsed[0], parsed[1]]
}

function mapClarificationRequest(row: ClarificationRequestRow): ClarificationRequest {
  return {
    id: row.id,
    sessionId: row.session_id,
    sourceMessageId: row.source_message_id,
    assistantMessageId: row.assistant_message_id,
    resolvedByMessageId: row.resolved_by_message_id,
    questionType: row.question_type,
    questionText: row.question_text,
    options: parseStringArray(row.options),
    scaleAnchors: parseScaleAnchors(row.scale_anchors),
    gapBeingResolved: row.gap_being_resolved,
    urgency: row.urgency,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function getClarificationRequestById(
  database: DatabaseSync,
  id: string
): ClarificationRequest | null {
  const row = database
    .prepare(
      `
        SELECT
          id,
          session_id,
          source_message_id,
          assistant_message_id,
          resolved_by_message_id,
          question_type,
          question_text,
          options,
          scale_anchors,
          gap_being_resolved,
          urgency,
          status,
          created_at,
          updated_at
        FROM clarification_requests
        WHERE id = ?
      `
    )
    .get(id) as ClarificationRequestRow | undefined

  return row ? mapClarificationRequest(row) : null
}

export function upsertStage1ParseOutput(
  workspacePath: string,
  output: Stage1ParseOutput
): Stage1ParseOutput {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const now = new Date().toISOString()

    database
      .prepare(
        `
          INSERT INTO stage1_parse_outputs (
            message_id,
            session_id,
            schema_version,
            summary,
            emotional_tone,
            intent,
            entities,
            goal_hints,
            context_gaps,
            risk_markers,
            should_clarify,
            clarification,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(message_id) DO UPDATE SET
            session_id = excluded.session_id,
            schema_version = excluded.schema_version,
            summary = excluded.summary,
            emotional_tone = excluded.emotional_tone,
            intent = excluded.intent,
            entities = excluded.entities,
            goal_hints = excluded.goal_hints,
            context_gaps = excluded.context_gaps,
            risk_markers = excluded.risk_markers,
            should_clarify = excluded.should_clarify,
            clarification = excluded.clarification,
            updated_at = excluded.updated_at
        `
      )
      .run(
        output.messageId,
        output.sessionId,
        output.schemaVersion,
        output.summary,
        serializeJson(output.emotionalTone),
        serializeJson(output.intent),
        serializeJson(output.entities),
        serializeJson(output.goalHints),
        serializeJson(output.contextGaps),
        serializeJson(output.riskMarkers),
        output.shouldClarify ? 1 : 0,
        output.clarification ? serializeJson(output.clarification) : null,
        now,
        now
      )

    return output
  } finally {
    database.close()
  }
}

export function insertClarificationRequest(
  workspacePath: string,
  input: {
    sessionId: string
    sourceMessageId: string
    assistantMessageId: string
    clarification: NonNullable<Stage1ParseOutput['clarification']>
  }
): ClarificationRequest {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const id = randomUUID()
    const now = new Date().toISOString()

    database
      .prepare(
        `
          INSERT INTO clarification_requests (
            id,
            session_id,
            source_message_id,
            assistant_message_id,
            resolved_by_message_id,
            question_type,
            question_text,
            options,
            scale_anchors,
            gap_being_resolved,
            urgency,
            status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `
      )
      .run(
        id,
        input.sessionId,
        input.sourceMessageId,
        input.assistantMessageId,
        input.clarification.questionType,
        input.clarification.questionText,
        input.clarification.options ? serializeJson(input.clarification.options) : null,
        input.clarification.scaleAnchors ? serializeJson(input.clarification.scaleAnchors) : null,
        input.clarification.gapBeingResolved,
        input.clarification.urgency,
        now,
        now
      )

    const request = getClarificationRequestById(database, id)

    if (!request) {
      throw new Error('Clarification request insert could not be read back.')
    }

    return request
  } finally {
    database.close()
  }
}

export function getLatestPendingClarificationRequest(
  workspacePath: string,
  sessionId: string
): ClarificationRequest | null {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const row = database
      .prepare(
        `
          SELECT
            id,
            session_id,
            source_message_id,
            assistant_message_id,
            resolved_by_message_id,
            question_type,
            question_text,
            options,
            scale_anchors,
            gap_being_resolved,
            urgency,
            status,
            created_at,
            updated_at
          FROM clarification_requests
          WHERE session_id = ? AND status = 'pending'
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        `
      )
      .get(sessionId) as ClarificationRequestRow | undefined

    return row ? mapClarificationRequest(row) : null
  } finally {
    database.close()
  }
}

export function resolveLatestPendingClarificationRequest(
  workspacePath: string,
  sessionId: string,
  resolvedByMessageId: string
): ClarificationRequest | null {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    database.exec('BEGIN')

    try {
      const row = database
        .prepare(
          `
            SELECT
              id,
              session_id,
              source_message_id,
              assistant_message_id,
              resolved_by_message_id,
              question_type,
              question_text,
              options,
              scale_anchors,
              gap_being_resolved,
              urgency,
              status,
              created_at,
              updated_at
            FROM clarification_requests
            WHERE session_id = ? AND status = 'pending'
            ORDER BY created_at DESC, id DESC
            LIMIT 1
          `
        )
        .get(sessionId) as ClarificationRequestRow | undefined

      if (!row) {
        database.exec('COMMIT')
        return null
      }

      const now = new Date().toISOString()

      database
        .prepare(
          `
            UPDATE clarification_requests
            SET status = 'resolved',
              resolved_by_message_id = ?,
              updated_at = ?
            WHERE id = ?
          `
        )
        .run(resolvedByMessageId, now, row.id)

      database.exec('COMMIT')

      return getClarificationRequestById(database, row.id)
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
  } finally {
    database.close()
  }
}

export function countRecentClarificationLoops(workspacePath: string, sessionId: string): number {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const row = database
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM clarification_requests
          WHERE session_id = ? AND status IN ('pending', 'resolved')
        `
      )
      .get(sessionId) as { count: number } | undefined

    return Number(row?.count ?? 0)
  } finally {
    database.close()
  }
}
