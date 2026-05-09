import type { OpenDialogOptions } from 'electron'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import type {
  InitializeWorkspaceRequest,
  OpenWorkspaceRequest,
  WorkspaceSelectionResult,
  WorkspaceStatus
} from '../../shared/workspace'
import { initializeWorkspace, openWorkspace, resolveWorkspaceStatus } from './bootstrap'
import { readWorkspacePath } from './store'

function getOwnerWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
}

export function registerWorkspaceIpc(): void {
  ipcMain.handle('workspace:get-status', async (): Promise<WorkspaceStatus> => {
    const rememberedWorkspacePath = await readWorkspacePath()

    return resolveWorkspaceStatus(rememberedWorkspacePath)
  })

  ipcMain.handle('workspace:pick-folder', async (): Promise<WorkspaceSelectionResult> => {
    const dialogOptions: OpenDialogOptions = {
      title: 'Choose a Reflectly workspace folder',
      properties: ['openDirectory', 'createDirectory']
    }
    const ownerWindow = getOwnerWindow()
    const result = ownerWindow
      ? await dialog.showOpenDialog(ownerWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (result.canceled || result.filePaths.length === 0) {
      return { cancelled: true }
    }

    return {
      cancelled: false,
      workspacePath: result.filePaths[0]
    }
  })

  ipcMain.handle(
    'workspace:initialize',
    async (_, request: InitializeWorkspaceRequest): Promise<WorkspaceStatus> => {
      return initializeWorkspace(request.workspacePath)
    }
  )

  ipcMain.handle(
    'workspace:open',
    async (_, request: OpenWorkspaceRequest): Promise<WorkspaceStatus> => {
      return openWorkspace(request.workspacePath)
    }
  )
}
