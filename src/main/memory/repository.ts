import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import { openWorkspaceDatabase } from '../workspace/database'

export type MemoryChunkKind = 'turn_summary'
export type RetrievalCandidateType = 'memory_chunk' | 'session_summary'

export interface PersistedSessionSummary {
  sessionId: string
  summaryText: string
  sourceMessageId: string
  turnCountSnapshot: number | null
  updatedAt: string
  embeddingProvider: string | null
  embeddingModel: string | null
  embeddingVector: number[] | null
}

export interface RetrievalCandidate {
  id: string
  candidateType: RetrievalCandidateType
  sessionId: string
  sessionTitle: string
  sourceMessageId: string
  chunkKind: MemoryChunkKind | 'session_summary'
  content: string
  embeddingProvider: string | null
  embeddingModel: string | null
  embeddingVector: number[] | null
  updatedAt: string
}

interface RetrievalCandidateRow {
  id: string
  candidate_type: RetrievalCandidateType
  session_id: string
  session_title: string
  source_message_id: string
  chunk_kind: MemoryChunkKind | 'session_summary'
  content: string
  embedding_provider: string | null
  embedding_model: string | null
  embedding_vector: string | null
  updated_at: string
}

interface SessionSummaryRow {
  session_id: string
  summary_text: string
  source_message_id: string
  turn_count_snapshot: number | null
  updated_at: string
  embedding_provider: string | null
  embedding_model: string | null
  embedding_vector: string | null
}

function serializeEmbeddingVector(vector?: number[] | null): string | null {
  return vector?.length ? JSON.stringify(vector) : null
}

function parseEmbeddingVector(raw: string | null): number[] | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown

    if (!Array.isArray(parsed)) {
      return null
    }

    const vector = parsed.filter((value): value is number => Number.isFinite(value))
    return vector.length === parsed.length && vector.length > 0 ? vector : null
  } catch {
    return null
  }
}

function mapSessionSummary(row: SessionSummaryRow): PersistedSessionSummary {
  return {
    sessionId: row.session_id,
    summaryText: row.summary_text,
    sourceMessageId: row.source_message_id,
    turnCountSnapshot: row.turn_count_snapshot === null ? null : Number(row.turn_count_snapshot),
    updatedAt: row.updated_at,
    embeddingProvider: row.embedding_provider,
    embeddingModel: row.embedding_model,
    embeddingVector: parseEmbeddingVector(row.embedding_vector)
  }
}

function mapRetrievalCandidate(row: RetrievalCandidateRow): RetrievalCandidate {
  return {
    id: row.id,
    candidateType: row.candidate_type,
    sessionId: row.session_id,
    sessionTitle: row.session_title,
    sourceMessageId: row.source_message_id,
    chunkKind: row.chunk_kind,
    content: row.content,
    embeddingProvider: row.embedding_provider,
    embeddingModel: row.embedding_model,
    embeddingVector: parseEmbeddingVector(row.embedding_vector),
    updatedAt: row.updated_at
  }
}

function readSessionSummary(
  database: DatabaseSync,
  sessionId: string
): PersistedSessionSummary | null {
  const row = database
    .prepare(
      `
        SELECT
          session_id,
          summary_text,
          source_message_id,
          turn_count_snapshot,
          updated_at,
          embedding_provider,
          embedding_model,
          embedding_vector
        FROM session_summaries
        WHERE session_id = ?
      `
    )
    .get(sessionId) as SessionSummaryRow | undefined

  return row ? mapSessionSummary(row) : null
}

export function getSessionSummary(
  workspacePath: string,
  sessionId: string
): PersistedSessionSummary | null {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    return readSessionSummary(database, sessionId)
  } finally {
    database.close()
  }
}

export function insertMemoryChunk(
  workspacePath: string,
  input: {
    sessionId: string
    sourceMessageId: string
    chunkKind: MemoryChunkKind
    content: string
    embeddingProvider?: string | null
    embeddingModel?: string | null
    embeddingVector?: number[] | null
  }
): RetrievalCandidate {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const id = randomUUID()
    const now = new Date().toISOString()

    database
      .prepare(
        `
          INSERT INTO memory_chunks (
            id,
            session_id,
            source_message_id,
            chunk_kind,
            content,
            embedding_provider,
            embedding_model,
            embedding_vector,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        id,
        input.sessionId,
        input.sourceMessageId,
        input.chunkKind,
        input.content,
        input.embeddingProvider ?? null,
        input.embeddingModel ?? null,
        serializeEmbeddingVector(input.embeddingVector),
        now,
        now
      )

    const row = database
      .prepare(
        `
          SELECT
            mc.id,
            'memory_chunk' AS candidate_type,
            mc.session_id,
            s.title AS session_title,
            mc.source_message_id,
            mc.chunk_kind,
            mc.content,
            mc.embedding_provider,
            mc.embedding_model,
            mc.embedding_vector,
            mc.updated_at
          FROM memory_chunks mc
          INNER JOIN sessions s ON s.id = mc.session_id
          WHERE mc.id = ?
        `
      )
      .get(id) as unknown as RetrievalCandidateRow

    return mapRetrievalCandidate(row)
  } finally {
    database.close()
  }
}

export function upsertSessionSummary(
  workspacePath: string,
  input: {
    sessionId: string
    summaryText: string
    sourceMessageId: string
    turnCountSnapshot: number
    embeddingProvider?: string | null
    embeddingModel?: string | null
    embeddingVector?: number[] | null
  }
): PersistedSessionSummary {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const now = new Date().toISOString()

    database
      .prepare(
        `
          INSERT INTO session_summaries (
            session_id,
            summary_text,
            source_message_id,
            embedding_provider,
            embedding_model,
            embedding_vector,
            turn_count_snapshot,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(session_id) DO UPDATE SET
            summary_text = excluded.summary_text,
            source_message_id = excluded.source_message_id,
            embedding_provider = excluded.embedding_provider,
            embedding_model = excluded.embedding_model,
            embedding_vector = excluded.embedding_vector,
            turn_count_snapshot = excluded.turn_count_snapshot,
            updated_at = excluded.updated_at
        `
      )
      .run(
        input.sessionId,
        input.summaryText,
        input.sourceMessageId,
        input.embeddingProvider ?? null,
        input.embeddingModel ?? null,
        serializeEmbeddingVector(input.embeddingVector),
        input.turnCountSnapshot,
        now
      )

    return (
      readSessionSummary(database, input.sessionId) ?? {
        sessionId: input.sessionId,
        summaryText: input.summaryText,
        sourceMessageId: input.sourceMessageId,
        turnCountSnapshot: input.turnCountSnapshot,
        updatedAt: now,
        embeddingProvider: input.embeddingProvider ?? null,
        embeddingModel: input.embeddingModel ?? null,
        embeddingVector: input.embeddingVector ?? null
      }
    )
  } finally {
    database.close()
  }
}

export function listRetrievalCandidates(workspacePath: string): RetrievalCandidate[] {
  const database = openWorkspaceDatabase(workspacePath)

  try {
    const rows = database
      .prepare(
        `
          SELECT
            mc.id,
            'memory_chunk' AS candidate_type,
            mc.session_id,
            s.title AS session_title,
            mc.source_message_id,
            mc.chunk_kind,
            mc.content,
            mc.embedding_provider,
            mc.embedding_model,
            mc.embedding_vector,
            mc.updated_at
          FROM memory_chunks mc
          INNER JOIN sessions s ON s.id = mc.session_id

          UNION ALL

          SELECT
            ss.session_id AS id,
            'session_summary' AS candidate_type,
            ss.session_id,
            s.title AS session_title,
            ss.source_message_id,
            'session_summary' AS chunk_kind,
            ss.summary_text AS content,
            ss.embedding_provider,
            ss.embedding_model,
            ss.embedding_vector,
            ss.updated_at
          FROM session_summaries ss
          INNER JOIN sessions s ON s.id = ss.session_id
        `
      )
      .all() as unknown as RetrievalCandidateRow[]

    return rows.map(mapRetrievalCandidate)
  } finally {
    database.close()
  }
}
