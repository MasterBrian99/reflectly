import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type {
  AgentActivityItem,
  MessageRecord,
  SessionDetail,
  SessionSummary
} from '../../shared/session-chat'
import { openWorkspaceDatabase } from '../workspace/database'

const defaultSessionTitle = 'New session'

interface SessionSummaryRow {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

interface MessageRow {
  id: string
  session_id: string
  role: MessageRecord['role']
  content: string
  created_at: string
}

interface AgentActivityRow {
  assistant_message_id: string
  activity_id: string
  kind: AgentActivityItem['kind']
  status: AgentActivityItem['status']
  label: string
  detail: string | null
  created_at: string
}

function mapSessionSummary(row: SessionSummaryRow): SessionSummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messageCount: Number(row.message_count)
  }
}

function mapMessageRecord(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at
  }
}

function mapAgentActivity(row: AgentActivityRow): AgentActivityItem {
  return {
    id: row.activity_id,
    kind: row.kind,
    status: row.status,
    label: row.label,
    ...(row.detail ? { detail: row.detail } : {}),
    createdAt: row.created_at
  }
}

function getSessionSummaryById(database: DatabaseSync, sessionId: string): SessionSummary | null {
  const row = database
    .prepare(
      `
        SELECT
          s.id,
          s.title,
          s.created_at,
          s.updated_at,
          COUNT(m.id) AS message_count
        FROM sessions s
        LEFT JOIN messages m ON m.session_id = s.id
        WHERE s.id = ?
        GROUP BY s.id, s.title, s.created_at, s.updated_at
      `
    )
    .get(sessionId) as SessionSummaryRow | undefined

  return row ? mapSessionSummary(row) : null
}

function deriveSessionTitle(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  return normalized.slice(0, 60) || defaultSessionTitle
}

export function listSessions(workspacePath: string): SessionSummary[] {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const rows = database
      .prepare(
        `
          SELECT
            s.id,
            s.title,
            s.created_at,
            s.updated_at,
            COUNT(m.id) AS message_count
          FROM sessions s
          LEFT JOIN messages m ON m.session_id = s.id
          GROUP BY s.id, s.title, s.created_at, s.updated_at
          ORDER BY s.updated_at DESC, s.created_at DESC, s.id DESC
        `
      )
      .all() as unknown as SessionSummaryRow[]

    return rows.map(mapSessionSummary)
  } finally {
    database.close()
  }
}

export function createSession(workspacePath: string): SessionDetail {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const sessionId = randomUUID()
    const now = new Date().toISOString()

    database
      .prepare(
        `
          INSERT INTO sessions (id, title, status, created_at, updated_at)
          VALUES (?, ?, 'active', ?, ?)
        `
      )
      .run(sessionId, defaultSessionTitle, now, now)

    const session = getSessionSummaryById(database, sessionId)

    return {
      session: session ?? {
        id: sessionId,
        title: defaultSessionTitle,
        createdAt: now,
        updatedAt: now,
        messageCount: 0
      },
      messages: [],
      agentActivitiesByMessageId: {}
    }
  } finally {
    database.close()
  }
}

export function getSessionDetail(workspacePath: string, sessionId: string): SessionDetail | null {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const session = getSessionSummaryById(database, sessionId)

    if (!session) {
      return null
    }

    const messages = database
      .prepare(
        `
          SELECT id, session_id, role, content, created_at
          FROM messages
          WHERE session_id = ?
          ORDER BY created_at ASC, id ASC
        `
      )
      .all(sessionId) as unknown as MessageRow[]

    const activityRows = database
      .prepare(
        `
          SELECT
            assistant_message_id,
            activity_id,
            kind,
            status,
            label,
            detail,
            created_at
          FROM message_agent_activities
          WHERE session_id = ?
          ORDER BY assistant_message_id ASC, item_order ASC, created_at ASC, activity_id ASC
        `
      )
      .all(sessionId) as unknown as AgentActivityRow[]
    const agentActivitiesByMessageId: Record<string, AgentActivityItem[]> = {}

    for (const row of activityRows) {
      agentActivitiesByMessageId[row.assistant_message_id] = [
        ...(agentActivitiesByMessageId[row.assistant_message_id] ?? []),
        mapAgentActivity(row)
      ]
    }

    return {
      session,
      messages: messages.map(mapMessageRecord),
      agentActivitiesByMessageId
    }
  } finally {
    database.close()
  }
}

export function persistUserMessageAndLoadContext(
  workspacePath: string,
  sessionId: string,
  content: string
): {
  session: SessionSummary
  userMessage: MessageRecord
  contextMessages: MessageRecord[]
} | null {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const existingSession = getSessionSummaryById(database, sessionId)

    if (!existingSession) {
      return null
    }

    const userMessageId = randomUUID()
    const now = new Date().toISOString()

    database.exec('BEGIN')

    try {
      database
        .prepare(
          `
            INSERT INTO messages (id, session_id, role, content, created_at)
            VALUES (?, ?, 'user', ?, ?)
          `
        )
        .run(userMessageId, sessionId, content, now)

      const nextTitle =
        existingSession.title === defaultSessionTitle && existingSession.messageCount === 0
          ? deriveSessionTitle(content)
          : existingSession.title

      database
        .prepare(
          `
            UPDATE sessions
            SET title = ?, updated_at = ?
            WHERE id = ?
          `
        )
        .run(nextTitle, now, sessionId)

      database.exec('COMMIT')
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }

    const session = getSessionSummaryById(database, sessionId)
    const contextRows = database
      .prepare(
        `
          SELECT id, session_id, role, content, created_at
          FROM (
            SELECT id, session_id, role, content, created_at
            FROM messages
            WHERE session_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 12
          )
          ORDER BY created_at ASC, id ASC
        `
      )
      .all(sessionId) as unknown as MessageRow[]

    return {
      session: session ?? {
        ...existingSession,
        title:
          existingSession.messageCount === 0 ? deriveSessionTitle(content) : existingSession.title,
        updatedAt: now,
        messageCount: existingSession.messageCount + 1
      },
      userMessage: {
        id: userMessageId,
        sessionId,
        role: 'user',
        content,
        createdAt: now
      },
      contextMessages: contextRows.map(mapMessageRecord)
    }
  } finally {
    database.close()
  }
}

export function persistAssistantMessage(
  workspacePath: string,
  sessionId: string,
  content: string
): {
  session: SessionSummary
  assistantMessage: MessageRecord
} | null {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const existingSession = getSessionSummaryById(database, sessionId)

    if (!existingSession) {
      return null
    }

    const assistantMessageId = randomUUID()
    const now = new Date().toISOString()

    database.exec('BEGIN')

    try {
      database
        .prepare(
          `
            INSERT INTO messages (id, session_id, role, content, created_at)
            VALUES (?, ?, 'assistant', ?, ?)
          `
        )
        .run(assistantMessageId, sessionId, content, now)

      database
        .prepare(
          `
            UPDATE sessions
            SET updated_at = ?
            WHERE id = ?
          `
        )
        .run(now, sessionId)

      database.exec('COMMIT')
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }

    const session = getSessionSummaryById(database, sessionId)

    return {
      session: session ?? {
        ...existingSession,
        updatedAt: now,
        messageCount: existingSession.messageCount + 1
      },
      assistantMessage: {
        id: assistantMessageId,
        sessionId,
        role: 'assistant',
        content,
        createdAt: now
      }
    }
  } finally {
    database.close()
  }
}

export function upsertMessageAgentActivities(
  workspacePath: string,
  assistantMessageId: string,
  activities: AgentActivityItem[]
): void {
  if (!activities.length) {
    return
  }

  const database = openWorkspaceDatabase(workspacePath)

  try {
    const messageRow = database
      .prepare(
        `
          SELECT session_id, role
          FROM messages
          WHERE id = ?
          LIMIT 1
        `
      )
      .get(assistantMessageId) as { session_id: string; role: MessageRecord['role'] } | undefined

    if (!messageRow || messageRow.role !== 'assistant') {
      return
    }

    const now = new Date().toISOString()
    const deleteExistingActivities = database.prepare(
      'DELETE FROM message_agent_activities WHERE assistant_message_id = ?'
    )
    const insertActivity = database.prepare(
      `
        INSERT INTO message_agent_activities (
          assistant_message_id,
          activity_id,
          session_id,
          kind,
          status,
          label,
          detail,
          created_at,
          item_order,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )

    database.exec('BEGIN')

    try {
      deleteExistingActivities.run(assistantMessageId)

      activities.forEach((activity, index) => {
        insertActivity.run(
          assistantMessageId,
          activity.id,
          messageRow.session_id,
          activity.kind,
          activity.status,
          activity.label,
          activity.detail ?? null,
          activity.createdAt,
          index,
          now
        )
      })

      database.exec('COMMIT')
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
  } finally {
    database.close()
  }
}
