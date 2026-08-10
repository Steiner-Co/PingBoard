import { join } from 'node:path'
import { PUBLIC_RATE_LIMIT_PER_MINUTE } from '@pingboard/shared'

/**
 * Open-core boundary. `selfhost` is the default and is unlimited forever — no
 * caps, no plan checks. `cloud` is where the hosted arm activates plan
 * enforcement (see lib/limits.ts). Anything other than the exact string
 * 'cloud' resolves to selfhost, so a typo or empty value can never silently
 * start enforcing limits on someone's own instance.
 */
export type Mode = 'selfhost' | 'cloud'

export interface Config {
  mode: Mode
  port: number
  dataDir: string
  dbPath: string
  baseUrl: string | null
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  publicStaticDir: string | null
  migrationsDir: string | null
  /** Trust X-Forwarded-For for client IPs (enable only behind a known proxy). */
  trustProxy: boolean
  publicRateLimitPerMinute: number
}

export function loadConfig(): Config {
  const dataDir = process.env.DATA_DIR ?? './data'
  return {
    mode: process.env.PINGBOARD_MODE === 'cloud' ? 'cloud' : 'selfhost',
    port: Number(process.env.PORT ?? 3000),
    dataDir,
    dbPath: join(dataDir, 'pingboard.db'),
    baseUrl: process.env.PINGBOARD_BASE_URL ?? null,
    logLevel: (process.env.LOG_LEVEL as Config['logLevel']) ?? 'info',
    publicStaticDir: process.env.PINGBOARD_STATIC_DIR ?? null,
    migrationsDir: process.env.PINGBOARD_MIGRATIONS_DIR ?? null,
    trustProxy: process.env.PINGBOARD_TRUST_PROXY === 'true',
    publicRateLimitPerMinute: Number(
      process.env.PINGBOARD_PUBLIC_RATE_LIMIT ?? PUBLIC_RATE_LIMIT_PER_MINUTE,
    ),
  }
}
