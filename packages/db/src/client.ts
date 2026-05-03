import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'

export type DB = ReturnType<typeof createDb>

export function createDb(filePath: string) {
  const sqlite = new Database(filePath, { create: true })
  sqlite.exec('PRAGMA journal_mode = WAL;')
  sqlite.exec('PRAGMA foreign_keys = ON;')
  sqlite.exec('PRAGMA synchronous = NORMAL;')
  sqlite.exec('PRAGMA busy_timeout = 5000;')
  return drizzle(sqlite, { schema })
}
