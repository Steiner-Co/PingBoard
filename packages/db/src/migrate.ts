import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function runMigrations(filePath: string, migrationsDir?: string) {
  const sqlite = new Database(filePath, { create: true })
  sqlite.exec('PRAGMA journal_mode = WAL;')
  sqlite.exec('PRAGMA foreign_keys = ON;')
  const db = drizzle(sqlite)
  migrate(db, {
    migrationsFolder: migrationsDir ?? join(__dirname, '..', 'drizzle'),
  })
  sqlite.close()
}

if (import.meta.main) {
  const dbPath = process.env.DATABASE_PATH ?? './pingboard.db'
  console.log(`Running migrations on ${dbPath}…`)
  runMigrations(dbPath)
  console.log('Migrations complete.')
}
