import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { openWorkspaceDatabase } from '../workspace/database'
import {
  beginSessionClosing,
  closeSession,
  createSession,
  getLatestMessageForSession,
  getSessionDetail,
  listSessions,
  persistAssistantMessage,
  persistUserMessageAndLoadContext,
  setSessionIntention,
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
      phase TEXT NOT NULL DEFAULT 'working' CHECK(phase IN ('opening', 'working', 'closing', 'completed')),
      intention TEXT,
      closing_standout TEXT,
      closing_carry_forward TEXT,
      closing_mood INTEGER CHECK(closing_mood BETWEEN 1 AND 5),
      completed_at TEXT,
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

  database.close()

  return {
    workspacePath,
    cleanup: () => rm(workspacePath, { recursive: true, force: true })
  }
}

test('createSession starts in opening phase and listSessions includes phase', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const createdSession = createSession(fixture.workspacePath)
  const sessions = listSessions(fixture.workspacePath)

  assert.equal(createdSession.session.phase, 'opening')
  assert.equal(createdSession.session.intention, undefined)
  assert.equal(sessions[0]?.id, createdSession.session.id)
  assert.equal(sessions[0]?.phase, 'opening')
})

test('setSessionIntention stores trimmed intention and moves to working phase', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const createdSession = createSession(fixture.workspacePath)
  const updatedSession = setSessionIntention(
    fixture.workspacePath,
    createdSession.session.id,
    '  Make sense of my week.  '
  )

  assert.equal(updatedSession?.session.phase, 'working')
  assert.equal(updatedSession?.session.intention, 'Make sense of my week.')
})

test('setSessionIntention with empty text moves to working without intention', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const createdSession = createSession(fixture.workspacePath)
  const updatedSession = setSessionIntention(fixture.workspacePath, createdSession.session.id, '')

  assert.equal(updatedSession?.session.phase, 'working')
  assert.equal(updatedSession?.session.intention, undefined)
})

test('beginSessionClosing moves a working session to closing phase', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const createdSession = createSession(fixture.workspacePath)
  setSessionIntention(fixture.workspacePath, createdSession.session.id, '')

  const updatedSession = beginSessionClosing(fixture.workspacePath, createdSession.session.id)

  assert.equal(updatedSession?.session.phase, 'closing')
})

test('closeSession stores closing responses and completes the session', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const createdSession = createSession(fixture.workspacePath)
  const userState = persistUserMessageAndLoadContext(
    fixture.workspacePath,
    createdSession.session.id,
    'I want to remember this.'
  )

  assert.ok(userState)

  const latestMessage = getLatestMessageForSession(fixture.workspacePath, createdSession.session.id)
  const updatedSession = closeSession(fixture.workspacePath, createdSession.session.id, {
    standout: 'I named the hard part.',
    carryForward: 'Pause before reacting.',
    mood: 4
  })

  assert.equal(latestMessage?.id, userState.userMessage.id)
  assert.equal(updatedSession?.session.phase, 'completed')
  assert.equal(updatedSession?.session.closingStandout, 'I named the hard part.')
  assert.equal(updatedSession?.session.closingCarryForward, 'Pause before reacting.')
  assert.equal(updatedSession?.session.closingMood, 4)
  assert.ok(updatedSession?.session.completedAt)
})

test('closeSession with empty responses still completes the session', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const createdSession = createSession(fixture.workspacePath)
  const updatedSession = closeSession(fixture.workspacePath, createdSession.session.id, {})

  assert.equal(updatedSession?.session.phase, 'completed')
  assert.equal(updatedSession?.session.closingStandout, undefined)
  assert.equal(updatedSession?.session.closingCarryForward, undefined)
  assert.equal(updatedSession?.session.closingMood, undefined)
  assert.ok(updatedSession?.session.completedAt)
})

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

test('session repository loads safety metadata by assistant message id', async (t) => {
  const fixture = await createWorkspaceFixture()
  t.after(async () => fixture.cleanup())

  const createdSession = createSession(fixture.workspacePath)
  const userState = persistUserMessageAndLoadContext(
    fixture.workspacePath,
    createdSession.session.id,
    'I feel like hurting myself.'
  )

  assert.ok(userState)

  const assistantState = persistAssistantMessage(
    fixture.workspacePath,
    createdSession.session.id,
    'Safety response.'
  )

  assert.ok(assistantState)

  const database = openWorkspaceDatabase(fixture.workspacePath)

  database
    .prepare(
      `
        INSERT INTO safety_events (
          id,
          session_id,
          source_message_id,
          assistant_message_id,
          risk_type,
          severity,
          evidence,
          action_taken,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      'safety-event-a',
      createdSession.session.id,
      userState.userMessage.id,
      assistantState.assistantMessage.id,
      'self_harm',
      'medium',
      'I feel like hurting myself.',
      'crisis_interrupt',
      '2026-05-08T12:00:00.000Z'
    )
  database.close()

  const loadedSession = getSessionDetail(fixture.workspacePath, createdSession.session.id)
  const safetyMetadata = loadedSession?.safetyByMessageId?.[assistantState.assistantMessage.id]

  assert.deepEqual(safetyMetadata, {
    riskType: 'self_harm',
    severity: 'medium',
    actionTaken: 'crisis_interrupt'
  })
})
