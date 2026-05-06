import type { WorkspaceViewStatus } from '../workspace.types'

type WorkspaceHomeScreenProps = {
  status: WorkspaceViewStatus
}

export function WorkspaceHomeScreen({ status }: WorkspaceHomeScreenProps): React.JSX.Element {
  return (
    <main className="app-page">
      <div className="app-page-inner app-page-inner-shell">
        <header className="flex items-center justify-between border-b border-border/80 pb-4">
          <div>
            <p className="app-kicker">Workspace</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-foreground">
              {status.workspaceName ?? 'Reflectly'}
            </h1>
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center">
          <div className="app-card w-full max-w-3xl text-center">
            <p className="app-kicker">Quiet shell placeholder</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-balance text-foreground">
              Your workspace is ready for reflective sessions.
            </h2>
            <p className="app-reading-copy mx-auto mt-4 max-w-xl">
              This page stays intentionally quiet for now. The next feature can add the session
              list, conversation surface, and memory tools without changing the overall visual
              language.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
