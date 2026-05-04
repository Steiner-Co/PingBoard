import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createDb,
  incidents,
  maintenanceWindows,
  monitors,
  runMigrations,
  type DB,
  type NewMonitor,
} from '@pingboard/db'
import type { CheckResult } from '@pingboard/shared'
import { reconcileIncident } from './incidents'

let dir: string
let dbPath: string
let db: DB

const MIGRATIONS_DIR = join(import.meta.dir, '..', '..', 'db', 'drizzle')

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pingboard-test-'))
  dbPath = join(dir, 'test.db')
  runMigrations(dbPath, MIGRATIONS_DIR)
  db = createDb(dbPath)
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

function makeMonitor(): NewMonitor & { id: string } {
  return {
    id: crypto.randomUUID(),
    name: 'maintenance-test',
    type: 'http',
    target: 'https://example.com',
    intervalSeconds: 60,
    timeoutSeconds: 10,
    retryCount: 1,
    config: {},
    tags: [],
    paused: false,
  }
}

const downResult = (): CheckResult => ({
  status: 'down',
  responseTimeMs: 1234,
  statusCode: 500,
  message: 'simulated failure',
  checkedAt: new Date(),
})

describe('reconcileIncident maintenance gating', () => {
  test('opens an incident when no maintenance window is active', async () => {
    const m = makeMonitor()
    await db.insert(monitors).values(m)

    await reconcileIncident(db, m.id, downResult())

    const open = await db.select().from(incidents)
    expect(open).toHaveLength(1)
  })

  test('suppresses incident creation during an active maintenance window', async () => {
    const m = makeMonitor()
    await db.insert(monitors).values(m)
    const now = Date.now()
    await db.insert(maintenanceWindows).values({
      id: crypto.randomUUID(),
      monitorId: m.id,
      title: 'planned',
      description: null,
      startsAt: new Date(now - 60_000),
      endsAt: new Date(now + 60_000),
    })

    await reconcileIncident(db, m.id, downResult())

    const open = await db.select().from(incidents)
    expect(open).toHaveLength(0)
  })

  test('still opens an incident when maintenance window has ended', async () => {
    const m = makeMonitor()
    await db.insert(monitors).values(m)
    const now = Date.now()
    await db.insert(maintenanceWindows).values({
      id: crypto.randomUUID(),
      monitorId: m.id,
      title: 'planned',
      description: null,
      startsAt: new Date(now - 120_000),
      endsAt: new Date(now - 60_000),
    })

    await reconcileIncident(db, m.id, downResult())

    const open = await db.select().from(incidents)
    expect(open).toHaveLength(1)
  })
})
