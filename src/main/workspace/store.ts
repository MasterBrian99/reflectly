import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

interface WorkspaceStoreState {
  workspacePath?: string
}

const storeFile = 'workspace-state.json'

function getStorePath(): string {
  return join(app.getPath('userData'), storeFile)
}

export async function readWorkspacePath(): Promise<string | undefined> {
  try {
    const state = JSON.parse(await readFile(getStorePath(), 'utf8')) as WorkspaceStoreState

    return state.workspacePath
  } catch {
    return undefined
  }
}

export async function writeWorkspacePath(workspacePath: string): Promise<void> {
  const storePath = getStorePath()

  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(storePath, JSON.stringify({ workspacePath }, null, 2), 'utf8')
}

export async function clearWorkspacePath(): Promise<void> {
  const storePath = getStorePath()

  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(storePath, JSON.stringify({}, null, 2), 'utf8')
}
