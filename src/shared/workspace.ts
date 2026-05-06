export type StartupState = 'loading' | 'needs-selection' | 'bootstrapping' | 'ready' | 'error'

export interface WorkspaceSelectionResult {
  cancelled: boolean
  workspacePath?: string
}

export interface WorkspaceStatus {
  state: StartupState
  workspacePath?: string
  workspaceName?: string
  reason?: string
  detail?: string
  createdFiles?: string[]
  migrationApplied?: boolean
}

export interface InitializeWorkspaceRequest {
  workspacePath: string
}

export interface OpenWorkspaceRequest {
  workspacePath: string
}

export interface WorkspaceApi {
  getWorkspaceStatus: () => Promise<WorkspaceStatus>
  pickWorkspaceFolder: () => Promise<WorkspaceSelectionResult>
  initializeWorkspace: (request: InitializeWorkspaceRequest) => Promise<WorkspaceStatus>
  openWorkspace: (request: OpenWorkspaceRequest) => Promise<WorkspaceStatus>
}
