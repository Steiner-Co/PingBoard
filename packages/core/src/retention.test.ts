import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createDb,
  dailyStats,
  heartbeats,
  monitors,
  runMigrations,
  setRetentionDays,
  type DB,
} from '@pingboard/db'
import { runRetention, startRetentionJob } from './retention'

let dir: string
let db: DB

const MIGRATIONS_DIR = join(import.meta.dir, '..', '..', 'db', 'drizzle')
const MONITOR_ID = '11111111-1111-1111-1111-111111111111'
const DAY_MS = 24 * 60 * 60 * 1000

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'pingboard-retention-'))
  const dbPath = join(dir, 'test.db')
  runMigrations(dbPath, MIGRATIONS_DIR)
  db = createDb(dbPath)
  await db.insert(monitors).values({
    id: MONITOR_ID,
    name: 'Test',
    type: 'http',
    target: 'https://example.com',
    intervalSeconds: 60,
    timeoutSeconds: 10,
    retryCount: 1,
    config: {},
    tags: [],
    paused: false,
  })
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

async function seedHeartbeat(daysAgo: number, status: 'up' | 'down') {
  await db.insert(heartbeats).values({
    monitorId: MONITOR_ID,
    status,
    responseTimeMs: 100,
    statusCode: status === 'up' ? 200 : 500,
    message: null,
    checkedAt: new Date(Date.now() - daysAgo * DAY_MS),
  })
}

describe('runRetention', () => {
  test('aggregates rows older than the window and deletes them', async () => {
    await seedHeartbeat(40, 'up')
    await seedHeartbeat(40, 'down')
    await seedHeartbeat(1, 'up') // inside the window, must survive

    const result = await runRetention(db, 30)

    expect(result.deletedRows).toBe(2)
    const remaining = await db.select().from(heartbeats)
    expect(remaining).toHaveLength(1)

    const stats = await db.select().from(dailyStats)
    expect(stats).toHaveLength(1)
    expect(stats[0]!.uptimePct).toBe(50)
  })

  test('is idempotent', async () => {
    await seedHeartbeat(40, 'up')
    await runRetention(db, 30)
    const second = await runRetention(db, 30)
    expect(second.deletedRows).toBe(0)
    expect(await db.select().from(dailyStats)).toHaveLength(1)
  })
})

describe('startRetentionJob', () => {
  // Regression: the job used to be interval-only, so an instance restarted
  // more often than once a day never swept and the table grew unbounded.
  test('sweeps shortly after boot, not only once a day', async () => {
    await setRetentionDays(db, 30)
    await seedHeartbeat(40, 'up')

    const job = startRetentionJob(db, { bootDelayMs: 5 })
    try {
      await Bun.sleep(150)
      expect(await db.select().from(heartbeats)).toHaveLength(0)
      expect(await db.select().from(dailyStats)).toHaveLength(1)
    } finally {
      job.stop()
    }
  })

  test('stop() cancels the pending boot sweep', async () => {
    await setRetentionDays(db, 30)
    await seedHeartbeat(40, 'up')

    startRetentionJob(db, { bootDelayMs: 50 }).stop()
    await Bun.sleep(150)
    expect(await db.select().from(heartbeats)).toHaveLength(1)
  })
})
