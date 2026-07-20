import { and, desc, eq, gte, inArray } from 'drizzle-orm'
import type { DB } from '@pingboard/db'
import {
  dailyStats,
  heartbeats,
  incidents as incidentsTable,
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
  const now = new Date()
  const TIMELINE_DAYS = 90
  const RECENT_WINDOW_DAYS = 30
  const recentWindowStart = new Date(
    now.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  )
  const timelineStart = new Date(now.getTime() - TIMELINE_DAYS * 24 * 60 * 60 * 1000)
  // First day in the visible window (UTC). The 90-day strip is built relative to
  // this anchor so today is always the last bucket.
  const today = isoDate(now)

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

        // 30-day uptime + avg response come from daily stats where possible.
        // For the most recent day we may not have an aggregated row yet, so
        // fall back to today's raw heartbeats.
        const stats = await deps.db
          .select()
          .from(dailyStats)
          .where(
            and(
              eq(dailyStats.monitorId, l.monitorId),
              gte(dailyStats.date, isoDate(timelineStart)),
            ),
          )
        const statsByDate = new Map(stats.map((s) => [s.date, s]))

        const todayHeartbeats = await deps.db
          .select({
            status: heartbeats.status,
            responseTimeMs: heartbeats.responseTimeMs,
          })
          .from(heartbeats)
          .where(
            and(
              eq(heartbeats.monitorId, l.monitorId),
              gte(heartbeats.checkedAt, startOfDay(now)),
            ),
          )
        const todayUps = todayHeartbeats.filter((h) => h.status === 'up').length
        const todayTotal = todayHeartbeats.length
        const todayUptimePct = todayTotal === 0 ? null : (todayUps / todayTotal) * 100
        const todayAvgMs =
          todayHeartbeats
            .filter((h) => h.status === 'up' && h.responseTimeMs != null)
            .reduce(
              (acc, h, _, arr) => acc + (h.responseTimeMs ?? 0) / arr.length,
              0,
            ) || null

        if (todayUptimePct != null) {
          statsByDate.set(today, {
            monitorId: l.monitorId,
            date: today,
            uptimePct: todayUptimePct,
            avgResponseMs: todayAvgMs,
            incidentsCount: 0,
          })
        }

        const timeline = buildTimeline(now, TIMELINE_DAYS, statsByDate)

        // 30-day rollups for the row header.
        const last30 = timeline.slice(-RECENT_WINDOW_DAYS).filter(
          (d) => d.uptimePct != null,
        )
        const uptimePct =
          last30.length === 0
            ? null
            : last30.reduce((a, b) => a + (b.uptimePct ?? 0), 0) / last30.length
        const responseTimeAvgs = stats
          .filter((s) => s.avgResponseMs != null && new Date(s.date) >= recentWindowStart)
          .map((s) => s.avgResponseMs as number)
        const avgResponseMs =
          responseTimeAvgs.length === 0
            ? todayAvgMs
            : Math.round(
                responseTimeAvgs.reduce((a, b) => a + b, 0) / responseTimeAvgs.length,
              )

        return {
          id: l.monitorId,
          name: l.monitor.name,
          group: l.groupName,
          currentStatus: latest?.status ?? 'unknown',
          uptimePct,
          avgResponseMs,
          timeline,
        }
      }),
  )

  // Public incident history — last 30 days across the linked monitors.
  const incidentRows =
    monitorIds.length === 0
      ? []
      : await deps.db
          .select({
            id: incidentsTable.id,
            monitorId: incidentsTable.monitorId,
            startedAt: incidentsTable.startedAt,
            resolvedAt: incidentsTable.resolvedAt,
            note: incidentsTable.note,
          })
          .from(incidentsTable)
          .where(
            and(
              inArray(incidentsTable.monitorId, monitorIds),
              gte(incidentsTable.startedAt, recentWindowStart),
            ),
          )
          .orderBy(desc(incidentsTable.startedAt))
          .limit(50)

  const monitorNameById = new Map(linked.map((l) => [l.monitorId, l.monitor.name]))
  const publicIncidents = incidentRows.map((i) => ({
    id: i.id,
    monitorId: i.monitorId,
    monitorName: monitorNameById.get(i.monitorId) ?? 'Monitor',
    startedAt: i.startedAt,
    resolvedAt: i.resolvedAt,
    note: i.note,
  }))

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
    incidents: publicIncidents,
    maintenance,
  })
}

const META_START = '<!--pingboard:meta-->'
const META_END = '<!--/pingboard:meta-->'

/**
 * Bake the status page's share-preview tags into the public shell. Slack,
 * Discord and Twitter unfurlers don't execute JS, so the client-side meta hook
 * alone leaves every shared link previewing as a bare "Status" — during an
 * incident, exactly when the link is being passed around.
 */
export async function injectPublicShellMeta(
  html: string,
  slug: string,
  origin: string,
  deps: { db: DB },
): Promise<string> {
  const start = html.indexOf(META_START)
  const end = html.indexOf(META_END)
  if (start === -1 || end === -1 || end < start) return html

  const [page] = await deps.db
    .select({
      title: statusPages.title,
      description: statusPages.description,
      passwordHash: statusPages.passwordHash,
    })
    .from(statusPages)
    .where(eq(statusPages.slug, slug))
  if (!page) return html

  const generic = `Live service status for ${page.title}.`
  // A protected page's own description is behind the password gate — an
  // unauthenticated unfurler only gets the title.
  const description = page.passwordHash ? generic : (page.description ?? generic)

  const tags = [
    `<title>${escapeHtml(page.title)} — Status</title>`,
    metaTag('name', 'description', description),
    metaTag('property', 'og:title', page.title),
    metaTag('property', 'og:description', description),
    metaTag('property', 'og:type', 'website'),
    metaTag('property', 'og:url', `${origin.replace(/\/+$/, '')}/${slug}`),
    // useDocumentMeta updates these in place rather than appending, so the
    // attribute names have to match what it queries for (name=, not property=).
    metaTag('name', 'twitter:card', 'summary'),
    metaTag('name', 'twitter:title', page.title),
    metaTag('name', 'twitter:description', description),
  ].join('\n    ')

  return html.slice(0, start) + tags + html.slice(end + META_END.length)
}

function metaTag(attr: 'name' | 'property', key: string, content: string): string {
  return `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isoDate(d: Date): string {
  // YYYY-MM-DD in UTC, matching daily_stats.date.
  return d.toISOString().slice(0, 10)
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function buildTimeline(
  now: Date,
  days: number,
  statsByDate: Map<string, { uptimePct: number; avgResponseMs: number | null }>,
): Array<{ date: string; uptimePct: number | null }> {
  const out: Array<{ date: string; uptimePct: number | null }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = isoDate(d)
    const stat = statsByDate.get(key)
    out.push({ date: key, uptimePct: stat ? stat.uptimePct : null })
  }
  return out
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
