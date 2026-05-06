export const workspaceIpcService = {
  getStatus: () => window.api.getWorkspaceStatus(),
  pickFolder: () => window.api.pickWorkspaceFolder(),
  initialize: (workspacePath: string) => window.api.initializeWorkspace({ workspacePath }),
  open: (workspacePath: string) => window.api.openWorkspace({ workspacePath })
}
