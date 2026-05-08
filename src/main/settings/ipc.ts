import { ipcMain } from 'electron'
import type { AppSettingsSnapshot, UpdateAppSettingsRequest } from '../../shared/app-settings'
import { chatProviderOptions, embeddingProviderOptions } from './catalog'
import { readAppSettings, writeAppSettings } from './store'

async function buildSnapshot(): Promise<AppSettingsSnapshot> {
  return {
    settings: await readAppSettings(),
    chatProviders: chatProviderOptions,
    embeddingProviders: embeddingProviderOptions
  }
}

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', async (): Promise<AppSettingsSnapshot> => {
    return buildSnapshot()
  })

  ipcMain.handle(
    'settings:update',
    async (_, request: UpdateAppSettingsRequest): Promise<AppSettingsSnapshot> => {
      const settings = await writeAppSettings(request.settings)

      return {
        settings,
        chatProviders: chatProviderOptions,
        embeddingProviders: embeddingProviderOptions
      }
    }
  )
}
