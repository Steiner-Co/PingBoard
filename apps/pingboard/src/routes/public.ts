import { and, desc, eq, gte, inArray } from 'drizzle-orm'
import type { DB } from '@pingboard/db'
import {
  heartbeats,
  maintenanceWindows,
  monitors,
  statusPageMonitors,
  statusPages,
} from '@pingboard/db'
import { events, reconcileIncident } from '@pingboard/core'
import type { CheckResult, PushMonitorConfig } from '@pingboard/shared'
import { parseCookies, serializeCookie } from '../lib/cookies'
import { issueToken, pageCookieName, verifyToken } from '../lib/page-auth'
import { error, json, noContent } from '../lib/responses'
import { createSseResponse } from '../lib/sse'

interface PublicDeps {
  db: DB
  secureCookies: boolean
}

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60

function isAuthorized(req: Request, page: { id: string; passwordHash: string | null }): boolean {
  if (!page.passwordHash) return true
  const cookies = parseCookies(req.headers.get('cookie'))
  const token = cookies[pageCookieName(page.id)]
  return verifyToken(page.id, token)
}

export async function getStatusPagePublic(
  slug: string,
  req: Request,
  deps: PublicDeps,
): Promise<Response> {
  const [page] = await deps.db
    .select()
    .from(statusPages)
    .where(eq(statusPages.slug, slug))
  if (!page) return error(404, 'Status page not found')

  if (!isAuthorized(req, page)) {
    return json(
      { error: 'Password required', requiresPassword: true },
      { status: 401 },
    )
  }

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

  const now = new Date()
  const maintenance =
    monitorIds.length === 0
      ? []
      : await deps.db
          .select({
            id: maintenanceWindows.id,
            monitorId: maintenanceWindows.monitorId,
            title: maintenanceWindows.title,
            description: maintenanceWindows.description,
            startsAt: maintenanceWindows.startsAt,
            endsAt: maintenanceWindows.endsAt,
          })
          .from(maintenanceWindows)
          .where(
            and(
              inArray(maintenanceWindows.monitorId, monitorIds),
              gte(maintenanceWindows.endsAt, now),
            ),
          )
          .orderBy(maintenanceWindows.startsAt)

  return json({
    page: {
      slug: page.slug,
      title: page.title,
      description: page.description,
      theme: page.theme,
    },
    monitors: data,
    monitorIds,
    maintenance,
  })
}

export async function streamStatusPagePublic(
  slug: string,
  req: Request,
  deps: PublicDeps,
): Promise<Response> {
  const [page] = await deps.db
    .select()
    .from(statusPages)
    .where(eq(statusPages.slug, slug))
  if (!page) return error(404, 'Status page not found')

  if (!isAuthorized(req, page)) {
    return json(
      { error: 'Password required', requiresPassword: true },
      { status: 401 },
    )
  }

  const monitorRows = await deps.db
    .select({ monitorId: statusPageMonitors.monitorId })
    .from(statusPageMonitors)
    .where(eq(statusPageMonitors.statusPageId, page.id))
  const allowed = new Set(monitorRows.map((r) => r.monitorId))

  return createSseResponse({
    filter: (_event, payload) => {
      const monitorId = (payload as { monitorId?: string }).monitorId
      if (!monitorId) return false
      return allowed.has(monitorId)
    },
  })
}

export async function authStatusPagePublic(
  slug: string,
  req: Request,
  deps: PublicDeps,
): Promise<Response> {
  const [page] = await deps.db
    .select()
    .from(statusPages)
    .where(eq(statusPages.slug, slug))
  if (!page) return error(404, 'Status page not found')
  if (!page.passwordHash) {
    // Page is public — nothing to do, but return success so the client can
    // proceed without a special case.
    return json({ ok: true })
  }

  let body: { password?: unknown }
  try {
    body = (await req.json()) as { password?: unknown }
  } catch {
    return error(400, 'Invalid JSON body')
  }
  const password = typeof body.password === 'string' ? body.password : ''
  if (!password) return error(400, 'Password required')

  const ok = await Bun.password.verify(password, page.passwordHash)
  if (!ok) return error(401, 'Incorrect password')

  const token = issueToken(page.id)
  const cookie = serializeCookie(pageCookieName(page.id), token, {
    maxAge: TOKEN_TTL_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    secure: deps.secureCookies,
  })
  return noContent({ 'set-cookie': cookie })
}

export async function handlePushHeartbeat(
  token: string,
  req: Request,
  deps: { db: DB },
): Promise<Response> {
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(token)) {
    return error(404, 'Unknown push token')
  }

  // Push monitors are rare; loading all is fine. (SQLite, in-process,
  // typical instance has <100 monitors.)
  const pushMonitors = await deps.db
    .select()
    .from(monitors)
    .where(eq(monitors.type, 'push'))
  const monitor = pushMonitors.find(
    (m) => (m.config as PushMonitorConfig | null)?.token === token,
  )
  if (!monitor) return error(404, 'Unknown push token')
  if (monitor.paused) return json({ ok: true, paused: true })

  let body: { status?: unknown; message?: unknown; responseTimeMs?: unknown } = {}
  if (req.headers.get('content-length') !== '0' && req.method !== 'GET') {
    try {
      body = (await req.json()) as typeof body
    } catch {
      // Ignore — empty / non-JSON bodies are valid; default to 'up'.
    }
  }

  const status: CheckResult['status'] =
    body.status === 'down' || body.status === 'degraded' ? body.status : 'up'
  const message =
    typeof body.message === 'string' && body.message.length <= 500
      ? body.message
      : null
  const responseTimeMs =
    typeof body.responseTimeMs === 'number' && Number.isFinite(body.responseTimeMs)
      ? Math.max(0, Math.round(body.responseTimeMs))
      : null

  const result: CheckResult = {
    status,
    responseTimeMs,
    statusCode: null,
    message,
    checkedAt: new Date(),
  }
  await deps.db.insert(heartbeats).values({
    monitorId: monitor.id,
    status: result.status,
    responseTimeMs: result.responseTimeMs,
    statusCode: result.statusCode,
    message: result.message,
    checkedAt: result.checkedAt,
  })
  events.emit('heartbeat', { monitorId: monitor.id, result })
  await reconcileIncident(deps.db, monitor.id, result)
  return json({ ok: true })
}
