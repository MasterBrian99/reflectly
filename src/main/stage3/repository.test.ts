import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { openWorkspaceDatabase } from '../workspace/database'
import {
  attachAssistantMessageId,
  getStage3ReasoningOutput,
  upsertStage3ReasoningOutput
} from './repository'
import type { Stage3ReasoningOutput } from './types'

async function createWorkspaceFixture(): Promise<{
  workspacePath: string
  cleanup: () => Promise<void>
}> {
  const workspacePath = await mkdtemp(join(tmpdir(), 'reflectly-stage3-test-'))
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

    CREATE TABLE stage3_reasoning_outputs (
      message_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      assistant_message_id TEXT,
      schema_version INTEGER NOT NULL,
      support_mode TEXT NOT NULL CHECK(support_mode IN ('reflective', 'practical', 'psychoeducation', 'grounding', 'values', 'problem_solving', 'supportive')),
      depth_level TEXT NOT NULL CHECK(depth_level IN ('light', 'moderate', 'deep')),
      response_goal TEXT NOT NULL,
      emotional_hypothesis TEXT NOT NULL,
      memory_use TEXT NOT NULL,
      response_plan TEXT NOT NULL,
      safety_notes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (assistant_message_id) REFERENCES messages(id) ON DELETE SET NULL
    ) STRICT;
  `)

  const now = '2026-05-08T12:00:00.000Z'

  database
    .prepare(
      `INSERT INTO sessions (id, title, status, created_at, updated_at) VALUES (?, ?, 'active', ?, ?)`
    )
    .run('session-a', 'Test session', now, now)

  database
    .prepare(
      `INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, 'session-a', 'user', ?, ?)`
    )
    .run('message-user-a', 'I feel stuck.', now)

  database
    .prepare(
      `INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, 'session-a', 'assistant', ?, ?)`
    )
    .run('message-assistant-a', 'Let me help you explore that.', now)

  database.close()

  return {
    workspacePath,
    cleanup: () => rm(workspacePath, { recursive: true, force: true })
  }
}

function buildReasoningOutput(): Stage3ReasoningOutput {
  return {
    schemaVersion: 1,
    messageId: 'message-user-a',
    sessionId: 'session-a',
    supportMode: 'reflective',
    depthLevel: 'moderate',
    responseGoal: 'Help the user explore what feels stuck.',
    emotionalHypothesis: {
      summary: 'The user seems frustrated but open.',
      evidence: ['I feel stuck'],
      confidence: 0.72
    },
    memoryUse: {
      relevantMemoryIds: ['mem-1'],
      summary: 'Past session mentioned similar frustration.',
      caution: 'Do not assume the same context.'
    },
    responsePlan: {
      openingMove: 'Acknowledge the feeling of being stuck.',
      keyPoints: ['Reflect the frustration.', 'Gently ask what area feels most stuck.'],
      suggestedQuestion: 'What part feels most stuck?',
      avoid: ['Giving unsolicited advice.']
    },
    safetyNotes: {
      hasActiveRiskMarkers: false,
      notes: []
    }
  }
}

test('stage3 repository inserts and reads a reasoning output', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const output = buildReasoningOutput()

  upsertStage3ReasoningOutput(fixture.workspacePath, output)

  const loaded = getStage3ReasoningOutput(fixture.workspacePath, 'message-user-a')

  assert.ok(loaded)
  assert.equal(loaded.messageId, 'message-user-a')
  assert.equal(loaded.sessionId, 'session-a')
  assert.equal(loaded.supportMode, 'reflective')
  assert.equal(loaded.depthLevel, 'moderate')
  assert.equal(loaded.responseGoal, 'Help the user explore what feels stuck.')
  assert.equal(loaded.emotionalHypothesis.summary, 'The user seems frustrated but open.')
  assert.deepEqual(loaded.emotionalHypothesis.evidence, ['I feel stuck'])
  assert.equal(loaded.emotionalHypothesis.confidence, 0.72)
  assert.deepEqual(loaded.memoryUse.relevantMemoryIds, ['mem-1'])
  assert.equal(loaded.memoryUse.caution, 'Do not assume the same context.')
  assert.equal(loaded.responsePlan.openingMove, 'Acknowledge the feeling of being stuck.')
  assert.equal(loaded.responsePlan.keyPoints.length, 2)
  assert.equal(loaded.responsePlan.suggestedQuestion, 'What part feels most stuck?')
  assert.deepEqual(loaded.responsePlan.avoid, ['Giving unsolicited advice.'])
  assert.equal(loaded.safetyNotes.hasActiveRiskMarkers, false)
  assert.equal(loaded.assistantMessageId, null)
})

test('stage3 repository attaches assistant_message_id after generation', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const output = buildReasoningOutput()

  upsertStage3ReasoningOutput(fixture.workspacePath, output)
  attachAssistantMessageId(fixture.workspacePath, 'message-user-a', 'message-assistant-a')

  const loaded = getStage3ReasoningOutput(fixture.workspacePath, 'message-user-a')

  assert.ok(loaded)
  assert.equal(loaded.assistantMessageId, 'message-assistant-a')
})

test('stage3 repository upserts over existing output', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const output = buildReasoningOutput()

  upsertStage3ReasoningOutput(fixture.workspacePath, output)

  const updated = { ...output, supportMode: 'practical' as const, depthLevel: 'deep' as const }

  upsertStage3ReasoningOutput(fixture.workspacePath, updated)

  const loaded = getStage3ReasoningOutput(fixture.workspacePath, 'message-user-a')

  assert.ok(loaded)
  assert.equal(loaded.supportMode, 'practical')
  assert.equal(loaded.depthLevel, 'deep')
})

test('stage3 repository returns null for non-existent message', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const loaded = getStage3ReasoningOutput(fixture.workspacePath, 'non-existent')

  assert.equal(loaded, null)
})

test('stage3 repository inserts with assistant_message_id in single call', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const output = buildReasoningOutput()

  upsertStage3ReasoningOutput(fixture.workspacePath, output, 'message-assistant-a')

  const loaded = getStage3ReasoningOutput(fixture.workspacePath, 'message-user-a')

  assert.ok(loaded)
  assert.equal(loaded.assistantMessageId, 'message-assistant-a')
})
