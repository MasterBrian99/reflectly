import { BotMessageSquare, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const highlights = [
  {
    title: 'AI-guided reflection',
    description: 'Support daily check-ins, pattern spotting, and structured journaling flows.'
  },
  {
    title: 'Clinical guardrails',
    description: 'Keep human review, escalation paths, and clear safety boundaries in the loop.'
  },
  {
    title: 'Private by default',
    description: 'Design the desktop experience around sensitive data, consent, and local trust.'
  }
]

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,_rgba(111,201,196,0.28),_transparent_28%),linear-gradient(180deg,_rgba(250,248,242,1)_0%,_rgba(238,245,244,1)_48%,_rgba(232,240,246,1)_100%)]">
      <div className="mx-auto flex min-h-svh max-w-6xl flex-col justify-center px-6 py-12 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/65 px-3 py-1 text-sm text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="size-4 text-primary" />
              shadcn/ui is now wired into the renderer
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary/80">
                Reflectly desktop
              </p>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Build the care experience on a real design system.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                The Electron renderer now has Tailwind v4, shadcn aliases, theme tokens, and
                reusable UI primitives ready for the therapeutic workflows you add next.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="lg">Open the first flow</Button>
              <Button size="lg" variant="outline" onClick={ipcHandle}>
                Ping desktop bridge
              </Button>
            </div>
          </section>

          <section className="rounded-4xl border border-white/70 bg-white/70 p-5 shadow-[0_24px_80px_rgba(65,94,110,0.16)] backdrop-blur xl:p-6">
            <div className="space-y-4 rounded-3xl bg-[linear-gradient(180deg,_rgba(243,249,248,0.95),_rgba(255,255,255,0.92))] p-5">
              {highlights.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      {index === 0 ? (
                        <BotMessageSquare className="size-5" />
                      ) : (
                        <ShieldCheck className="size-5" />
                      )}
                    </div>
                    <h2 className="text-base font-semibold">{item.title}</h2>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default App
