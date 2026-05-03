import { and, desc, eq, gte } from 'drizzle-orm'
import type { DB } from '@pingboard/db'
import {
  heartbeats,
  monitors,
  statusPageMonitors,
  statusPages,
} from '@pingboard/db'
import { error, json } from '../lib/responses'
import { createSseResponse } from '../lib/sse'

interface PublicDeps {
  db: DB
}

export async function getStatusPagePublic(
  slug: string,
  deps: PublicDeps,
): Promise<Response> {
  const [page] = await deps.db
    .select()
    .from(statusPages)
    .where(eq(statusPages.slug, slug))
  if (!page) return error(404, 'Status page not found')

  const linked = await deps.db
    .select({
      monitorId: statusPageMonitors.monitorId,
      groupName: statusPageMonitors.groupName,
      sortOrder: statusPageMonitors.sortOrder,
      monitor: monitors,
    })
    .from(statusPageMonitors)
    .innerJoin(monitors, eq(monitors.id, statusPageMonitors.monitorId))
    .where(eq(statusPageMonitors.statusPageId, page.id))

  const monitorIds = linked.map((l) => l.monitorId)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const data = await Promise.all(
    linked
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(async (l) => {
        const [latest] = await deps.db
          .select()
          .from(heartbeats)
          .where(eq(heartbeats.monitorId, l.monitorId))
          .orderBy(desc(heartbeats.checkedAt))
          .limit(1)

        const recent = await deps.db
          .select({
            checkedAt: heartbeats.checkedAt,
            status: heartbeats.status,
            responseTimeMs: heartbeats.responseTimeMs,
          })
          .from(heartbeats)
          .where(
            and(
              eq(heartbeats.monitorId, l.monitorId),
              gte(heartbeats.checkedAt, since),
            ),
          )
          .orderBy(desc(heartbeats.checkedAt))

        const total = recent.length
        const ups = recent.filter((r) => r.status === 'up').length
        const uptimePct = total === 0 ? null : (ups / total) * 100

        return {
          id: l.monitorId,
          name: l.monitor.name,
          group: l.groupName,
          currentStatus: latest?.status ?? 'unknown',
          uptimePct,
          recent: recent.slice(0, 90).reverse(),
        }
      }),
  )

  return json({
    page: {
      slug: page.slug,
      title: page.title,
      description: page.description,
      theme: page.theme,
    },
    monitors: data,
    monitorIds,
  })
}

export function streamStatusPagePublic(
  slug: string,
  deps: PublicDeps,
): Response {
  // The SSE stream emits all heartbeats; client filters by monitor id.
  // Filter at the source by looking up which monitors belong to this page.
  let allowed: Set<string> | null = null
  void deps.db
    .select({ monitorId: statusPageMonitors.monitorId })
    .from(statusPageMonitors)
    .innerJoin(statusPages, eq(statusPages.id, statusPageMonitors.statusPageId))
    .where(eq(statusPages.slug, slug))
    .then((rows) => {
      allowed = new Set(rows.map((r) => r.monitorId))
    })

  return createSseResponse({
    filter: (_event, payload) => {
      const monitorId = (payload as { monitorId?: string }).monitorId
      if (!monitorId) return false
      if (!allowed) return false
      return allowed.has(monitorId)
    },
  })
}
