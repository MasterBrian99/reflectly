import type {
  AppSettings,
  ChatProviderOption,
  EmbeddingProviderOption,
  ProviderOption
} from '@shared/app-settings'
import {
  BadgeCheck,
  Bot,
  Brain,
  FolderOpen,
  KeyRound,
  ListChecks,
  LoaderCircle,
  Lock,
  ScanSearch,
  Settings2,
  Shield,
  Trash2,
  UserRound,
  Zap
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

type SettingsScreenProps = {
  chatProviders: ChatProviderOption[]
  embeddingProviders: EmbeddingProviderOption[]
  draft: AppSettings | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  onChatProviderChange: (providerId: ChatProviderOption['id']) => void
  onChatModelChange: (modelId: string) => void
  onChatApiKeyChange: (value: string) => void
  onChatBaseUrlChange: (value: string) => void
  onStage1ProviderChange: (providerId: ChatProviderOption['id']) => void
  onStage1ModelChange: (modelId: string) => void
  onStage1ApiKeyChange: (value: string) => void
  onStage1BaseUrlChange: (value: string) => void
  onStage3ProviderChange: (providerId: ChatProviderOption['id']) => void
  onStage3ModelChange: (modelId: string) => void
  onStage3ApiKeyChange: (value: string) => void
  onStage3BaseUrlChange: (value: string) => void
  onEmbeddingProviderChange: (providerId: EmbeddingProviderOption['id']) => void
  onEmbeddingModelChange: (modelId: string) => void
  onEmbeddingApiKeyChange: (value: string) => void
  onEmbeddingBaseUrlChange: (value: string) => void
  onAgentActivityShowInChatChange: (value: boolean) => void
  onAgentActivityShowModelReasoningChange: (value: boolean) => void
  onAgentActivityReasoningEffortChange: (
    value: AppSettings['agentActivity']['reasoningEffort']
  ) => void
  onAgentActivityReasoningSummaryChange: (
    value: AppSettings['agentActivity']['reasoningSummary']
  ) => void
  onSave: () => Promise<void>
}

function SectionHeading({
  icon,
  title
}: {
  icon: React.ReactNode
  title: string
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 text-foreground">
      <div className="text-primary">{icon}</div>
      <h2 className="text-[2rem] leading-none tracking-[-0.03em]">{title}</h2>
    </div>
  )
}

// --- Stage Provider Dialog ---

type StageDialogProps<PROVIDER_ID extends string> = {
  stageLabel: string
  stageDescription: string
  settings: { providerId: PROVIDER_ID; modelId: string; apiKey: string; baseUrl?: string }
  providers: Array<ProviderOption<PROVIDER_ID>>
  isSaving: boolean
  onProviderChange: (providerId: PROVIDER_ID) => void
  onModelChange: (modelId: string) => void
  onApiKeyChange: (value: string) => void
  onBaseUrlChange: (value: string) => void
  onSave: () => Promise<void>
}

function StageConfigDialog<PROVIDER_ID extends string>({
  stageLabel,
  stageDescription,
  settings,
  providers,
  isSaving,
  onProviderChange,
  onModelChange,
  onApiKeyChange,
  onBaseUrlChange,
  onSave
}: StageDialogProps<PROVIDER_ID>): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const currentProvider =
    providers.find((p) => p.id === settings.providerId) ?? providers[0] ?? null

  async function handleSave(): Promise<void> {
    await onSave()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-2xl border-border/70 px-4 text-sm hover:bg-[#edf4f1]"
        >
          <Settings2 className="mr-1.5 size-3.5" />
          Configure
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl tracking-[-0.02em]">{stageLabel}</DialogTitle>
          <DialogDescription>{stageDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor={`${stageLabel}-provider`}>
              Provider
            </Label>
            <Select
              value={settings.providerId}
              onValueChange={(value) => onProviderChange(value as PROVIDER_ID)}
            >
              <SelectTrigger id={`${stageLabel}-provider`} className="settings-input">
                <SelectValue placeholder="Choose provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor={`${stageLabel}-model`}>
              Model id
            </Label>
            <Input
              id={`${stageLabel}-model`}
              value={settings.modelId}
              onChange={(e) => onModelChange(e.target.value)}
              className="settings-input"
              placeholder={currentProvider?.defaultModelId}
            />
          </div>

          {currentProvider?.supportsCustomBaseUrl ? (
            <div className="space-y-2">
              <Label className="settings-field-label" htmlFor={`${stageLabel}-base-url`}>
                Base URL
              </Label>
              <Input
                id={`${stageLabel}-base-url`}
                value={settings.baseUrl ?? ''}
                onChange={(e) => onBaseUrlChange(e.target.value)}
                className="settings-input"
                placeholder={currentProvider.defaultBaseUrl}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label className="settings-field-label" htmlFor={`${stageLabel}-api-key`}>
              {currentProvider?.apiKeyLabel ?? 'API key'}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground/70">
                (optional)
              </span>
            </Label>
            <Input
              id={`${stageLabel}-api-key`}
              type="password"
              value={settings.apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder={currentProvider?.apiKeyPlaceholder ?? 'API key'}
              className="settings-input"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            className="rounded-2xl px-6 text-base"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Stage Card ---

type StageCardProps<PROVIDER_ID extends string> = {
  icon: React.ReactNode
  label: string
  description: string
  stageTag: string
  settings: { providerId: PROVIDER_ID; modelId: string; apiKey: string; baseUrl?: string }
  providers: Array<ProviderOption<PROVIDER_ID>>
  isSaving: boolean
  onProviderChange: (providerId: PROVIDER_ID) => void
  onModelChange: (modelId: string) => void
  onApiKeyChange: (value: string) => void
  onBaseUrlChange: (value: string) => void
  onSave: () => Promise<void>
}

function StageCard<PROVIDER_ID extends string>({
  icon,
  label,
  description,
  stageTag,
  settings,
  providers,
  isSaving,
  onProviderChange,
  onModelChange,
  onApiKeyChange,
  onBaseUrlChange,
  onSave
}: StageCardProps<PROVIDER_ID>): React.JSX.Element {
  const currentProvider =
    providers.find((p) => p.id === settings.providerId) ?? providers[0] ?? null

  return (
    <Card className="rounded-[1.75rem] border-border/70 bg-[#fffdf9] shadow-[0_8px_24px_rgba(55,78,75,0.05)] transition-shadow hover:shadow-[0_12px_32px_rgba(55,78,75,0.08)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#d9efe8] text-primary">
              {icon}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold leading-tight tracking-[-0.02em] text-foreground">
                  {label}
                </h3>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-primary">
                  {stageTag}
                </span>
              </div>
              <p className="text-sm leading-5 text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 space-y-1 text-sm">
            <div className="flex items-center gap-1.5 text-foreground/80">
              <KeyRound className="size-3 text-primary/60" />
              <span className="truncate font-medium">{currentProvider?.label ?? 'Unknown'}</span>
            </div>
            <p className="truncate text-muted-foreground">{settings.modelId}</p>
          </div>

          <StageConfigDialog
            stageLabel={label}
            stageDescription={description}
            settings={settings}
            providers={providers}
            isSaving={isSaving}
            onProviderChange={onProviderChange}
            onModelChange={onModelChange}
            onApiKeyChange={onApiKeyChange}
            onBaseUrlChange={onBaseUrlChange}
            onSave={onSave}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// --- Settings Screen ---

export function SettingsScreen({
  chatProviders,
  embeddingProviders,
  draft,
  isLoading,
  isSaving,
  error,
  onChatProviderChange,
  onChatModelChange,
  onChatApiKeyChange,
  onChatBaseUrlChange,
  onStage1ProviderChange,
  onStage1ModelChange,
  onStage1ApiKeyChange,
  onStage1BaseUrlChange,
  onStage3ProviderChange,
  onStage3ModelChange,
  onStage3ApiKeyChange,
  onStage3BaseUrlChange,
  onEmbeddingProviderChange,
  onEmbeddingModelChange,
  onEmbeddingApiKeyChange,
  onEmbeddingBaseUrlChange,
  onAgentActivityShowInChatChange,
  onAgentActivityShowModelReasoningChange,
  onAgentActivityReasoningEffortChange,
  onAgentActivityReasoningSummaryChange,
  onSave
}: SettingsScreenProps): React.JSX.Element {
  const [displayName, setDisplayName] = useState('Julian Thorne')

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <ScrollArea className="h-full min-h-0">
        <div className="mx-auto flex w-full max-w-[70rem] flex-col gap-8 pb-12">
          <div className="space-y-5">
            <p className="app-kicker">Settings</p>
            <div className="space-y-3">
              <h1 className="text-[3rem] leading-none tracking-[-0.05em] text-foreground">
                Workspace Settings
              </h1>
              <p className="max-w-4xl text-lg leading-8 text-muted-foreground">
                Manage your personal reflection environment and privacy preferences. Your data stays
                on your device.
              </p>
            </div>
          </div>

          {error ? (
            <div className="rounded-[1.25rem] border border-destructive/20 bg-destructive/8 px-5 py-4 text-sm leading-6 text-destructive">
              {error}
            </div>
          ) : null}

          {isLoading || !draft ? (
            <div className="flex min-h-48 items-center justify-center rounded-[2rem] border border-border/70 bg-[#fffdf9] text-muted-foreground">
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              Loading settings
            </div>
          ) : (
            <>
              <section className="space-y-4">
                <SectionHeading icon={<UserRound className="size-5" />} title="Profile" />

                <Card className="rounded-[2rem] border-border/70 bg-[#fffdf9] shadow-[0_12px_32px_rgba(55,78,75,0.06)]">
                  <CardContent className="space-y-6 p-6 md:p-8">
                    <div className="space-y-2">
                      <Label className="settings-field-label" htmlFor="display-name">
                        Display Name
                      </Label>
                      <Input
                        id="display-name"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        className="settings-input"
                      />
                    </div>

                    <div>
                      <Button className="rounded-2xl px-6 text-base">Update Profile</Button>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section className="space-y-4">
                <SectionHeading
                  icon={<Bot className="size-5" />}
                  title="AI Pipeline Configuration"
                />

                <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                  Each stage of the processing pipeline can use a different provider and model.
                  Configure them independently to balance cost, speed, and quality.
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <StageCard
                    icon={<Zap className="size-5" />}
                    label="Stage 1: Parser"
                    description="Extracts tone, intent, and risk markers from user messages."
                    stageTag="Parse"
                    settings={draft.stage1}
                    providers={chatProviders}
                    isSaving={isSaving}
                    onProviderChange={onStage1ProviderChange}
                    onModelChange={onStage1ModelChange}
                    onApiKeyChange={onStage1ApiKeyChange}
                    onBaseUrlChange={onStage1BaseUrlChange}
                    onSave={onSave}
                  />

                  <StageCard
                    icon={<Brain className="size-5" />}
                    label="Stage 3: Reasoning"
                    description="Decides the response strategy before generation."
                    stageTag="Reason"
                    settings={draft.stage3}
                    providers={chatProviders}
                    isSaving={isSaving}
                    onProviderChange={onStage3ProviderChange}
                    onModelChange={onStage3ModelChange}
                    onApiKeyChange={onStage3ApiKeyChange}
                    onBaseUrlChange={onStage3BaseUrlChange}
                    onSave={onSave}
                  />

                  <StageCard
                    icon={<Bot className="size-5" />}
                    label="Stage 5: Chat"
                    description="Streams the final assistant reply to the user."
                    stageTag="Generate"
                    settings={draft.chat}
                    providers={chatProviders}
                    isSaving={isSaving}
                    onProviderChange={onChatProviderChange}
                    onModelChange={onChatModelChange}
                    onApiKeyChange={onChatApiKeyChange}
                    onBaseUrlChange={onChatBaseUrlChange}
                    onSave={onSave}
                  />

                  <StageCard
                    icon={<ScanSearch className="size-5" />}
                    label="Embeddings"
                    description="Vector embedding model for memory retrieval."
                    stageTag="Embed"
                    settings={draft.embeddings}
                    providers={embeddingProviders}
                    isSaving={isSaving}
                    onProviderChange={onEmbeddingProviderChange}
                    onModelChange={onEmbeddingModelChange}
                    onApiKeyChange={onEmbeddingApiKeyChange}
                    onBaseUrlChange={onEmbeddingBaseUrlChange}
                    onSave={onSave}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <SectionHeading icon={<ListChecks className="size-5" />} title="Agent Activity" />

                <Card className="rounded-[2rem] border-border/70 bg-[#fffdf9] shadow-[0_12px_32px_rgba(55,78,75,0.06)]">
                  <CardContent className="space-y-6 p-6 md:p-8">
                    <div className="flex items-center justify-between gap-6">
                      <div className="space-y-2">
                        <h3 className="text-2xl leading-none tracking-[-0.03em] text-foreground">
                          Show activity in chat
                        </h3>
                        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                          Display compact status updates for parsing, reasoning, memory retrieval,
                          generation, and tool-like background work while a reply is being created.
                        </p>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={draft.agentActivity.showInChat}
                        className="settings-switch"
                        onClick={() =>
                          onAgentActivityShowInChatChange(!draft.agentActivity.showInChat)
                        }
                      >
                        <span
                          className={
                            draft.agentActivity.showInChat
                              ? 'settings-switch-thumb settings-switch-thumb-active'
                              : 'settings-switch-thumb'
                          }
                        />
                      </button>
                    </div>

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem_14rem]">
                      <div className="flex items-center justify-between gap-6 rounded-[1.35rem] bg-[#edf4f1] px-5 py-4">
                        <div>
                          <p className="text-lg leading-none text-foreground">
                            Request model reasoning summaries
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Uses AI SDK provider options where supported. Some models return no
                            reasoning even when this is enabled.
                          </p>
                        </div>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={draft.agentActivity.showModelReasoning}
                          className="settings-switch"
                          onClick={() =>
                            onAgentActivityShowModelReasoningChange(
                              !draft.agentActivity.showModelReasoning
                            )
                          }
                        >
                          <span
                            className={
                              draft.agentActivity.showModelReasoning
                                ? 'settings-switch-thumb settings-switch-thumb-active'
                                : 'settings-switch-thumb'
                            }
                          />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <Label className="settings-field-label" htmlFor="reasoning-effort">
                          Reasoning effort
                        </Label>
                        <Select
                          value={draft.agentActivity.reasoningEffort}
                          onValueChange={(value) =>
                            onAgentActivityReasoningEffortChange(
                              value as AppSettings['agentActivity']['reasoningEffort']
                            )
                          }
                        >
                          <SelectTrigger id="reasoning-effort" className="settings-input">
                            <SelectValue placeholder="Choose effort" />
                          </SelectTrigger>
                          <SelectContent>
                            {['minimal', 'low', 'medium', 'high', 'xhigh'].map((effort) => (
                              <SelectItem key={effort} value={effort}>
                                {effort}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="settings-field-label" htmlFor="reasoning-summary">
                          Summary detail
                        </Label>
                        <Select
                          value={draft.agentActivity.reasoningSummary}
                          onValueChange={(value) =>
                            onAgentActivityReasoningSummaryChange(
                              value as AppSettings['agentActivity']['reasoningSummary']
                            )
                          }
                        >
                          <SelectTrigger id="reasoning-summary" className="settings-input">
                            <SelectValue placeholder="Choose summary" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">auto</SelectItem>
                            <SelectItem value="detailed">detailed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Button
                        className="rounded-2xl px-6 text-base"
                        onClick={() => void onSave()}
                        disabled={isSaving}
                      >
                        {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
                        Save Activity Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section className="space-y-4">
                <SectionHeading
                  icon={<Lock className="size-5" />}
                  title="Privacy & Local Storage"
                />

                <Card className="rounded-[2rem] border-border/70 bg-[#fffdf9] shadow-[0_12px_32px_rgba(55,78,75,0.06)]">
                  <CardContent className="space-y-4 p-6 md:p-8">
                    <div className="flex items-start justify-between gap-4 rounded-[1.5rem] bg-[#fffdfa]">
                      <div className="flex items-start gap-4">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-[#d9efe8] text-primary">
                          <FolderOpen className="size-5" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl leading-none tracking-[-0.02em] text-foreground">
                            Local-First Storage
                          </h3>
                          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                            Your sessions are encrypted and stored directly on your machine.
                          </p>
                          <Button variant="outline" className="rounded-2xl px-5">
                            <FolderOpen className="size-4" />
                            Pick a folder
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-sm text-success">
                        <Shield className="size-4" />
                        Active
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between rounded-[1.35rem] bg-[#edf4f1] px-5 py-4">
                      <div className="flex items-center gap-3">
                        <BadgeCheck className="size-5 text-primary" />
                        <div>
                          <p className="text-lg leading-none text-foreground">Cloud Sync</p>
                          <p className="mt-2 text-sm uppercase tracking-[0.16em] text-primary/70">
                            WIP
                          </p>
                        </div>
                      </div>

                      <div className="flex h-7 w-12 items-center rounded-full bg-white/90 px-1 shadow-inner">
                        <div className="size-5 rounded-full bg-border/80" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-[1.35rem] border border-destructive/20 bg-destructive/4 px-5 py-4 text-destructive">
                      <div className="flex items-center gap-3">
                        <Trash2 className="size-5" />
                        <p className="text-lg leading-none">Clear All Sessions</p>
                      </div>

                      <Button
                        variant="outline"
                        className="rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/8"
                      >
                        Wipe Folder
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <div className="flex flex-col items-center gap-4 pt-4 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#edf4f1] px-5 py-2 text-sm text-foreground/75">
                  <Shield className="size-4 text-primary" />
                  Your workspace is private and safe.
                </div>
                <p className="text-sm text-muted-foreground">
                  Version 1.2.4-Alpha • Last synced 12m ago
                </p>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
