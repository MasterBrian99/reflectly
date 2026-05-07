import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ipcRenderer } from 'electron'
import type { AppApi } from '../shared/api'
import type { ChatStreamEvent } from '../shared/session-chat'

const api: AppApi = {
  getWorkspaceStatus: () => ipcRenderer.invoke('workspace:get-status'),
  pickWorkspaceFolder: () => ipcRenderer.invoke('workspace:pick-folder'),
  initializeWorkspace: (request) => ipcRenderer.invoke('workspace:initialize', request),
  openWorkspace: (request) => ipcRenderer.invoke('workspace:open', request),
  listSessions: () => ipcRenderer.invoke('sessions:list'),
  createSession: () => ipcRenderer.invoke('sessions:create'),
  getSession: (request) => ipcRenderer.invoke('sessions:get', request),
  sendMessage: (request) => ipcRenderer.invoke('chat:send-message', request),
  onChatStreamEvent: (listener: (event: ChatStreamEvent) => void) => {
    const wrappedListener = (_event: unknown, payload: ChatStreamEvent): void => {
      listener(payload)
    }

    ipcRenderer.on('chat:stream-event', wrappedListener)

    return () => {
      ipcRenderer.removeListener('chat:stream-event', wrappedListener)
    }
  },
  getAppSettings: () => ipcRenderer.invoke('settings:get'),
  updateAppSettings: (request) => ipcRenderer.invoke('settings:update', request)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
