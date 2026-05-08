import type {
  AppSettings,
  ChatProviderOption,
  EmbeddingProviderOption,
  ProviderOption
} from '@shared/app-settings'
import {
  BadgeCheck,
  Bot,
  ListChecks,
  FolderOpen,
  KeyRound,
  LoaderCircle,
  Lock,
  ScanSearch,
  Shield,
  Trash2,
  UserRound
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

type SetupCardProps<PROVIDER_ID extends string> = {
  title: string
  description: string
  providerLabel: string
  modelValue: string
  apiKeyValue: string
  apiKeyLabel: string
  apiKeyPlaceholder: string
  isSaving: boolean
  currentProvider: ProviderOption<PROVIDER_ID> | null
  providers: Array<ProviderOption<PROVIDER_ID>>
  onProviderChange: (providerId: PROVIDER_ID) => void
  onModelChange: (modelId: string) => void
  onApiKeyChange?: (value: string) => void
  saveLabel: string
  onSave?: () => Promise<void>
  showLiveSave?: boolean
  customBaseUrl?: string
  onCustomBaseUrlChange?: (value: string) => void
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

function SetupSummary({
  providerLabel,
  modelValue
}: {
  providerLabel: string
  modelValue: string
}): React.JSX.Element {
  return (
    <aside className="rounded-[1.4rem] border border-border/70 bg-[#edf4f1] p-5">
      <div className="flex items-center gap-2 text-primary">
        <KeyRound className="size-4" />
        <p className="text-sm font-semibold uppercase tracking-[0.18em]">Active setup</p>
      </div>

      <Separator className="my-4" />

      <div className="space-y-3 text-sm leading-7 text-foreground/82">
        <p>
          <span className="font-medium text-foreground">Provider:</span> {providerLabel}
        </p>
        <p>
          <span className="font-medium text-foreground">Model:</span> {modelValue}
        </p>
      </div>
    </aside>
  )
}

function SetupCard<PROVIDER_ID extends string>({
  title,
  description,
  providerLabel,
  modelValue,
  apiKeyValue,
  apiKeyLabel,
  apiKeyPlaceholder,
  isSaving,
  currentProvider,
  providers,
  onProviderChange,
  onModelChange,
  onApiKeyChange,
  saveLabel,
  onSave,
  showLiveSave = false,
  customBaseUrl,
  onCustomBaseUrlChange
}: SetupCardProps<PROVIDER_ID>): React.JSX.Element {
  return (
    <Card className="rounded-[2rem] border-border/70 bg-[#fffdf9] shadow-[0_12px_32px_rgba(55,78,75,0.06)]">
      <CardContent className="p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-[2rem] leading-none tracking-[-0.03em] text-foreground">
                {title}
              </h3>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="settings-field-label" htmlFor={`${title}-provider`}>
                  Provider
                </Label>
                <Select
                  value={currentProvider?.id ?? providers[0]?.id}
                  onValueChange={(value) => onProviderChange(value as PROVIDER_ID)}
                  disabled={!showLiveSave}
                >
                  <SelectTrigger id={`${title}-provider`} className="settings-input">
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
                <Label className="settings-field-label" htmlFor={`${title}-model`}>
                  Model id
                </Label>
                <Input
                  id={`${title}-model`}
                  value={modelValue}
                  onChange={(event) => onModelChange(event.target.value)}
                  className="settings-input"
                  disabled={!showLiveSave}
                  placeholder={currentProvider?.defaultModelId}
                />
              </div>
            </div>

            {showLiveSave && onCustomBaseUrlChange && typeof customBaseUrl === 'string' ? (
              <div className="space-y-2">
                <Label className="settings-field-label" htmlFor={`${title}-base-url`}>
                  Base URL
                </Label>
                <Input
                  id={`${title}-base-url`}
                  value={customBaseUrl}
                  onChange={(event) => onCustomBaseUrlChange(event.target.value)}
                  className="settings-input"
                  placeholder={currentProvider?.defaultBaseUrl}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="settings-field-label" htmlFor={`${title}-api-key`}>
                {apiKeyLabel}
              </Label>
              <Input
                id={`${title}-api-key`}
                type="password"
                value={apiKeyValue}
                onChange={
                  onApiKeyChange ? (event) => onApiKeyChange(event.target.value) : undefined
                }
                placeholder={apiKeyPlaceholder}
                className="settings-input"
                disabled={!showLiveSave}
              />
            </div>

            <div>
              <Button
                className="rounded-2xl px-6 text-base"
                onClick={showLiveSave ? () => void onSave?.() : undefined}
                disabled={!showLiveSave || isSaving}
              >
                {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {saveLabel}
              </Button>
            </div>
          </div>

          <SetupSummary providerLabel={providerLabel} modelValue={modelValue} />
        </div>
      </CardContent>
    </Card>
  )
}

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
  const activeChatProvider =
    chatProviders.find((provider) => provider.id === draft?.chat.providerId) ?? null
  const activeEmbeddingProvider =
    embeddingProviders.find((provider) => provider.id === draft?.embeddings.providerId) ?? null

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

          {isLoading || !draft || !activeChatProvider || !activeEmbeddingProvider ? (
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
                  title="AI Provider & Model Setup"
                />

                <SetupCard
                  title="Provider and model setup"
                  description="Choose the active provider, set the model id, and store the current provider key in app settings."
                  providerLabel={activeChatProvider.label}
                  modelValue={draft.chat.modelId}
                  apiKeyValue={draft.chat.apiKey}
                  apiKeyLabel={activeChatProvider.apiKeyLabel}
                  apiKeyPlaceholder={activeChatProvider.apiKeyPlaceholder}
                  isSaving={isSaving}
                  currentProvider={activeChatProvider}
                  providers={chatProviders}
                  onProviderChange={onChatProviderChange}
                  onModelChange={onChatModelChange}
                  onApiKeyChange={onChatApiKeyChange}
                  saveLabel="Save Configuration"
                  onSave={onSave}
                  showLiveSave
                  customBaseUrl={
                    activeChatProvider.supportsCustomBaseUrl ? draft.chat.baseUrl : undefined
                  }
                  onCustomBaseUrlChange={
                    activeChatProvider.supportsCustomBaseUrl ? onChatBaseUrlChange : undefined
                  }
                />
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
                          Display compact status updates for parsing, memory retrieval, generation,
                          and tool-like background work while a reply is being created.
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
                  icon={<ScanSearch className="size-5" />}
                  title="Vector Embedding Model Setup"
                />

                <SetupCard
                  title="Vector Embedding Model Setup"
                  description="Configure the separate embedding provider used for retrieval and memory write-back."
                  providerLabel={activeEmbeddingProvider.label}
                  modelValue={draft.embeddings.modelId}
                  apiKeyValue={draft.embeddings.apiKey}
                  apiKeyLabel={activeEmbeddingProvider.apiKeyLabel}
                  apiKeyPlaceholder={activeEmbeddingProvider.apiKeyPlaceholder}
                  isSaving={isSaving}
                  currentProvider={activeEmbeddingProvider}
                  providers={embeddingProviders}
                  onProviderChange={onEmbeddingProviderChange}
                  onModelChange={onEmbeddingModelChange}
                  onApiKeyChange={onEmbeddingApiKeyChange}
                  saveLabel="Save Configuration"
                  onSave={onSave}
                  showLiveSave
                  customBaseUrl={
                    activeEmbeddingProvider.supportsCustomBaseUrl
                      ? draft.embeddings.baseUrl
                      : undefined
                  }
                  onCustomBaseUrlChange={
                    activeEmbeddingProvider.supportsCustomBaseUrl
                      ? onEmbeddingBaseUrlChange
                      : undefined
                  }
                />
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
