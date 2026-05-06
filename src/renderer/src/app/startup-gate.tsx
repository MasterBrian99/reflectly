import { WorkspaceHomeScreen } from '@/features/workspace/screens/workspace-home.screen'
import { WorkspacePickerScreen } from '@/features/workspace/screens/workspace-picker.screen'
import { useWorkspaceStatus } from '@/features/workspace/hooks/use-workspace-status'

export function StartupGate(): React.JSX.Element {
  const workspace = useWorkspaceStatus()

  if (workspace.status.state === 'ready') {
    return <WorkspaceHomeScreen status={workspace.status} />
  }

  return (
    <WorkspacePickerScreen
      status={workspace.status}
      onChooseFolder={workspace.chooseFolder}
      onRetry={workspace.retry}
    />
  )
}
