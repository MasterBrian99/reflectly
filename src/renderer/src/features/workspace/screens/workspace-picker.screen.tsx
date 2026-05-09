import { AlertCircle, FolderOpen, LoaderCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WorkspaceViewStatus } from '../workspace.types'

type WorkspacePickerScreenProps = {
  status: WorkspaceViewStatus
  onChooseFolder: () => Promise<void>
  onRetry: () => Promise<void>
}

export function WorkspacePickerScreen({
  status,
  onChooseFolder,
  onRetry
}: WorkspacePickerScreenProps): React.JSX.Element {
  const isBusy = status.state === 'loading' || status.state === 'bootstrapping'
  const isError = status.state === 'error'
  const showRetry = isError || Boolean(status.workspacePath)

  return (
    <main className="app-page">
      <div className="app-page-inner app-page-inner-centered">
        <section className="app-panel">
          <div className="mx-auto max-w-2xl space-y-8">
            <div className="space-y-4">
              <div className="app-badge">
                <span className="size-2 rounded-full bg-primary/70" />
                Private workspace setup
              </div>

              <div className="space-y-3">
                <p className="app-kicker">Reflectly</p>
                <h1 className="app-title max-w-2xl">
                  Choose a folder for your calm, private reflection space.
                </h1>
                <p className="app-copy max-w-2xl">
                  Reflectly keeps your workspace on your own device. Select a folder once, and the
                  app will prepare it, remember it, and quietly reopen it when you come back.
                </p>
              </div>
            </div>

            <div className="app-card">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {isBusy ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : isError ? (
                    <AlertCircle className="size-5" />
                  ) : (
                    <FolderOpen className="size-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="space-y-1">
                    <h2 className="app-section-title">
                      {status.state === 'loading'
                        ? 'Checking your saved workspace'
                        : status.state === 'bootstrapping'
                          ? 'Preparing your workspace'
                          : status.state === 'error'
                            ? 'Workspace setup needs attention'
                            : 'Choose a folder to continue'}
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {status.state === 'loading'
                        ? 'Reflectly is checking whether a previously selected workspace is ready to open.'
                        : status.state === 'bootstrapping'
                          ? 'Creating the local app files and running the startup migration before entering the app.'
                          : (status.reason ??
                            'No workspace has been selected yet. Your files stay in the folder you choose.')}
                    </p>
                  </div>

                  {status.workspacePath ? (
                    <div className="rounded-xl border border-border/70 bg-surface-muted/80 px-3 py-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Selected path:</span>{' '}
                      <span className="break-all">{status.workspacePath}</span>
                    </div>
                  ) : null}

                  {status.detail ? (
                    <p className="text-sm leading-6 text-destructive">{status.detail}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button size="lg" onClick={() => void onChooseFolder()} disabled={isBusy}>
                      <FolderOpen className="size-4" />
                      Choose workspace folder
                    </Button>

                    {showRetry ? (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => void onRetry()}
                        disabled={isBusy}
                      >
                        <RefreshCcw className="size-4" />
                        Retry
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
              <article className="app-soft-card">
                Creates a hidden Reflectly folder for config and database files.
              </article>
              <article className="app-soft-card">
                Runs the local SQLite migration before the workspace opens.
              </article>
              <article className="app-soft-card">
                Keeps everything on-device and remembers the folder for next time.
              </article>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
