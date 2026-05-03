import { and, desc, eq, gte } from 'drizzle-orm'
import type { DB } from '@pingboard/db'
import {
  heartbeats,
  monitors,
  statusPageMonitors,
  statusPages,
} from '@pingboard/db'
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
