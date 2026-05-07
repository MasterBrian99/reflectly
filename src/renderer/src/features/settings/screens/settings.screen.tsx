import type { AppSettings, ChatProviderOption } from '@shared/app-settings'
import {
  BadgeCheck,
  Bot,
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
  providers: ChatProviderOption[]
  draft: AppSettings | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  onProviderChange: (providerId: ChatProviderOption['id']) => void
  onModelChange: (modelId: string) => void
  onApiKeyChange: (value: string) => void
  onCustomBaseUrlChange: (value: string) => void
  onSave: () => Promise<void>
}

type SetupCardProps = {
  title: string
  description: string
  providerLabel: string
  modelValue: string
  apiKeyValue: string
  apiKeyLabel: string
  apiKeyPlaceholder: string
  isSaving: boolean
  currentProvider: ChatProviderOption | null
  providers: ChatProviderOption[]
  onProviderChange: (providerId: ChatProviderOption['id']) => void
  onModelChange: (modelId: string) => void
  onApiKeyChange?: (value: string) => void
  modelPresets?: Array<{ id: string; label: string }>
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

function SetupCard({
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
  modelPresets,
  saveLabel,
  onSave,
  showLiveSave = false,
  customBaseUrl,
  onCustomBaseUrlChange
}: SetupCardProps): React.JSX.Element {
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
                  onValueChange={(value) => onProviderChange(value as ChatProviderOption['id'])}
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
                {showLiveSave && modelPresets?.length ? (
                  <Select value={modelValue} onValueChange={onModelChange}>
                    <SelectTrigger id={`${title}-model`} className="settings-input">
                      <SelectValue placeholder="Choose model" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelPresets.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`${title}-model`}
                    value={modelValue}
                    onChange={(event) => onModelChange(event.target.value)}
                    className="settings-input"
                    disabled={!showLiveSave}
                  />
                )}
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
  providers,
  draft,
  isLoading,
  isSaving,
  error,
  onProviderChange,
  onModelChange,
  onApiKeyChange,
  onCustomBaseUrlChange,
  onSave
}: SettingsScreenProps): React.JSX.Element {
  const [displayName, setDisplayName] = useState('Julian Thorne')
  const embeddingProviderOption: ChatProviderOption = {
    id: 'openai',
    label: 'OpenAI',
    description: '',
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'Enter API key...',
    supportsCustomBaseUrl: false,
    defaultModelId: 'text-embedding-3-small',
    modelPresets: [{ id: 'text-embedding-3-small', label: 'text-embedding-3-small' }]
  }
  const activeProvider =
    providers.find((provider) => provider.id === draft?.activeProviderId) ?? null
  const currentApiKey = draft ? (draft.providerApiKeys[draft.activeProviderId] ?? '') : ''
  const embeddingProviderLabel = 'OpenAI'
  const embeddingModelId = 'text-embedding-3-small'

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

          {isLoading || !draft || !activeProvider ? (
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
                  providerLabel={activeProvider.label}
                  modelValue={draft.modelId}
                  apiKeyValue={currentApiKey}
                  apiKeyLabel={activeProvider.apiKeyLabel}
                  apiKeyPlaceholder={activeProvider.apiKeyPlaceholder}
                  isSaving={isSaving}
                  currentProvider={activeProvider}
                  providers={providers}
                  onProviderChange={onProviderChange}
                  onModelChange={onModelChange}
                  onApiKeyChange={onApiKeyChange}
                  modelPresets={activeProvider.modelPresets}
                  saveLabel="Save Configuration"
                  onSave={onSave}
                  showLiveSave
                  customBaseUrl={
                    activeProvider.supportsCustomBaseUrl ? draft.customBaseUrl : undefined
                  }
                  onCustomBaseUrlChange={
                    activeProvider.supportsCustomBaseUrl ? onCustomBaseUrlChange : undefined
                  }
                />
              </section>

              <section className="space-y-4">
                <SectionHeading
                  icon={<ScanSearch className="size-5" />}
                  title="Vector Embedding Model Setup"
                />

                <SetupCard
                  title="Vector Embedding Model Setup"
                  description="Configure the model used for semantic search and local memory organization."
                  providerLabel={embeddingProviderLabel}
                  modelValue={embeddingModelId}
                  apiKeyValue=""
                  apiKeyLabel="API Key"
                  apiKeyPlaceholder="Enter API key..."
                  isSaving={false}
                  currentProvider={embeddingProviderOption}
                  providers={[embeddingProviderOption]}
                  onProviderChange={() => undefined}
                  onModelChange={() => undefined}
                  saveLabel="Save Configuration"
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
