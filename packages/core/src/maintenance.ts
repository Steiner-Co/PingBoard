import { and, eq, gte, lte } from 'drizzle-orm'
import type { DB } from '@pingboard/db'
import { maintenanceWindows } from '@pingboard/db'

/**
 * Returns true if the given monitor is currently inside a scheduled
 * maintenance window. Used to suppress incident creation during planned
 * downtime — heartbeats are still recorded honestly.
 */
export async function isMonitorInMaintenance(
  db: DB,
  monitorId: string,
  at: Date = new Date(),
): Promise<boolean> {
  const [row] = await db
    .select({ id: maintenanceWindows.id })
    .from(maintenanceWindows)
    .where(
      and(
        eq(maintenanceWindows.monitorId, monitorId),
        lte(maintenanceWindows.startsAt, at),
        gte(maintenanceWindows.endsAt, at),
      ),
    )
    .limit(1)
  return Boolean(row)
}
