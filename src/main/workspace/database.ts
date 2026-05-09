import { DatabaseSync } from 'node:sqlite'
import { getWorkspacePaths } from './paths'
import {
  isSqliteVectorAvailable,
  resolveSqliteVectorExtensionPath
} from './sqlite-vector-extension'

let sqliteVectorWarningLogged = false

/**
 * Opens the workspace SQLite database with foreign keys enabled and,
 * when available, the sqlite-vector extension loaded.
 *
 * When `embeddingDimension` is provided, `vector_init` is called on both
 * `memory_chunks` and `session_summaries` so that the connection is ready
 * for vector search. sqlite-vector requires `vector_init` on every
 * connection that performs vector operations.
 */
export function openWorkspaceDatabase(
  workspacePath: string,
  options?: { embeddingDimension?: number | null }
): DatabaseSync {
  const { databasePath } = getWorkspacePaths(workspacePath)
  const database = new DatabaseSync(databasePath, { allowExtension: true })

  try {
    if (isSqliteVectorAvailable()) {
      database.loadExtension(resolveSqliteVectorExtensionPath())
    } else if (!sqliteVectorWarningLogged) {
      sqliteVectorWarningLogged = true
      console.warn(
        'sqlite-vector extension is not available. ' +
          'Vector search will be disabled. Memory retrieval will return no results.'
      )
    }
  } catch (error) {
    if (!sqliteVectorWarningLogged) {
      sqliteVectorWarningLogged = true
      console.error('Failed to load sqlite-vector extension:', error)
    }
  }

  database.enableLoadExtension(false)
  database.exec('PRAGMA foreign_keys = ON;')

  if (options?.embeddingDimension && options.embeddingDimension > 0) {
    try {
      const dim = options.embeddingDimension
      database.exec(
        `SELECT vector_init('memory_chunks', 'embedding_vector', 'dimension=${dim},type=FLOAT32,distance=COSINE');`
      )
      database.exec(
        `SELECT vector_init('session_summaries', 'embedding_vector', 'dimension=${dim},type=FLOAT32,distance=COSINE');`
      )
    } catch (error) {
      console.warn('vector_init failed (extension may not be loaded):', error)
    }
  }

  return database
}
