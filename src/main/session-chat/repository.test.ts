import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { openWorkspaceDatabase } from '../workspace/database'
import {
  createSession,
  getSessionDetail,
  persistAssistantMessage,
  persistUserMessageAndLoadContext,
  upsertMessageAgentActivities
} from './repository'

async function createWorkspaceFixture(): Promise<{
  workspacePath: string
  cleanup: () => Promise<void>
}> {
  const workspacePath = await mkdtemp(join(tmpdir(), 'reflectly-session-chat-test-'))
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

    CREATE TABLE message_agent_activities (
      assistant_message_id TEXT NOT NULL,
      activity_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('stage', 'reasoning', 'retrieval', 'tool')),
      status TEXT NOT NULL CHECK(status IN ('running', 'complete', 'skipped', 'error')),
      label TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL,
      item_order INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (assistant_message_id, activity_id),
      FOREIGN KEY (assistant_message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    ) STRICT;
  `)

  database.close()

  return {
    workspacePath,
    cleanup: () => rm(workspacePath, { recursive: true, force: true })
  }
}

test('session repository persists agent activities with assistant messages', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const createdSession = createSession(fixture.workspacePath)
  const userState = persistUserMessageAndLoadContext(
    fixture.workspacePath,
    createdSession.session.id,
    'I need a clearer evening routine.'
  )

  assert.ok(userState)

  const assistantState = persistAssistantMessage(
    fixture.workspacePath,
    createdSession.session.id,
    'Let us make the evening feel more manageable.'
  )

  assert.ok(assistantState)

  upsertMessageAgentActivities(fixture.workspacePath, assistantState.assistantMessage.id, [
    {
      id: 'stage1-parse',
      kind: 'reasoning',
      status: 'complete',
      label: 'Parsed the message',
      detail: 'Enough context is available to continue.',
      createdAt: '2026-05-08T12:00:00.000Z'
    },
    {
      id: 'assistant-generation',
      kind: 'stage',
      status: 'complete',
      label: 'Generated response',
      createdAt: '2026-05-08T12:00:01.000Z'
    }
  ])

  const loadedSession = getSessionDetail(fixture.workspacePath, createdSession.session.id)
  const activities =
    loadedSession?.agentActivitiesByMessageId[assistantState.assistantMessage.id] ?? []

  assert.equal(activities.length, 2)
  assert.equal(activities[0].id, 'stage1-parse')
  assert.equal(activities[0].detail, 'Enough context is available to continue.')
  assert.equal(activities[1].id, 'assistant-generation')
  assert.equal(activities[1].detail, undefined)
})
