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
        embedding_vector TEXT,
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
        embedding_vector TEXT,
        turn_count_snapshot INTEGER,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (source_message_id) REFERENCES messages(id) ON DELETE CASCADE
      ) STRICT;

      CREATE INDEX IF NOT EXISTS idx_session_summaries_updated_at
      ON session_summaries(updated_at DESC, session_id DESC);
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
