import { ElectronAPI } from '@electron-toolkit/preload'
import type { WorkspaceApi } from '../shared/workspace'

declare global {
  interface Window {
    electron: ElectronAPI
    api: WorkspaceApi
  }
}
