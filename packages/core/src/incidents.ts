import { and, eq, isNull } from 'drizzle-orm'
import type { CheckResult } from '@pingboard/shared'
import type { DB } from '@pingboard/db'
import { incidents } from '@pingboard/db'
import { events } from './events'

/**
 * State machine: given a fresh check result, opens or closes incidents.
 * - 'down' result with no open incident → opens one
 * - 'up' result with an open incident → closes it
 * - All other transitions are no-ops
 */
export async function reconcileIncident(
  db: DB,
  monitorId: string,
  result: CheckResult,
): Promise<void> {
  const open = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.monitorId, monitorId), isNull(incidents.resolvedAt)))
    .limit(1)
  const openIncident = open[0]

  if (result.status === 'down' && !openIncident) {
    const id = crypto.randomUUID()
    const startedAt = result.checkedAt
    await db.insert(incidents).values({
      id,
      monitorId,
      startedAt,
      cause: 'auto',
    })
    events.emit('incident.opened', { incidentId: id, monitorId, startedAt })
    return
  }

  if (result.status === 'up' && openIncident) {
    const resolvedAt = result.checkedAt
    await db
      .update(incidents)
      .set({ resolvedAt })
      .where(eq(incidents.id, openIncident.id))
    events.emit('incident.resolved', {
      incidentId: openIncident.id,
      monitorId,
      startedAt: openIncident.startedAt,
      resolvedAt,
    })
  }
}
