import { and, gte, lt, sql } from 'drizzle-orm'
import type { DB } from '@pingboard/db'
import { dailyStats, getRetentionDays, heartbeats } from '@pingboard/db'
import { DEFAULT_RETENTION_DAYS } from '@pingboard/shared'

/**
 * Aggregates raw heartbeats older than `retentionDays` into daily stats,
 * then deletes the originals. Idempotent.
 */
export async function runRetention(
  db: DB,
  retentionDays = DEFAULT_RETENTION_DAYS,
): Promise<{ aggregatedDays: number; deletedRows: number }> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

  // Pull (monitor_id, day) groups with computed aggregates from rows older than cutoff.
  const rows = await db
    .select({
      monitorId: heartbeats.monitorId,
      day: sql<string>`date(${heartbeats.checkedAt} / 1000, 'unixepoch')`.as('day'),
      total: sql<number>`count(*)`.as('total'),
      ups: sql<number>`sum(case when ${heartbeats.status} = 'up' then 1 else 0 end)`.as('ups'),
      avgResponseMs: sql<number | null>`avg(${heartbeats.responseTimeMs})`.as('avg_response_ms'),
    })
    .from(heartbeats)
    .where(lt(heartbeats.checkedAt, cutoff))
    .groupBy(heartbeats.monitorId, sql`day`)

  for (const row of rows) {
    const uptimePct = row.total === 0 ? 0 : (row.ups / row.total) * 100
    await db
      .insert(dailyStats)
      .values({
        monitorId: row.monitorId,
        date: row.day,
        uptimePct,
        avgResponseMs: row.avgResponseMs,
        incidentsCount: 0,
      })
      .onConflictDoUpdate({
        target: [dailyStats.monitorId, dailyStats.date],
        set: { uptimePct, avgResponseMs: row.avgResponseMs },
      })
  }

  const deleted = await db
    .delete(heartbeats)
    .where(lt(heartbeats.checkedAt, cutoff))
    .returning({ id: heartbeats.id })

  return { aggregatedDays: rows.length, deletedRows: deleted.length }
}

/** Delay before the boot sweep, so it doesn't compete with startup. */
export const RETENTION_BOOT_DELAY_MS = 10_000

export function startRetentionJob(
  db: DB,
  { bootDelayMs = RETENTION_BOOT_DELAY_MS }: { bootDelayMs?: number } = {},
): { stop: () => void } {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000
  const tick = async () => {
    try {
      const days = await getRetentionDays(db)
      await runRetention(db, days)
    } catch (err) {
      console.error('Retention job failed:', err)
    }
  }
  // Sweep shortly after boot as well as daily. With only the interval, an
  // instance restarted more often than every 24h — which is any instance
  // that gets upgraded — would never sweep at all, and the heartbeat table
  // would grow without bound regardless of the configured retention.
  const initial = setTimeout(() => void tick(), bootDelayMs)
  const handle = setInterval(() => void tick(), ONE_DAY_MS)
  return {
    stop: () => {
      clearTimeout(initial)
      clearInterval(handle)
    },
  }
}

// Silence unused-import warning for `gte` so it's available for future range queries.
void gte
void and
