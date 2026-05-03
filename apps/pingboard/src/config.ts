import { join } from 'node:path'

export interface Config {
  port: number
  dataDir: string
  dbPath: string
  baseUrl: string | null
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  publicStaticDir: string | null
}

export function loadConfig(): Config {
  const dataDir = process.env.DATA_DIR ?? './data'
  return {
    port: Number(process.env.PORT ?? 3000),
    dataDir,
    dbPath: join(dataDir, 'pingboard.db'),
    baseUrl: process.env.PINGBOARD_BASE_URL ?? null,
    logLevel: (process.env.LOG_LEVEL as Config['logLevel']) ?? 'info',
    publicStaticDir: process.env.PINGBOARD_STATIC_DIR ?? null,
  }
}
