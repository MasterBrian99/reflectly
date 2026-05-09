import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import { openWorkspaceDatabase } from '../workspace/database'
import { serializeFloat32Vector, deserializeFloat32Vector } from './vector-utils'

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
  embeddingDimension: number | null
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
  updatedAt: string
}

export interface VectorSearchResult {
  id: string
  candidateType: RetrievalCandidateType
  sessionId: string
  sessionTitle: string
  sourceMessageId: string
  chunkKind: MemoryChunkKind | 'session_summary'
  content: string
  embeddingProvider: string | null
  embeddingModel: string | null
  updatedAt: string
  distance: number
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
  updated_at: string
}

interface VectorSearchRow extends RetrievalCandidateRow {
  distance: number
}

interface SessionSummaryRow {
  session_id: string
  summary_text: string
  source_message_id: string
  turn_count_snapshot: number | null
  updated_at: string
  embedding_provider: string | null
  embedding_model: string | null
  embedding_dimension: number | null
  embedding_vector: Uint8Array | null
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
    embeddingDimension: row.embedding_dimension === null ? null : Number(row.embedding_dimension),
    embeddingVector: deserializeFloat32Vector(row.embedding_vector ?? null)
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
    updatedAt: row.updated_at
  }
}

function mapVectorSearchResult(row: VectorSearchRow): VectorSearchResult {
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
    updatedAt: row.updated_at,
    distance: row.distance
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
          embedding_dimension,
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
    const vectorBlob = serializeFloat32Vector(input.embeddingVector)
    const dimension = input.embeddingVector?.length ?? null

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
            embedding_dimension,
            embedding_vector,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        dimension,
        vectorBlob,
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
    const vectorBlob = serializeFloat32Vector(input.embeddingVector)
    const dimension = input.embeddingVector?.length ?? null

    database
      .prepare(
        `
          INSERT INTO session_summaries (
            session_id,
            summary_text,
            source_message_id,
            embedding_provider,
            embedding_model,
            embedding_dimension,
            embedding_vector,
            turn_count_snapshot,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(session_id) DO UPDATE SET
            summary_text = excluded.summary_text,
            source_message_id = excluded.source_message_id,
            embedding_provider = excluded.embedding_provider,
            embedding_model = excluded.embedding_model,
            embedding_dimension = excluded.embedding_dimension,
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
        dimension,
        vectorBlob,
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
        embeddingDimension: dimension,
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

/**
 * Performs nearest-neighbor vector search using sqlite-vector's
 * `vector_full_scan` function. Searches both memory chunks and session
 * summaries, excluding the active session's summary.
 *
 * Requires the sqlite-vector extension to be loaded.
 */
export function searchMemoryByVector(
  workspacePath: string,
  input: {
    activeSessionId: string
    queryVector: number[]
    limit: number
    embeddingDimension: number
  }
): VectorSearchResult[] {
  const database = openWorkspaceDatabase(workspacePath, {
    embeddingDimension: input.embeddingDimension
  })

  try {
    const queryBlob = serializeFloat32Vector(input.queryVector)

    if (!queryBlob) {
      return []
    }

    // Use streaming mode (no k argument) with LIMIT to avoid Node DatabaseSync
    // binding JS numbers as REAL, which vector_full_scan rejects for the k param.
    const perTableLimit = input.limit * 2

    const chunkRows = database
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
            mc.updated_at,
            v.distance
          FROM vector_full_scan('memory_chunks', 'embedding_vector', ?) AS v
          JOIN memory_chunks AS mc ON mc.rowid = v.rowid
          INNER JOIN sessions s ON s.id = mc.session_id
          WHERE mc.embedding_vector IS NOT NULL
          ORDER BY v.distance ASC
          LIMIT ${perTableLimit}
        `
      )
      .all(queryBlob) as unknown as VectorSearchRow[]

    const summaryRows = database
      .prepare(
        `
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
            ss.updated_at,
            v.distance
          FROM vector_full_scan('session_summaries', 'embedding_vector', ?) AS v
          JOIN session_summaries AS ss ON ss.rowid = v.rowid
          INNER JOIN sessions s ON s.id = ss.session_id
          WHERE ss.embedding_vector IS NOT NULL
            AND ss.session_id != ?
          ORDER BY v.distance ASC
          LIMIT ${perTableLimit}
        `
      )
      .all(queryBlob, input.activeSessionId) as unknown as VectorSearchRow[]

    const merged = [...chunkRows, ...summaryRows]
      .map(mapVectorSearchResult)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, input.limit)

    return merged
  } finally {
    database.close()
  }
}
