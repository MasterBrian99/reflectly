import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  insertMemoryChunk,
  listRetrievalCandidates,
  getSessionSummary,
  upsertSessionSummary
} from './repository'
import { openWorkspaceDatabase } from '../workspace/database'

async function createWorkspaceFixture(): Promise<{
  workspacePath: string
  cleanup: () => Promise<void>
}> {
  const workspacePath = await mkdtemp(join(tmpdir(), 'reflectly-memory-test-'))
  const metaDirPath = join(workspacePath, '.reflectly')

  await mkdir(metaDirPath, { recursive: true })

  const database = openWorkspaceDatabase(workspacePath)

  database.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    ) STRICT;

    CREATE TABLE memory_chunks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      source_message_id TEXT NOT NULL,
      chunk_kind TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding_provider TEXT,
      embedding_model TEXT,
      embedding_vector TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (source_message_id) REFERENCES messages(id) ON DELETE CASCADE
    ) STRICT;

    CREATE TABLE session_summaries (
      session_id TEXT PRIMARY KEY,
      summary_text TEXT NOT NULL,
      source_message_id TEXT NOT NULL,
      embedding_provider TEXT,
      embedding_model TEXT,
      embedding_vector TEXT,
      turn_count_snapshot INTEGER,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (source_message_id) REFERENCES messages(id) ON DELETE CASCADE
    ) STRICT;
  `)

  const now = '2026-05-07T12:00:00.000Z'

  database
    .prepare(
      `
        INSERT INTO sessions (id, title, status, created_at, updated_at)
        VALUES (?, ?, 'active', ?, ?)
      `
    )
    .run('session-a', 'First session', now, now)

  database
    .prepare(
      `
        INSERT INTO messages (id, session_id, role, content, created_at)
        VALUES (?, ?, 'assistant', ?, ?)
      `
    )
    .run('message-a', 'session-a', 'Saved assistant reply', now)

  database.close()

  return {
    workspacePath,
    cleanup: () => rm(workspacePath, { recursive: true, force: true })
  }
}

test('memory repository persists chunks and rolling session summaries', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const insertedChunk = insertMemoryChunk(fixture.workspacePath, {
    sessionId: 'session-a',
    sourceMessageId: 'message-a',
    chunkKind: 'turn_summary',
    content: 'The user reflected on the day and asked for a calmer evening routine.',
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
    embeddingVector: [0.1, 0.2, 0.3]
  })

  const savedSummary = upsertSessionSummary(fixture.workspacePath, {
    sessionId: 'session-a',
    sourceMessageId: 'message-a',
    summaryText: 'The session focuses on stress recovery and steadier routines.',
    turnCountSnapshot: 1,
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
    embeddingVector: [0.3, 0.2, 0.1]
  })

  const candidates = listRetrievalCandidates(fixture.workspacePath)
  const currentSummary = getSessionSummary(fixture.workspacePath, 'session-a')

  assert.equal(insertedChunk.sessionId, 'session-a')
  assert.equal(savedSummary.turnCountSnapshot, 1)
  assert.equal(candidates.length, 2)
  assert.deepEqual(candidates.map((candidate) => candidate.candidateType).sort(), [
    'memory_chunk',
    'session_summary'
  ])
  assert.equal(
    currentSummary?.summaryText,
    'The session focuses on stress recovery and steadier routines.'
  )
  assert.deepEqual(currentSummary?.embeddingVector, [0.3, 0.2, 0.1])
})
