import { DatabaseSync } from 'node:sqlite'
import { getWorkspacePaths } from './paths'

export function openWorkspaceDatabase(workspacePath: string): DatabaseSync {
  const database = new DatabaseSync(getWorkspacePaths(workspacePath).databasePath)
  database.exec('PRAGMA foreign_keys = ON;')
  return database
}
