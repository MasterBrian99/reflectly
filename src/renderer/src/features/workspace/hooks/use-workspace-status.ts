import { useEffect, useState } from 'react'
import type { WorkspaceViewStatus } from '../workspace.types'
import { workspaceIpcService } from '../services/workspace-ipc.service'

const initialStatus: WorkspaceViewStatus = {
  state: 'loading'
}

export function useWorkspaceStatus(): {
  status: WorkspaceViewStatus
  chooseFolder: () => Promise<void>
  retry: () => Promise<void>
} {
  const [status, setStatus] = useState<WorkspaceViewStatus>(initialStatus)

  async function loadStatus(): Promise<void> {
    setStatus({ state: 'loading' })

    try {
      const nextStatus = await workspaceIpcService.getStatus()
      setStatus(nextStatus)
    } catch (error) {
      setStatus({
        state: 'error',
        reason: 'Unable to read startup status.',
        detail: error instanceof Error ? error.message : 'Unexpected startup error.'
      })
    }
  }

  async function chooseFolder(): Promise<void> {
    try {
      const selection = await workspaceIpcService.pickFolder()

      if (selection.cancelled || !selection.workspacePath) {
        return
      }

      setStatus({
        state: 'bootstrapping',
        workspacePath: selection.workspacePath,
        workspaceName: selection.workspacePath.split(/[\\/]/).pop()
      })

      const nextStatus = await workspaceIpcService.initialize(selection.workspacePath)
      setStatus(nextStatus)
    } catch (error) {
      setStatus({
        state: 'error',
        reason: 'Workspace initialization failed.',
        detail: error instanceof Error ? error.message : 'Unexpected initialization error.'
      })
    }
  }

  async function retry(): Promise<void> {
    if (status.workspacePath) {
      setStatus({
        state: 'bootstrapping',
        workspacePath: status.workspacePath,
        workspaceName: status.workspaceName
      })

      try {
        const nextStatus = await workspaceIpcService.open(status.workspacePath)
        setStatus(nextStatus)
        return
      } catch (error) {
        setStatus({
          state: 'error',
          workspacePath: status.workspacePath,
          workspaceName: status.workspaceName,
          reason: 'Retry failed.',
          detail: error instanceof Error ? error.message : 'Unexpected retry error.'
        })
        return
      }
    }

    await loadStatus()
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadStatus()
    })
  }, [])

  return {
    status,
    chooseFolder,
    retry
  }
}
