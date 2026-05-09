import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { openWorkspaceDatabase } from '../workspace/database'
import {
  countRecentClarificationLoops,
  getLatestPendingClarificationRequest,
  insertClarificationRequest,
  resolveLatestPendingClarificationRequest,
  upsertStage1ParseOutput
} from './repository'
import type { Stage1ParseOutput } from './types'

async function createWorkspaceFixture(): Promise<{
  workspacePath: string
  cleanup: () => Promise<void>
}> {
  const workspacePath = await mkdtemp(join(tmpdir(), 'reflectly-stage1-test-'))
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

    CREATE TABLE stage1_parse_outputs (
      message_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      schema_version INTEGER NOT NULL,
      summary TEXT NOT NULL,
      emotional_tone TEXT NOT NULL,
      intent TEXT NOT NULL,
      entities TEXT NOT NULL,
      goal_hints TEXT NOT NULL,
      context_gaps TEXT NOT NULL,
      risk_markers TEXT NOT NULL,
      should_clarify INTEGER NOT NULL CHECK(should_clarify IN (0, 1)),
      clarification TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    ) STRICT;

    CREATE TABLE clarification_requests (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      source_message_id TEXT NOT NULL,
      assistant_message_id TEXT,
      resolved_by_message_id TEXT,
      question_type TEXT NOT NULL CHECK(question_type IN ('open', 'choice', 'scale')),
      question_text TEXT NOT NULL,
      options TEXT,
      scale_anchors TEXT,
      gap_being_resolved TEXT NOT NULL,
      urgency TEXT NOT NULL CHECK(urgency IN ('low', 'medium', 'high')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'skipped')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (source_message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (assistant_message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (resolved_by_message_id) REFERENCES messages(id) ON DELETE CASCADE
    ) STRICT;
  `)

  const now = '2026-05-08T12:00:00.000Z'

  database
    .prepare(
      `
        INSERT INTO sessions (id, title, status, created_at, updated_at)
        VALUES (?, ?, 'active', ?, ?)
      `
    )
    .run('session-a', 'First session', now, now)

  for (const [id, role, content] of [
    ['message-user-a', 'user', 'I feel stuck.'],
    ['message-assistant-a', 'assistant', 'Would it help more to talk this through?'],
    ['message-user-b', 'user', 'Talk it through.']
  ]) {
    database
      .prepare(
        `
          INSERT INTO messages (id, session_id, role, content, created_at)
          VALUES (?, 'session-a', ?, ?, ?)
        `
      )
      .run(id, role, content, now)
  }

  database.close()

  return {
    workspacePath,
    cleanup: () => rm(workspacePath, { recursive: true, force: true })
  }
}

function buildParseOutput(): Stage1ParseOutput {
  return {
    schemaVersion: 1,
    messageId: 'message-user-a',
    sessionId: 'session-a',
    summary: 'The user feels stuck.',
    emotionalTone: {
      primary: 'stuck',
      secondary: [],
      valence: -0.2,
      arousal: 0.3,
      confidence: 0.7
    },
    intent: {
      expressed: 'The user feels stuck.',
      inferred: 'They may want reflection.',
      category: 'reflect',
      confidence: 0.7
    },
    entities: [],
    goalHints: [],
    contextGaps: [
      {
        id: 'preferred-help',
        description: 'The preferred kind of support.',
        whyItMatters: 'The next response depends on it.',
        score: 0.82,
        questionType: 'choice',
        options: ['Talk it through', 'Find one next step']
      }
    ],
    riskMarkers: [],
    shouldClarify: true,
    clarification: {
      questionType: 'choice',
      questionText: 'Would it help more to talk this through, or find one concrete next step?',
      options: ['Talk it through', 'Find one next step'],
      gapBeingResolved: 'preferred-help',
      urgency: 'medium'
    }
  }
}

test('stage1 repository persists output and resolves latest pending clarification', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const parseOutput = buildParseOutput()

  upsertStage1ParseOutput(fixture.workspacePath, parseOutput)
  const request = insertClarificationRequest(fixture.workspacePath, {
    sessionId: 'session-a',
    sourceMessageId: 'message-user-a',
    assistantMessageId: 'message-assistant-a',
    clarification: parseOutput.clarification!
  })
  const resolved = resolveLatestPendingClarificationRequest(
    fixture.workspacePath,
    'session-a',
    'message-user-b'
  )

  assert.equal(request.status, 'pending')
  assert.equal(resolved?.id, request.id)
  assert.equal(resolved?.status, 'resolved')
  assert.equal(resolved?.resolvedByMessageId, 'message-user-b')
  assert.equal(countRecentClarificationLoops(fixture.workspacePath, 'session-a'), 1)
})

test('stage1 repository loads the latest pending clarification request', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const parseOutput = buildParseOutput()

  const olderRequest = insertClarificationRequest(fixture.workspacePath, {
    sessionId: 'session-a',
    sourceMessageId: 'message-user-a',
    assistantMessageId: 'message-assistant-a',
    clarification: {
      ...parseOutput.clarification!,
      questionText: 'Older clarification?'
    }
  })
  const newerRequest = insertClarificationRequest(fixture.workspacePath, {
    sessionId: 'session-a',
    sourceMessageId: 'message-user-a',
    assistantMessageId: 'message-assistant-a',
    clarification: {
      ...parseOutput.clarification!,
      questionText: 'Newer clarification?'
    }
  })
  const latestRequest = getLatestPendingClarificationRequest(fixture.workspacePath, 'session-a')

  assert.notEqual(olderRequest.id, newerRequest.id)
  assert.equal(latestRequest?.id, newerRequest.id)
  assert.equal(latestRequest?.questionText, 'Newer clarification?')
})
