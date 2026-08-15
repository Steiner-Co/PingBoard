import { and, gte, lt, sql } from 'drizzle-orm'
import type { DB } from '@pingboard/db'
import { dailyStats, getRetentionDays, heartbeats } from '@pingboard/db'
import { DEFAULT_RETENTION_DAYS } from '@pingboard/shared'

/**
 * Aggregates raw heartbeats into per-day stats, then deletes raw rows older
 * than `retentionDays`. Idempotent.
 *
 * Aggregation covers every COMPLETE day (anything before today's UTC
 * midnight), not just rows past the retention cutoff: the status-page
 * timeline and the dashboard uptime strips read daily_stats for history, so
 * a day needs its rollup row as soon as it closes — otherwise the last
 * `retentionDays` of the timeline render as "no data". Only deletion is
 * gated on the retention window.
 */
export async function runRetention(
  db: DB,
  retentionDays = DEFAULT_RETENTION_DAYS,
): Promise<{ aggregatedDays: number; deletedRows: number }> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  // Pull (monitor_id, day) groups with computed aggregates from completed days.
  const rows = await db
    .select({
      monitorId: heartbeats.monitorId,
      day: sql<string>`date(${heartbeats.checkedAt} / 1000, 'unixepoch')`.as('day'),
      total: sql<number>`count(*)`.as('total'),
      ups: sql<number>`sum(case when ${heartbeats.status} = 'up' then 1 else 0 end)`.as('ups'),
      avgResponseMs: sql<number | null>`avg(${heartbeats.responseTimeMs})`.as('avg_response_ms'),
    })
    .from(heartbeats)
    .where(lt(heartbeats.checkedAt, todayStart))
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
  const ONE_HOUR_MS = 60 * 60 * 1000
  const tick = async () => {
    try {
      const days = await getRetentionDays(db)
      await runRetention(db, days)
    } catch (err) {
      console.error('Retention job failed:', err)
    }
  }
  // Sweep shortly after boot as well as hourly. Without the boot sweep, an
  // instance restarted often would never aggregate/delete at all. Hourly
  // rather than daily because the sweep is idempotent and cheap, and the
  // status-page timeline renders from the rollups — yesterday's bar should
  // appear within the hour, not up to a day late.
  const initial = setTimeout(() => void tick(), bootDelayMs)
  const handle = setInterval(() => void tick(), ONE_HOUR_MS)
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
