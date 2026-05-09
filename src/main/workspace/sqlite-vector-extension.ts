import { existsSync } from 'node:fs'
import { join } from 'node:path'

const PLATFORM_BINARY: Record<string, string> = {
  'linux-x64': 'linux/x86_64/vector.so',
  'linux-arm64': 'linux/aarch64/vector.so',
  'darwin-x64': 'macos/x86_64/vector.dylib',
  'darwin-arm64': 'macos/aarch64/vector.dylib',
  'win32-x64': 'windows/x86_64/vector.dll'
}

function platformKey(): string {
  return `${process.platform}-${process.arch}`
}

function resolveResourcesDir(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron')

    if (app.isPackaged) {
      return join(process.resourcesPath, 'sqlite-vector')
    }

    return join(app.getAppPath(), 'resources', 'sqlite-vector')
  } catch {
    // Fallback for non-Electron environments (tests, scripts)
    return join(process.cwd(), 'resources', 'sqlite-vector')
  }
}

export function resolveSqliteVectorExtensionPath(): string {
  const relativePath = PLATFORM_BINARY[platformKey()]

  if (!relativePath) {
    throw new Error(
      `sqlite-vector: unsupported platform "${platformKey()}". ` +
        `Supported platforms: ${Object.keys(PLATFORM_BINARY).join(', ')}.`
    )
  }

  const extensionPath = join(resolveResourcesDir(), relativePath)

  if (!existsSync(extensionPath)) {
    throw new Error(
      `sqlite-vector: extension binary not found at "${extensionPath}". ` +
        'Download the correct binary from https://github.com/sqliteai/sqlite-vector/releases ' +
        'and place it under resources/sqlite-vector/<platform>/<arch>/.'
    )
  }

  return extensionPath
}

export function isSqliteVectorAvailable(): boolean {
  try {
    resolveSqliteVectorExtensionPath()
    return true
  } catch {
    return false
  }
}
