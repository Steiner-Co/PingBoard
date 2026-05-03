import { and, desc, eq, gte, sql } from 'drizzle-orm'
import type { DB } from '@pingboard/db'
import {
  heartbeats,
  incidents,
  monitorChannels,
  monitors,
  notificationChannels,
  statusPageMonitors,
  statusPages,
  type NewMonitor,
  type NewNotificationChannel,
  type NewStatusPage,
} from '@pingboard/db'
import { ALLOWED_INTERVALS_SECONDS, RESERVED_SLUGS } from '@pingboard/shared'
import { Scheduler, sendTest } from '@pingboard/core'
import { error, json, noContent } from '../lib/responses'
import { revokeTokensForPage } from '../lib/page-auth'

type StatusPageRow = typeof statusPages.$inferSelect
type PublicStatusPage = Omit<StatusPageRow, 'passwordHash'> & { passwordSet: boolean }

function publicPage(p: StatusPageRow): PublicStatusPage {
  const { passwordHash, ...rest } = p
  return { ...rest, passwordSet: !!passwordHash }
}

interface AdminDeps {
  db: DB
  scheduler: Scheduler
}

// ─────────────────────────── Monitors ───────────────────────────

export async function listMonitors(deps: AdminDeps): Promise<Response> {
  const rows = await deps.db.select().from(monitors)
  const enriched = await Promise.all(
    rows.map(async (m) => {
      const [latest] = await deps.db
        .select()
        .from(heartbeats)
        .where(eq(heartbeats.monitorId, m.id))
        .orderBy(desc(heartbeats.checkedAt))
        .limit(1)
      return { ...m, latest: latest ?? null }
    }),
  )
  return json({ monitors: enriched })
}

export async function getMonitor(id: string, deps: AdminDeps): Promise<Response> {
  const [monitor] = await deps.db.select().from(monitors).where(eq(monitors.id, id))
  if (!monitor) return error(404, 'Monitor not found')

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recent = await deps.db
    .select()
    .from(heartbeats)
    .where(and(eq(heartbeats.monitorId, id), gte(heartbeats.checkedAt, since)))
    .orderBy(desc(heartbeats.checkedAt))
    .limit(500)

  const incidentRows = await deps.db
    .select()
    .from(incidents)
    .where(eq(incidents.monitorId, id))
    .orderBy(desc(incidents.startedAt))
    .limit(50)

  const linkedChannels = await deps.db
    .select({ channelId: monitorChannels.channelId })
    .from(monitorChannels)
    .where(eq(monitorChannels.monitorId, id))

  return json({
    monitor,
    heartbeats: recent,
    incidents: incidentRows,
    channelIds: linkedChannels.map((l) => l.channelId),
  })
}

export async function createMonitor(req: Request, deps: AdminDeps): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')
  const validation = validateMonitorPayload(body)
  if ('error' in validation) return error(400, validation.error)

  const id = crypto.randomUUID()
  const channelIds = Array.isArray(body.channelIds)
    ? body.channelIds.filter((v): v is string => typeof v === 'string')
    : []

  const newMonitor: NewMonitor = {
    id,
    name: validation.name,
    type: validation.type,
    target: validation.target,
    intervalSeconds: validation.intervalSeconds,
    timeoutSeconds: validation.timeoutSeconds,
    retryCount: validation.retryCount,
    config: validation.config,
    paused: false,
  }

  await deps.db.insert(monitors).values(newMonitor)
  if (channelIds.length > 0) {
    await deps.db
      .insert(monitorChannels)
      .values(channelIds.map((channelId) => ({ monitorId: id, channelId })))
  }

  const [created] = await deps.db.select().from(monitors).where(eq(monitors.id, id))
  if (created) deps.scheduler.start(created)
  return json({ monitor: created }, { status: 201 })
}

export async function updateMonitor(
  id: string,
  req: Request,
  deps: AdminDeps,
): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')

  const [existing] = await deps.db.select().from(monitors).where(eq(monitors.id, id))
  if (!existing) return error(404, 'Monitor not found')

  const merged = { ...existing, ...body }
  const validation = validateMonitorPayload(merged)
  if ('error' in validation) return error(400, validation.error)

  await deps.db
    .update(monitors)
    .set({
      name: validation.name,
      type: validation.type,
      target: validation.target,
      intervalSeconds: validation.intervalSeconds,
      timeoutSeconds: validation.timeoutSeconds,
      retryCount: validation.retryCount,
      config: validation.config,
      paused: typeof body.paused === 'boolean' ? body.paused : existing.paused,
      updatedAt: new Date(),
    })
    .where(eq(monitors.id, id))

  if (Array.isArray(body.channelIds)) {
    await deps.db.delete(monitorChannels).where(eq(monitorChannels.monitorId, id))
    const channelIds = body.channelIds.filter(
      (v: unknown): v is string => typeof v === 'string',
    )
    if (channelIds.length > 0) {
      await deps.db
        .insert(monitorChannels)
        .values(channelIds.map((channelId) => ({ monitorId: id, channelId })))
    }
  }

  const [updated] = await deps.db.select().from(monitors).where(eq(monitors.id, id))
  if (updated) deps.scheduler.restart(updated)
  return json({ monitor: updated })
}

export async function deleteMonitor(id: string, deps: AdminDeps): Promise<Response> {
  deps.scheduler.stop(id)
  await deps.db.delete(monitors).where(eq(monitors.id, id))
  return noContent()
}

// ───────────────────── Notification channels ─────────────────────

export async function listChannels(deps: AdminDeps): Promise<Response> {
  const rows = await deps.db.select().from(notificationChannels)
  return json({ channels: rows })
}

export async function createChannel(req: Request, deps: AdminDeps): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')

  const id = crypto.randomUUID()
  const channel: NewNotificationChannel = {
    id,
    name: String(body.name ?? '').trim(),
    type: body.type as never,
    config: body.config as never,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
  }
  if (!channel.name) return error(400, 'Name required')
  if (!['email', 'webhook', 'discord', 'slack', 'ntfy'].includes(channel.type)) {
    return error(400, 'Invalid channel type')
  }

  await deps.db.insert(notificationChannels).values(channel)
  const [created] = await deps.db
    .select()
    .from(notificationChannels)
    .where(eq(notificationChannels.id, id))
  return json({ channel: created }, { status: 201 })
}

export async function updateChannel(
  id: string,
  req: Request,
  deps: AdminDeps,
): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')
  await deps.db
    .update(notificationChannels)
    .set({
      name: body.name as string,
      config: body.config as never,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
    })
    .where(eq(notificationChannels.id, id))
  const [updated] = await deps.db
    .select()
    .from(notificationChannels)
    .where(eq(notificationChannels.id, id))
  if (!updated) return error(404, 'Channel not found')
  return json({ channel: updated })
}

export async function deleteChannel(id: string, deps: AdminDeps): Promise<Response> {
  await deps.db.delete(notificationChannels).where(eq(notificationChannels.id, id))
  return noContent()
}

export async function testChannel(id: string, deps: AdminDeps): Promise<Response> {
  const [channel] = await deps.db
    .select()
    .from(notificationChannels)
    .where(eq(notificationChannels.id, id))
  if (!channel) return error(404, 'Channel not found')
  try {
    await sendTest(deps.db, { type: channel.type, config: channel.config })
    return json({ ok: true })
  } catch (err) {
    return error(400, err instanceof Error ? err.message : 'Test failed')
  }
}

// ─────────────────────── Incidents ────────────────────────

export async function listIncidents(deps: AdminDeps): Promise<Response> {
  const rows = await deps.db
    .select({
      id: incidents.id,
      monitorId: incidents.monitorId,
      monitorName: monitors.name,
      monitorType: monitors.type,
      monitorTarget: monitors.target,
      startedAt: incidents.startedAt,
      resolvedAt: incidents.resolvedAt,
      cause: incidents.cause,
      note: incidents.note,
    })
    .from(incidents)
    .innerJoin(monitors, eq(monitors.id, incidents.monitorId))
    .orderBy(desc(incidents.startedAt))
    .limit(200)
  return json({ incidents: rows })
}

export async function updateIncident(
  id: string,
  req: Request,
  deps: AdminDeps,
): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')
  const set: { note?: string | null } = {}
  if ('note' in body) {
    const note = body.note
    if (note === null) set.note = null
    else if (typeof note === 'string') set.note = note.trim() || null
    else return error(400, 'note must be a string or null')
  }
  if (Object.keys(set).length === 0) return error(400, 'No supported fields to update')
  await deps.db.update(incidents).set(set).where(eq(incidents.id, id))
  const [updated] = await deps.db.select().from(incidents).where(eq(incidents.id, id))
  if (!updated) return error(404, 'Incident not found')
  return json({ incident: updated })
}

export async function resolveIncident(id: string, deps: AdminDeps): Promise<Response> {
  const [incident] = await deps.db.select().from(incidents).where(eq(incidents.id, id))
  if (!incident) return error(404, 'Incident not found')
  if (incident.resolvedAt) return error(409, 'Incident is already resolved')
  const resolvedAt = new Date()
  await deps.db
    .update(incidents)
    .set({ resolvedAt, cause: 'manual' })
    .where(eq(incidents.id, id))
  const [updated] = await deps.db.select().from(incidents).where(eq(incidents.id, id))
  return json({ incident: updated })
}

// ─────────────────────── Status pages ────────────────────────

export async function listStatusPages(deps: AdminDeps): Promise<Response> {
  const rows = await deps.db.select().from(statusPages)
  return json({ pages: rows.map(publicPage) })
}

export async function getStatusPage(id: string, deps: AdminDeps): Promise<Response> {
  const [page] = await deps.db.select().from(statusPages).where(eq(statusPages.id, id))
  if (!page) return error(404, 'Status page not found')
  const linked = await deps.db
    .select()
    .from(statusPageMonitors)
    .where(eq(statusPageMonitors.statusPageId, id))
  return json({ page: publicPage(page), monitors: linked })
}

async function resolvePassword(value: unknown): Promise<string | null | undefined> {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed === '') return null
  return await Bun.password.hash(trimmed)
}

export async function createStatusPage(req: Request, deps: AdminDeps): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')
  const slug = String(body.slug ?? '').trim().toLowerCase()
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return error(400, 'Slug must be lowercase letters, digits, and hyphens')
  }
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
    return error(400, `"${slug}" is a reserved slug`)
  }
  const id = crypto.randomUUID()
  const passwordHash = await resolvePassword(body.password)
  const page: NewStatusPage = {
    id,
    slug,
    title: String(body.title ?? slug),
    description: body.description ? String(body.description) : null,
    theme: (body.theme as 'light' | 'dark' | 'auto') ?? 'auto',
    passwordHash: passwordHash ?? null,
    customDomain: null,
  }
  try {
    await deps.db.insert(statusPages).values(page)
  } catch {
    return error(409, 'Slug already in use')
  }

  const monitorList = Array.isArray(body.monitors)
    ? body.monitors.filter(
        (m: unknown): m is { monitorId: string; groupName?: string; sortOrder?: number } =>
          !!m && typeof m === 'object' && 'monitorId' in m,
      )
    : []
  if (monitorList.length > 0) {
    await deps.db.insert(statusPageMonitors).values(
      monitorList.map((m, i) => ({
        statusPageId: id,
        monitorId: m.monitorId,
        groupName: m.groupName ?? null,
        sortOrder: m.sortOrder ?? i,
      })),
    )
  }
  const [created] = await deps.db.select().from(statusPages).where(eq(statusPages.id, id))
  if (!created) return error(500, 'Failed to read created page')
  return json({ page: publicPage(created) }, { status: 201 })
}

export async function updateStatusPage(
  id: string,
  req: Request,
  deps: AdminDeps,
): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')

  const set: Partial<typeof statusPages.$inferInsert> = {}
  if ('title' in body) set.title = String(body.title)
  if ('description' in body) {
    set.description = body.description == null ? null : String(body.description)
  }
  if ('theme' in body) set.theme = (body.theme as 'light' | 'dark' | 'auto') ?? 'auto'

  if ('password' in body) {
    const hashed = await resolvePassword(body.password)
    if (hashed !== undefined) {
      set.passwordHash = hashed
      // Removing or rotating the password should invalidate any cookies
      // already issued, so visitors are forced through the new gate.
      revokeTokensForPage(id)
    }
  }

  if (Object.keys(set).length > 0) {
    await deps.db.update(statusPages).set(set).where(eq(statusPages.id, id))
  }

  if (Array.isArray(body.monitors)) {
    await deps.db
      .delete(statusPageMonitors)
      .where(eq(statusPageMonitors.statusPageId, id))
    const list = body.monitors.filter(
      (m: unknown): m is { monitorId: string; groupName?: string; sortOrder?: number } =>
        !!m && typeof m === 'object' && 'monitorId' in m,
    )
    if (list.length > 0) {
      await deps.db.insert(statusPageMonitors).values(
        list.map((m, i) => ({
          statusPageId: id,
          monitorId: m.monitorId,
          groupName: m.groupName ?? null,
          sortOrder: m.sortOrder ?? i,
        })),
      )
    }
  }
  const [updated] = await deps.db.select().from(statusPages).where(eq(statusPages.id, id))
  if (!updated) return error(404, 'Status page not found')
  return json({ page: publicPage(updated) })
}

export async function deleteStatusPage(id: string, deps: AdminDeps): Promise<Response> {
  await deps.db.delete(statusPages).where(eq(statusPages.id, id))
  revokeTokensForPage(id)
  return noContent()
}

// ─────────────────────── Helpers ───────────────────────

function validateMonitorPayload(body: Record<string, unknown>):
  | { error: string }
  | {
      name: string
      type: 'http' | 'tcp' | 'ping' | 'dns'
      target: string
      intervalSeconds: number
      timeoutSeconds: number
      retryCount: number
      config: Record<string, unknown>
    } {
  const name = String(body.name ?? '').trim()
  const type = String(body.type ?? '') as 'http' | 'tcp' | 'ping' | 'dns'
  const target = String(body.target ?? '').trim()
  const intervalSeconds = Number(body.intervalSeconds ?? 60)
  const timeoutSeconds = Number(body.timeoutSeconds ?? 10)
  const retryCount = Number(body.retryCount ?? 1)
  const config = (body.config as Record<string, unknown> | undefined) ?? {}

  if (!name) return { error: 'Name required' }
  if (!['http', 'tcp', 'ping', 'dns'].includes(type)) return { error: 'Invalid monitor type' }
  if (!target) return { error: 'Target required' }
  if (!(ALLOWED_INTERVALS_SECONDS as readonly number[]).includes(intervalSeconds)) {
    return { error: `interval must be one of ${ALLOWED_INTERVALS_SECONDS.join(', ')}` }
  }
  if (timeoutSeconds < 1 || timeoutSeconds > 60) {
    return { error: 'timeout must be between 1 and 60 seconds' }
  }
  if (retryCount < 0 || retryCount > 5) {
    return { error: 'retryCount must be between 0 and 5' }
  }

  return { name, type, target, intervalSeconds, timeoutSeconds, retryCount, config }
}

async function safeJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

// Used by /api/admin/sse — re-exported so server.ts doesn't import the helpers.
export { sql }
