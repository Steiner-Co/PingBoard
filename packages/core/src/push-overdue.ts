import { desc, eq } from 'drizzle-orm'
import type { DB } from '@pingboard/db'
import { heartbeats, monitors } from '@pingboard/db'
import {
  PUSH_DEFAULT_GRACE_SECONDS,
  PUSH_OVERDUE_TICK_MS,
  type CheckResult,
  type PushMonitorConfig,
} from '@pingboard/shared'
import { reconcileIncident } from './incidents'
import { events } from './events'

/**
 * Periodically scans push-type monitors for missed heartbeats.
 *
 * For each push monitor, compares the most recent heartbeat's age against
 * `intervalSeconds + graceSeconds`. If the deadline has passed and the last
 * heartbeat wasn't already 'down', writes a synthesized 'down' heartbeat and
 * runs incident reconciliation. Idempotent — once a 'down' heartbeat has
 * been written, subsequent ticks are no-ops until a fresh ping arrives.
 */
export async function runPushOverdueScan(db: DB): Promise<{ markedDown: number }> {
  const pushMonitors = await db
    .select()
    .from(monitors)
    .where(eq(monitors.type, 'push'))

  let markedDown = 0
  const now = Date.now()

  for (const monitor of pushMonitors) {
    if (monitor.paused) continue
    const config = (monitor.config ?? {}) as PushMonitorConfig
    const grace = config.graceSeconds ?? PUSH_DEFAULT_GRACE_SECONDS
    const deadlineMs = (monitor.intervalSeconds + grace) * 1000

    const [latest] = await db
      .select()
      .from(heartbeats)
      .where(eq(heartbeats.monitorId, monitor.id))
      .orderBy(desc(heartbeats.checkedAt))
      .limit(1)

    // No heartbeats yet — consider age from monitor creation.
    const lastTime = latest?.checkedAt.getTime() ?? monitor.createdAt.getTime()
    const age = now - lastTime
    if (age <= deadlineMs) continue
    // Already marked down — don't churn.
    if (latest?.status === 'down') continue

    const result: CheckResult = {
      status: 'down',
      responseTimeMs: null,
      statusCode: null,
      message: `No heartbeat received in ${Math.floor(age / 1000)}s (deadline ${monitor.intervalSeconds + grace}s)`,
      checkedAt: new Date(),
    }
    await db.insert(heartbeats).values({
      monitorId: monitor.id,
      status: result.status,
      responseTimeMs: result.responseTimeMs,
      statusCode: result.statusCode,
      message: result.message,
      checkedAt: result.checkedAt,
    })
    events.emit('heartbeat', { monitorId: monitor.id, result })
    await reconcileIncident(db, monitor.id, result)
    markedDown++
  }

  return { markedDown }
}

export function startPushOverdueJob(db: DB): { stop: () => void } {
  const tick = async () => {
    try {
      await runPushOverdueScan(db)
    } catch (err) {
      console.error('Push-overdue job failed:', err)
    }
  }
  const handle = setInterval(() => void tick(), PUSH_OVERDUE_TICK_MS)
  return { stop: () => clearInterval(handle) }
}
