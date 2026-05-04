import type { CheckResult } from '@pingboard/shared'
import type { Monitor } from '@pingboard/db'

/**
 * Push monitors don't actively check anything — heartbeats arrive from the
 * outside via `POST /api/push/:token`. The scheduler skips them entirely,
 * but a registry entry is required so any accidental call is a no-op rather
 * than a "down" error.
 */
export async function checkPush(_monitor: Monitor): Promise<CheckResult> {
  return {
    status: 'up',
    responseTimeMs: null,
    statusCode: null,
    message: 'push monitor — awaiting external heartbeat',
    checkedAt: new Date(),
  }
}
