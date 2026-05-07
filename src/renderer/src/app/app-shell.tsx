import { HashRouter, Route, Routes } from 'react-router-dom'
import { StartupGate } from './startup-gate'

export function AppShell(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={<StartupGate />} />
      </Routes>
    </HashRouter>
  )
}
