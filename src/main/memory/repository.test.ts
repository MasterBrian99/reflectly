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
      embedding_dimension INTEGER,
      embedding_vector BLOB,
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
      embedding_dimension INTEGER,
      embedding_vector BLOB,
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

test('memory repository persists chunks and rolling session summaries with BLOB vectors', async (t) => {
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
  assert.deepEqual(currentSummary?.embeddingDimension, 3)
})

test('memory repository stores BLOB vectors with correct byte length', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const vector = [0.1, 0.2, 0.3, 0.4, 0.5]

  insertMemoryChunk(fixture.workspacePath, {
    sessionId: 'session-a',
    sourceMessageId: 'message-a',
    chunkKind: 'turn_summary',
    content: 'Test BLOB vector storage.',
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
    embeddingVector: vector
  })

  // Read raw row to verify BLOB storage
  const database = openWorkspaceDatabase(fixture.workspacePath)

  try {
    const row = database
      .prepare('SELECT embedding_vector, embedding_dimension FROM memory_chunks LIMIT 1')
      .get() as { embedding_vector: Uint8Array | null; embedding_dimension: number | null }

    assert.ok(row.embedding_vector instanceof Uint8Array, 'embedding_vector should be a Uint8Array')
    assert.equal(row.embedding_vector.byteLength, vector.length * 4)
    assert.equal(row.embedding_dimension, vector.length)
  } finally {
    database.close()
  }
})

test('memory repository handles null embedding vectors gracefully', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const insertedChunk = insertMemoryChunk(fixture.workspacePath, {
    sessionId: 'session-a',
    sourceMessageId: 'message-a',
    chunkKind: 'turn_summary',
    content: 'Text-only memory without embeddings.'
  })

  assert.equal(insertedChunk.sessionId, 'session-a')

  const currentSummary = upsertSessionSummary(fixture.workspacePath, {
    sessionId: 'session-a',
    sourceMessageId: 'message-a',
    summaryText: 'Text-only session summary.',
    turnCountSnapshot: 1
  })

  assert.equal(currentSummary.embeddingDimension, null)
  assert.equal(currentSummary.embeddingVector, null)
})

test('memory repository persists carry-forward chunks', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const insertedChunk = insertMemoryChunk(fixture.workspacePath, {
    sessionId: 'session-a',
    sourceMessageId: 'message-a',
    chunkKind: 'carry_forward',
    content: 'Pause before reacting next time.'
  })

  assert.equal(insertedChunk.chunkKind, 'carry_forward')
  assert.equal(insertedChunk.content, 'Pause before reacting next time.')
})

test('session summary round-trips BLOB embedding vectors correctly', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const originalVector = [1.0, -0.5, 0.0, 3.14, -2.718]

  upsertSessionSummary(fixture.workspacePath, {
    sessionId: 'session-a',
    sourceMessageId: 'message-a',
    summaryText: 'Vector round-trip test.',
    turnCountSnapshot: 1,
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
    embeddingVector: originalVector
  })

  const summary = getSessionSummary(fixture.workspacePath, 'session-a')

  assert.ok(summary !== null)
  assert.ok(summary!.embeddingVector !== null)
  assert.equal(summary!.embeddingVector!.length, originalVector.length)

  for (let i = 0; i < originalVector.length; i += 1) {
    assert.ok(
      Math.abs(summary!.embeddingVector![i] - originalVector[i]) < 1e-6,
      `Element ${i}: expected ~${originalVector[i]}, got ${summary!.embeddingVector![i]}`
    )
  }
})
