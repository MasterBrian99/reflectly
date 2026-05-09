import { Navigate, Route, Routes } from 'react-router-dom'
import { WorkspaceChatRoute } from '@/features/workspace/screens/workspace-chat.route'
import { WorkspaceHomeScreen } from '@/features/workspace/screens/workspace-home.screen'
import { WorkspaceSettingsRoute } from '@/features/workspace/screens/workspace-settings.route'
import { WorkspacePickerScreen } from '@/features/workspace/screens/workspace-picker.screen'
import { useWorkspaceStatus } from '@/features/workspace/hooks/use-workspace-status'

export function StartupGate(): React.JSX.Element {
  const workspace = useWorkspaceStatus()

  if (workspace.status.state === 'ready') {
    return (
      <Routes>
        <Route element={<WorkspaceHomeScreen status={workspace.status} />}>
          <Route index element={<Navigate to="chat" replace />} />
          <Route path="chat" element={<WorkspaceChatRoute />} />
          <Route path="settings" element={<WorkspaceSettingsRoute />} />
          <Route path="*" element={<Navigate to="chat" replace />} />
        </Route>
      </Routes>
    )
  }

  return (
    <WorkspacePickerScreen
      status={workspace.status}
      onChooseFolder={workspace.chooseFolder}
      onRetry={workspace.retry}
    />
  )
}
