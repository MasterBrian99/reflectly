import { join } from 'node:path'

export const workspaceMetaDir = '.reflectly'
export const configFileName = 'config.json'
export const databaseFileName = 'reflectly.db'

export function getWorkspacePaths(workspacePath: string): {
  metaDirPath: string
  configPath: string
  databasePath: string
} {
  const metaDirPath = join(workspacePath, workspaceMetaDir)

  return {
    metaDirPath,
    configPath: join(metaDirPath, configFileName),
    databasePath: join(metaDirPath, databaseFileName)
  }
}
