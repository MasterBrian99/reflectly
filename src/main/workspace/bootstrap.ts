import { app } from 'electron'
import { randomUUID } from 'node:crypto'
import { access, mkdir, stat, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { basename } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { WorkspaceStatus } from '../../shared/workspace'
import { getWorkspacePaths } from './paths'
import { clearWorkspacePath, writeWorkspacePath } from './store'

interface MigrationDefinition {
  name: string
  sql: string
}

interface WorkspaceConfig {
  schemaVersion: number
  appVersion: string
  createdAt: string
}

const migrations: MigrationDefinition[] = [
  {
    name: '0001_workspace_meta',
    sql: `
      CREATE TABLE IF NOT EXISTS workspace_meta (
        workspace_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        app_version TEXT NOT NULL,
        schema_version INTEGER NOT NULL
      ) STRICT;
    `
  },
  {
    name: '0002_sessions',
    sql: `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE INDEX IF NOT EXISTS idx_sessions_updated_at
      ON sessions(updated_at DESC, created_at DESC, id DESC);
    `
  },
  {
    name: '0003_messages',
    sql: `
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      ) STRICT;

      CREATE INDEX IF NOT EXISTS idx_messages_session_created_at
      ON messages(session_id, created_at ASC, id ASC);
    `
  },
  {
    name: '0004_memory_chunks',
    sql: `
      CREATE TABLE IF NOT EXISTS memory_chunks (
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

      CREATE INDEX IF NOT EXISTS idx_memory_chunks_session_updated_at
      ON memory_chunks(session_id, updated_at DESC, created_at DESC, id DESC);
    `
  },
  {
    name: '0005_session_summaries',
    sql: `
      CREATE TABLE IF NOT EXISTS session_summaries (
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

      CREATE INDEX IF NOT EXISTS idx_session_summaries_updated_at
      ON session_summaries(updated_at DESC, session_id DESC);
    `
  },
  {
    name: '0006_stage1_parse_outputs',
    sql: `
      CREATE TABLE IF NOT EXISTS stage1_parse_outputs (
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

      CREATE INDEX IF NOT EXISTS idx_stage1_parse_outputs_session_created_at
      ON stage1_parse_outputs(session_id, created_at DESC, message_id DESC);
    `
  },
  {
    name: '0007_clarification_requests',
    sql: `
      CREATE TABLE IF NOT EXISTS clarification_requests (
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

      CREATE INDEX IF NOT EXISTS idx_clarification_requests_session_status_created_at
      ON clarification_requests(session_id, status, created_at DESC, id DESC);
    `
  },
  {
    name: '0008_message_agent_activities',
    sql: `
      CREATE TABLE IF NOT EXISTS message_agent_activities (
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

      CREATE INDEX IF NOT EXISTS idx_message_agent_activities_session_message_order
      ON message_agent_activities(session_id, assistant_message_id, item_order ASC, activity_id ASC);
    `
  },
  {
    name: '0009_safety_events',
    sql: `
      CREATE TABLE IF NOT EXISTS safety_events (
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

      CREATE INDEX IF NOT EXISTS idx_safety_events_session_created_at
      ON safety_events(session_id, created_at DESC, id DESC);
    `
  }
]

async function validateWorkspaceFolder(workspacePath: string): Promise<void> {
  const folderStat = await stat(workspacePath)

  if (!folderStat.isDirectory()) {
    throw new Error('Selected path is not a folder.')
  }

  await access(workspacePath, constants.R_OK | constants.W_OK)
}

async function ensureWorkspaceConfig(configPath: string): Promise<boolean> {
  try {
    await access(configPath, constants.F_OK)
    return false
  } catch {
    const config: WorkspaceConfig = {
      schemaVersion: migrations.length,
      appVersion: app.getVersion(),
      createdAt: new Date().toISOString()
    }

    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8')
    return true
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

function ensureMigrationTable(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    ) STRICT;
  `)
}

function runMigrationsWithStatus(
  databasePath: string,
  databaseAlreadyExists: boolean
): {
  migrationApplied: boolean
  databaseCreated: boolean
} {
  let databaseOpened = false

  try {
    const database = new DatabaseSync(databasePath)
    databaseOpened = true

    try {
      ensureMigrationTable(database)

      const hasMigration = database.prepare(
        'SELECT 1 AS applied FROM schema_migrations WHERE migration_name = ? LIMIT 1'
      )
      const insertMigration = database.prepare(
        'INSERT INTO schema_migrations (migration_name, applied_at) VALUES (?, ?)'
      )

      let migrationApplied = false

      for (const migration of migrations) {
        const existingMigration = hasMigration.get(migration.name) as
          | { applied?: number }
          | undefined

        if (existingMigration) {
          continue
        }

        database.exec('BEGIN')

        try {
          database.exec(migration.sql)
          insertMigration.run(migration.name, new Date().toISOString())
          database.exec('COMMIT')
          migrationApplied = true
        } catch (error) {
          database.exec('ROLLBACK')
          throw error
        }
      }

      const selectWorkspaceMeta = database.prepare(
        'SELECT workspace_id FROM workspace_meta LIMIT 1'
      )
      const insertWorkspaceMeta = database.prepare(`
        INSERT INTO workspace_meta (
          workspace_id,
          created_at,
          updated_at,
          app_version,
          schema_version
        ) VALUES (?, ?, ?, ?, ?)
      `)
      const updateWorkspaceMeta = database.prepare(`
        UPDATE workspace_meta
        SET updated_at = ?, app_version = ?, schema_version = ?
      `)
      const now = new Date().toISOString()
      const workspaceMeta = selectWorkspaceMeta.get() as { workspace_id: string } | undefined

      if (!workspaceMeta) {
        insertWorkspaceMeta.run(randomUUID(), now, now, app.getVersion(), migrations.length)
        migrationApplied = true
      } else {
        updateWorkspaceMeta.run(now, app.getVersion(), migrations.length)
      }

      return { migrationApplied, databaseCreated: !databaseAlreadyExists }
    } finally {
      database.close()
    }
  } catch (error) {
    if (!databaseOpened) {
      throw new Error(`Unable to open the workspace database. ${(error as Error).message}`)
    }

    throw error
  }
}

function buildReadyStatus(
  workspacePath: string,
  options?: {
    createdFiles?: string[]
    migrationApplied?: boolean
  }
): WorkspaceStatus {
  return {
    state: 'ready',
    workspacePath,
    workspaceName: basename(workspacePath),
    createdFiles: options?.createdFiles,
    migrationApplied: options?.migrationApplied ?? false
  }
}

export async function initializeWorkspace(workspacePath: string): Promise<WorkspaceStatus> {
  await validateWorkspaceFolder(workspacePath)

  const { metaDirPath, configPath, databasePath } = getWorkspacePaths(workspacePath)
  const createdFiles: string[] = []
  const metaDirExisted = await pathExists(metaDirPath)
  const databaseExisted = await pathExists(databasePath)

  await mkdir(metaDirPath, { recursive: true })

  if (!metaDirExisted) {
    createdFiles.push(metaDirPath)
  }

  const configCreated = await ensureWorkspaceConfig(configPath)

  if (configCreated) {
    createdFiles.push(configPath)
  }

  const { migrationApplied, databaseCreated } = runMigrationsWithStatus(
    databasePath,
    databaseExisted
  )

  if (databaseCreated && (await pathExists(databasePath))) {
    createdFiles.push(databasePath)
  }

  await writeWorkspacePath(workspacePath)

  return buildReadyStatus(workspacePath, {
    createdFiles,
    migrationApplied
  })
}

export async function openWorkspace(workspacePath: string): Promise<WorkspaceStatus> {
  await validateWorkspaceFolder(workspacePath)

  const { metaDirPath, configPath, databasePath } = getWorkspacePaths(workspacePath)
  const databaseExisted = await pathExists(databasePath)

  await mkdir(metaDirPath, { recursive: true })

  const configCreated = await ensureWorkspaceConfig(configPath)
  const { migrationApplied, databaseCreated } = runMigrationsWithStatus(
    databasePath,
    databaseExisted
  )
  const createdFiles = configCreated ? [configPath] : []

  if (databaseCreated && (await pathExists(databasePath))) {
    createdFiles.push(databasePath)
  }

  await writeWorkspacePath(workspacePath)

  return buildReadyStatus(workspacePath, {
    createdFiles,
    migrationApplied
  })
}

export async function resolveWorkspaceStatus(
  rememberedWorkspacePath?: string
): Promise<WorkspaceStatus> {
  if (!rememberedWorkspacePath) {
    return {
      state: 'needs-selection',
      reason: 'No workspace selected yet.'
    }
  }

  try {
    return await openWorkspace(rememberedWorkspacePath)
  } catch (error) {
    await clearWorkspacePath()

    return {
      state: 'needs-selection',
      reason: 'Saved workspace is missing or unavailable.',
      detail: (error as Error).message
    }
  }
}
