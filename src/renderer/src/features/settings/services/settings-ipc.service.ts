export const settingsIpcService = {
  get: () => window.api.getAppSettings(),
  update: (settings: Parameters<typeof window.api.updateAppSettings>[0]['settings']) =>
    window.api.updateAppSettings({ settings })
}
