import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AppSettings } from '../../shared/app-settings'
import { defaultAppSettings, getProviderOption } from './catalog'

interface SettingsStoreState {
  appSettings?: Partial<AppSettings>
}

const storeFile = 'app-settings.json'

function getStorePath(): string {
  return join(app.getPath('userData'), storeFile)
}

function normalizeAppSettings(settings?: Partial<AppSettings>): AppSettings {
  const activeProviderId = settings?.activeProviderId ?? defaultAppSettings.activeProviderId
  const activeProvider = getProviderOption(activeProviderId)

  return {
    activeProviderId,
    modelId: settings?.modelId?.trim() || activeProvider.defaultModelId,
    customBaseUrl: settings?.customBaseUrl?.trim() || defaultAppSettings.customBaseUrl,
    providerApiKeys: {
      ...defaultAppSettings.providerApiKeys,
      ...settings?.providerApiKeys
    }
  }
}

export async function readAppSettings(): Promise<AppSettings> {
  try {
    const state = JSON.parse(await readFile(getStorePath(), 'utf8')) as SettingsStoreState
    return normalizeAppSettings(state.appSettings)
  } catch {
    return normalizeAppSettings()
  }
}

export async function writeAppSettings(settings: AppSettings): Promise<AppSettings> {
  const normalizedSettings = normalizeAppSettings(settings)
  const storePath = getStorePath()

  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(storePath, JSON.stringify({ appSettings: normalizedSettings }, null, 2), 'utf8')

  return normalizedSettings
}
