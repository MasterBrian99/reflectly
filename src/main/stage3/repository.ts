import { openWorkspaceDatabase } from '../workspace/database'
import type { Stage3ReasoningOutput } from './types'

interface Stage3Row {
  message_id: string
  session_id: string
  assistant_message_id: string | null
  schema_version: number
  support_mode: string
  depth_level: string
  response_goal: string
  emotional_hypothesis: string
  memory_use: string
  response_plan: string
  safety_notes: string
  created_at: string
  updated_at: string
}

function mapRow(row: Stage3Row): Stage3ReasoningOutput & { assistantMessageId: string | null } {
  return {
    schemaVersion: 1,
    messageId: row.message_id,
    sessionId: row.session_id,
    supportMode: row.support_mode as Stage3ReasoningOutput['supportMode'],
    depthLevel: row.depth_level as Stage3ReasoningOutput['depthLevel'],
    responseGoal: row.response_goal,
    emotionalHypothesis: JSON.parse(row.emotional_hypothesis),
    memoryUse: JSON.parse(row.memory_use),
    responsePlan: JSON.parse(row.response_plan),
    safetyNotes: JSON.parse(row.safety_notes),
    assistantMessageId: row.assistant_message_id
  }
}

export function upsertStage3ReasoningOutput(
  workspacePath: string,
  output: Stage3ReasoningOutput,
  assistantMessageId?: string | null
): void {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const now = new Date().toISOString()

    database
      .prepare(
        `
          INSERT INTO stage3_reasoning_outputs (
            message_id,
            session_id,
            assistant_message_id,
            schema_version,
            support_mode,
            depth_level,
            response_goal,
            emotional_hypothesis,
            memory_use,
            response_plan,
            safety_notes,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(message_id) DO UPDATE SET
            assistant_message_id = COALESCE(excluded.assistant_message_id, stage3_reasoning_outputs.assistant_message_id),
            support_mode = excluded.support_mode,
            depth_level = excluded.depth_level,
            response_goal = excluded.response_goal,
            emotional_hypothesis = excluded.emotional_hypothesis,
            memory_use = excluded.memory_use,
            response_plan = excluded.response_plan,
            safety_notes = excluded.safety_notes,
            updated_at = excluded.updated_at
        `
      )
      .run(
        output.messageId,
        output.sessionId,
        assistantMessageId ?? null,
        output.schemaVersion,
        output.supportMode,
        output.depthLevel,
        output.responseGoal,
        JSON.stringify(output.emotionalHypothesis),
        JSON.stringify(output.memoryUse),
        JSON.stringify(output.responsePlan),
        JSON.stringify(output.safetyNotes),
        now,
        now
      )
  } finally {
    database.close()
  }
}

export function attachAssistantMessageId(
  workspacePath: string,
  messageId: string,
  assistantMessageId: string
): void {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    database
      .prepare(
        `
          UPDATE stage3_reasoning_outputs
          SET assistant_message_id = ?, updated_at = ?
          WHERE message_id = ?
        `
      )
      .run(assistantMessageId, new Date().toISOString(), messageId)
  } finally {
    database.close()
  }
}

export function getStage3ReasoningOutput(
  workspacePath: string,
  messageId: string
): (Stage3ReasoningOutput & { assistantMessageId: string | null }) | null {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const row = database
      .prepare(
        `
          SELECT
            message_id,
            session_id,
            assistant_message_id,
            schema_version,
            support_mode,
            depth_level,
            response_goal,
            emotional_hypothesis,
            memory_use,
            response_plan,
            safety_notes,
            created_at,
            updated_at
          FROM stage3_reasoning_outputs
          WHERE message_id = ?
        `
      )
      .get(messageId) as Stage3Row | undefined

    return row ? mapRow(row) : null
  } finally {
    database.close()
  }
}
