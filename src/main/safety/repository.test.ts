import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { openWorkspaceDatabase } from '../workspace/database'
import { insertSafetyEvent, listSafetyEventsForSession } from './repository'

async function createWorkspaceFixture(): Promise<{
  workspacePath: string
  cleanup: () => Promise<void>
}> {
  const workspacePath = await mkdtemp(join(tmpdir(), 'reflectly-safety-test-'))
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

    CREATE TABLE safety_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      source_message_id TEXT NOT NULL,
      assistant_message_id TEXT,
      risk_type TEXT NOT NULL CHECK(risk_type IN ('self_harm', 'suicidal_ideation', 'harm_to_others', 'abuse', 'acute_distress', 'other')),
      severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      evidence TEXT NOT NULL,
      action_taken TEXT NOT NULL CHECK(action_taken IN ('proceed', 'supportive_notice', 'crisis_interrupt')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (source_message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (assistant_message_id) REFERENCES messages(id) ON DELETE CASCADE
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
    ['message-user-a', 'user', 'I feel like hurting myself.'],
    ['message-assistant-a', 'assistant', 'Safety response.']
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

test('safety repository inserts and reads events linked to source and assistant messages', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const insertedEvent = insertSafetyEvent(fixture.workspacePath, {
    sessionId: 'session-a',
    sourceMessageId: 'message-user-a',
    assistantMessageId: 'message-assistant-a',
    riskType: 'self_harm',
    severity: 'medium',
    evidence: 'I feel like hurting myself.',
    actionTaken: 'crisis_interrupt'
  })
  const events = listSafetyEventsForSession(fixture.workspacePath, 'session-a')

  assert.equal(events.length, 1)
  assert.equal(events[0].id, insertedEvent.id)
  assert.equal(events[0].sourceMessageId, 'message-user-a')
  assert.equal(events[0].assistantMessageId, 'message-assistant-a')
  assert.equal(events[0].riskType, 'self_harm')
  assert.equal(events[0].actionTaken, 'crisis_interrupt')
})
