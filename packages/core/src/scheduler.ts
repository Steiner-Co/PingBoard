import type { CheckResult } from '@pingboard/shared'
import type { Monitor } from '@pingboard/db'
import { runCheck } from './checkers'
import { events } from './events'

export interface SchedulerOptions {
  /** Persists a heartbeat row; called after every check. */
  onHeartbeat: (monitorId: string, result: CheckResult) => Promise<void> | void
}

interface ScheduledMonitor {
  monitor: Monitor
  timer: ReturnType<typeof setTimeout> | null
  inFlight: Promise<void> | null
  cancelled: boolean
}

export class Scheduler {
  private readonly entries = new Map<string, ScheduledMonitor>()
  private draining = false

  constructor(private readonly opts: SchedulerOptions) {}

  /** Start (or restart) a monitor. Fires the first check immediately. */
  start(monitor: Monitor): void {
    if (this.draining) return
    this.stop(monitor.id)
    if (monitor.paused) return

    const entry: ScheduledMonitor = {
      monitor,
      timer: null,
      inFlight: null,
      cancelled: false,
    }
    this.entries.set(monitor.id, entry)
    this.fire(entry)
  }

  /** Stop a monitor. In-flight check is left to complete; result is discarded. */
  stop(monitorId: string): void {
    const entry = this.entries.get(monitorId)
    if (!entry) return
    entry.cancelled = true
    if (entry.timer) clearTimeout(entry.timer)
    this.entries.delete(monitorId)
  }

  /** Restart a monitor (use after interval/config changes). */
  restart(monitor: Monitor): void {
    this.start(monitor)
  }

  /** True if a monitor is currently scheduled. */
  has(monitorId: string): boolean {
    return this.entries.has(monitorId)
  }

  /** Stop accepting new ticks; wait for in-flight checks (capped at 5s). */
  async drain(): Promise<void> {
    this.draining = true
    const inflight = [...this.entries.values()]
      .map((e) => {
        if (e.timer) clearTimeout(e.timer)
        e.cancelled = true
        return e.inFlight
      })
      .filter((p): p is Promise<void> => p !== null)

    await Promise.race([
      Promise.allSettled(inflight),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ])
    this.entries.clear()
  }

  private fire(entry: ScheduledMonitor): void {
    if (entry.cancelled) return

    entry.inFlight = (async () => {
      try {
        const result = await runWithRetries(entry.monitor)
        if (entry.cancelled) return
        await this.opts.onHeartbeat(entry.monitor.id, result)
        events.emit('heartbeat', { monitorId: entry.monitor.id, result })
      } catch (err) {
        // Defensive — runWithRetries already converts errors into a CheckResult
        console.error(`Scheduler fire error for ${entry.monitor.id}:`, err)
      } finally {
        entry.inFlight = null
        if (!entry.cancelled && !this.draining) {
          entry.timer = setTimeout(
            () => this.fire(entry),
            entry.monitor.intervalSeconds * 1000,
          )
        }
      }
    })()
  }
}

async function runWithRetries(monitor: Monitor): Promise<CheckResult> {
  let lastResult: CheckResult | null = null
  const attempts = Math.max(1, monitor.retryCount + 1)

  for (let i = 0; i < attempts; i++) {
    lastResult = await runCheck(monitor)
    if (lastResult.status === 'up') return lastResult
  }

  return (
    lastResult ?? {
      status: 'down',
      responseTimeMs: null,
      statusCode: null,
      message: 'No check attempts were made',
      checkedAt: new Date(),
    }
  )
}
