import { and, desc, eq, gte, sql } from 'drizzle-orm'
import type { DB } from '@pingboard/db'
import {
  heartbeats,
  incidents,
  maintenanceWindows,
  monitorChannels,
  monitors,
  notificationChannels,
  statusPageMonitors,
  statusPages,
  type NewMaintenanceWindow,
  type NewMonitor,
  type NewNotificationChannel,
  type NewStatusPage,
} from '@pingboard/db'
import {
  ALLOWED_INTERVALS_SECONDS,
  ALLOWED_MONITOR_TYPES,
  RESERVED_SLUGS,
  type MonitorType,
} from '@pingboard/shared'
import { Scheduler, sendTest, runCheck } from '@pingboard/core'
import { error, json, noContent } from '../lib/responses'
import { revokeTokensForPage } from '../lib/page-auth'
import { checkLimit, isUnlimited } from '../lib/limits'
import type { Mode } from '../config'

type StatusPageRow = typeof statusPages.$inferSelect
type PublicStatusPage = Omit<StatusPageRow, 'passwordHash'> & { passwordSet: boolean }

function publicPage(p: StatusPageRow): PublicStatusPage {
  const { passwordHash, ...rest } = p
  return { ...rest, passwordSet: !!passwordHash }
}

interface AdminDeps {
  db: DB
  scheduler: Scheduler
  mode: Mode
}

// ─────────────────────────── Monitors ───────────────────────────

export async function listMonitors(deps: AdminDeps): Promise<Response> {
  const rows = await deps.db.select().from(monitors)
  // Channel links come along so the UI can answer "who gets paged for this?"
  // — and, more usefully, flag monitors that would page nobody.
  const links = await deps.db.select().from(monitorChannels)
  const byMonitor = new Map<string, string[]>()
  for (const l of links) {
    const list = byMonitor.get(l.monitorId) ?? []
    list.push(l.channelId)
    byMonitor.set(l.monitorId, list)
  }
  const enriched = await Promise.all(
    rows.map(async (m) => {
      const [latest] = await deps.db
        .select()
        .from(heartbeats)
        .where(eq(heartbeats.monitorId, m.id))
        .orderBy(desc(heartbeats.checkedAt))
        .limit(1)
      return { ...m, latest: latest ?? null, channelIds: byMonitor.get(m.id) ?? [] }
    }),
  )
  return json({ monitors: enriched })
}

/**
 * Fleet-wide response times over the last 24h, bucketed to 30 minutes.
 * Feeds the dashboard chart; one aggregate query instead of N per-monitor ones.
 */
export async function heartbeatSummary(deps: AdminDeps): Promise<Response> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const rows = await deps.db
    .select({
      bucket: sql<number>`(cast(${heartbeats.checkedAt} as integer) / 1800000) * 1800000`.as('bucket'),
      avgMs: sql<number | null>`avg(${heartbeats.responseTimeMs})`.as('avg_ms'),
      checks: sql<number>`count(*)`.as('checks'),
      down: sql<number>`sum(case when ${heartbeats.status} = 'down' then 1 else 0 end)`.as('down'),
    })
    .from(heartbeats)
    .where(gte(heartbeats.checkedAt, since))
    .groupBy(sql`bucket`)
    .orderBy(sql`bucket`)
  return json({ buckets: rows })
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

  if (!isUnlimited(deps.mode, 'monitor')) {
    const [row] = await deps.db
      .select({ count: sql<number>`count(*)` })
      .from(monitors)
    const limit = checkLimit(deps.mode, 'monitor', row?.count ?? 0)
    if (!limit.ok) return error(403, limit.reason)
  }

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
    tags: validation.tags,
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
      tags: validation.tags,
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

// One-shot check used by the wizard's "Test now" button. Doesn't persist a
// heartbeat — just runs the relevant checker and returns the raw result so the
// user can confirm their target+config before saving the monitor.
export async function runMonitorCheck(
  req: Request,
  _deps: AdminDeps,
): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')

  // Push monitors don't run on demand — they're waited on.
  if (body.type === 'push') {
    return error(400, 'Push monitors cannot be tested with run-once')
  }

  // Synthesize the minimum Monitor shape that checkers need. We DO NOT touch
  // the database, so transient fields like id/createdAt are stubbed.
  const validation = validateMonitorPayload({
    name: body.name ?? 'Test',
    type: body.type,
    target: body.target,
    intervalSeconds: 60,
    timeoutSeconds: typeof body.timeoutSeconds === 'number' ? body.timeoutSeconds : 10,
    retryCount: 0,
    config: body.config ?? {},
    tags: [],
  })
  if ('error' in validation) return error(400, validation.error)

  const monitor = {
    id: 'test-run',
    name: validation.name,
    type: validation.type,
    target: validation.target,
    intervalSeconds: validation.intervalSeconds,
    timeoutSeconds: validation.timeoutSeconds,
    retryCount: validation.retryCount,
    config: validation.config,
    tags: validation.tags,
    paused: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Parameters<typeof runCheck>[0]

  const result = await runCheck(monitor)
  return json({ result })
}

// ───────────────────── Notification channels ─────────────────────

export async function listChannels(deps: AdminDeps): Promise<Response> {
  const rows = await deps.db.select().from(notificationChannels)
  return json({ channels: rows })
}

export async function createChannel(req: Request, deps: AdminDeps): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')

  const name = String(body.name ?? '').trim()
  const type = body.type as string
  if (!name) return error(400, 'Name required')
  if (!['email', 'webhook', 'discord', 'slack', 'ntfy'].includes(type)) {
    return error(400, 'Invalid channel type')
  }
  const cfg = validateChannelConfig(type, body.config)
  if ('error' in cfg) return error(400, cfg.error)

  const id = crypto.randomUUID()
  await deps.db.insert(notificationChannels).values({
    id,
    name,
    type: type as NewNotificationChannel['type'],
    config: cfg.value as unknown as NewNotificationChannel['config'],
    enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
  })
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

  const [existing] = await deps.db
    .select()
    .from(notificationChannels)
    .where(eq(notificationChannels.id, id))
  if (!existing) return error(404, 'Channel not found')

  const name = body.name == null ? existing.name : String(body.name).trim()
  if (!name) return error(400, 'Name required')

  // Type is immutable in update — re-validate config against the stored type.
  const incomingConfig = 'config' in body ? body.config : existing.config
  const cfg = validateChannelConfig(existing.type, incomingConfig)
  if ('error' in cfg) return error(400, cfg.error)

  await deps.db
    .update(notificationChannels)
    .set({
      name,
      config: cfg.value as unknown as NewNotificationChannel['config'],
      enabled: typeof body.enabled === 'boolean' ? body.enabled : existing.enabled,
    })
    .where(eq(notificationChannels.id, id))
  const [updated] = await deps.db
    .select()
    .from(notificationChannels)
    .where(eq(notificationChannels.id, id))
  return json({ channel: updated })
}

function validateChannelConfig(
  type: string,
  raw: unknown,
): { value: Record<string, unknown> } | { error: string } {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'config must be an object' }
  }
  const c = raw as Record<string, unknown>
  if (type === 'webhook') {
    if (typeof c.url !== 'string' || !c.url.trim()) {
      return { error: 'webhook config requires a URL' }
    }
    return { value: c }
  }
  if (type === 'discord' || type === 'slack') {
    if (typeof c.webhookUrl !== 'string' || !c.webhookUrl.trim()) {
      return { error: `${type} config requires a webhookUrl` }
    }
    return { value: c }
  }
  if (type === 'ntfy') {
    if (typeof c.serverUrl !== 'string' || !c.serverUrl.trim()) {
      return { error: 'ntfy config requires a serverUrl' }
    }
    if (typeof c.topic !== 'string' || !c.topic.trim()) {
      return { error: 'ntfy config requires a topic' }
    }
    return { value: c }
  }
  if (type === 'email') {
    if (typeof c.to !== 'string' || !c.to.trim()) {
      return { error: 'email config requires a recipient address' }
    }
    return { value: c }
  }
  return { error: `Unknown channel type: ${type}` }
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
  // Monitor counts per page: the list is meaningless without knowing whether
  // a page actually shows anything.
  const links = await deps.db.select().from(statusPageMonitors)
  const counts = new Map<string, number>()
  for (const l of links) {
    counts.set(l.statusPageId, (counts.get(l.statusPageId) ?? 0) + 1)
  }
  return json({
    pages: rows.map((r) => ({
      ...publicPage(r),
      monitorCount: counts.get(r.id) ?? 0,
    })),
  })
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

  if (!isUnlimited(deps.mode, 'status_page')) {
    const [row] = await deps.db
      .select({ count: sql<number>`count(*)` })
      .from(statusPages)
    const limit = checkLimit(deps.mode, 'status_page', row?.count ?? 0)
    if (!limit.ok) return error(403, limit.reason)
  }

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

// ─────────────────────── Maintenance windows ────────────────────────

export async function listMaintenanceWindows(
  req: Request,
  deps: AdminDeps,
): Promise<Response> {
  const url = new URL(req.url)
  const monitorId = url.searchParams.get('monitorId')
  // Join the monitor name so the index page doesn't need a second roundtrip.
  // The single-monitor case keeps the legacy shape since that view already
  // knows the monitor name from its own query.
  if (monitorId) {
    const rows = await deps.db
      .select()
      .from(maintenanceWindows)
      .where(eq(maintenanceWindows.monitorId, monitorId))
      .orderBy(desc(maintenanceWindows.startsAt))
    return json({ windows: rows })
  }
  const rows = await deps.db
    .select({
      id: maintenanceWindows.id,
      monitorId: maintenanceWindows.monitorId,
      title: maintenanceWindows.title,
      description: maintenanceWindows.description,
      startsAt: maintenanceWindows.startsAt,
      endsAt: maintenanceWindows.endsAt,
      monitorName: monitors.name,
    })
    .from(maintenanceWindows)
    .innerJoin(monitors, eq(monitors.id, maintenanceWindows.monitorId))
    .orderBy(desc(maintenanceWindows.startsAt))
  return json({ windows: rows })
}

export async function createMaintenanceWindow(
  req: Request,
  deps: AdminDeps,
): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')
  const validation = validateMaintenanceWindowPayload(body)
  if ('error' in validation) return error(400, validation.error)

  const [monitor] = await deps.db
    .select({ id: monitors.id })
    .from(monitors)
    .where(eq(monitors.id, validation.monitorId))
  if (!monitor) return error(404, 'Monitor not found')

  const id = crypto.randomUUID()
  const window: NewMaintenanceWindow = {
    id,
    monitorId: validation.monitorId,
    title: validation.title,
    description: validation.description,
    startsAt: validation.startsAt,
    endsAt: validation.endsAt,
  }
  await deps.db.insert(maintenanceWindows).values(window)
  const [created] = await deps.db
    .select()
    .from(maintenanceWindows)
    .where(eq(maintenanceWindows.id, id))
  return json({ window: created }, { status: 201 })
}

export async function updateMaintenanceWindow(
  id: string,
  req: Request,
  deps: AdminDeps,
): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')
  const [existing] = await deps.db
    .select()
    .from(maintenanceWindows)
    .where(eq(maintenanceWindows.id, id))
  if (!existing) return error(404, 'Maintenance window not found')

  const merged = {
    monitorId: existing.monitorId,
    title: existing.title,
    description: existing.description,
    startsAt: existing.startsAt.toISOString(),
    endsAt: existing.endsAt.toISOString(),
    ...body,
  }
  const validation = validateMaintenanceWindowPayload(merged)
  if ('error' in validation) return error(400, validation.error)

  await deps.db
    .update(maintenanceWindows)
    .set({
      title: validation.title,
      description: validation.description,
      startsAt: validation.startsAt,
      endsAt: validation.endsAt,
    })
    .where(eq(maintenanceWindows.id, id))
  const [updated] = await deps.db
    .select()
    .from(maintenanceWindows)
    .where(eq(maintenanceWindows.id, id))
  return json({ window: updated })
}

export async function deleteMaintenanceWindow(
  id: string,
  deps: AdminDeps,
): Promise<Response> {
  await deps.db.delete(maintenanceWindows).where(eq(maintenanceWindows.id, id))
  return noContent()
}

function validateMaintenanceWindowPayload(body: Record<string, unknown>):
  | { error: string }
  | {
      monitorId: string
      title: string
      description: string | null
      startsAt: Date
      endsAt: Date
    } {
  const monitorId = String(body.monitorId ?? '').trim()
  const title = String(body.title ?? '').trim()
  const description =
    typeof body.description === 'string' && body.description.trim()
      ? body.description.trim()
      : null
  if (!monitorId) return { error: 'monitorId required' }
  if (!title) return { error: 'title required' }
  if (title.length > 200) return { error: 'title must be 200 characters or fewer' }

  const startsAt = parseDate(body.startsAt)
  const endsAt = parseDate(body.endsAt)
  if (!startsAt) return { error: 'startsAt must be an ISO date' }
  if (!endsAt) return { error: 'endsAt must be an ISO date' }
  if (endsAt.getTime() <= startsAt.getTime()) {
    return { error: 'endsAt must be after startsAt' }
  }

  return { monitorId, title, description, startsAt, endsAt }
}

function parseDate(input: unknown): Date | null {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input
  if (typeof input === 'string') {
    const d = new Date(input)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof input === 'number') {
    const d = new Date(input)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

// ─────────────────────── Helpers ───────────────────────

function validateMonitorPayload(body: Record<string, unknown>):
  | { error: string }
  | {
      name: string
      type: MonitorType
      target: string
      intervalSeconds: number
      timeoutSeconds: number
      retryCount: number
      config: Record<string, unknown>
      tags: string[]
    } {
  const name = String(body.name ?? '').trim()
  const type = String(body.type ?? '') as MonitorType
  const target = String(body.target ?? '').trim()
  const intervalSeconds = Number(body.intervalSeconds ?? 60)
  const timeoutSeconds = Number(body.timeoutSeconds ?? 10)
  const retryCount = Number(body.retryCount ?? 1)
  const config = (body.config as Record<string, unknown> | undefined) ?? {}
  const tagsResult = normalizeTags(body.tags)
  if ('error' in tagsResult) return tagsResult

  if (!name) return { error: 'Name required' }
  if (name.length > 200) return { error: 'Name must be 200 characters or fewer' }
  if (!(ALLOWED_MONITOR_TYPES as readonly string[]).includes(type)) {
    return { error: 'Invalid monitor type' }
  }
  if (!target) return { error: 'Target required' }
  if (target.length > 2048) return { error: 'Target must be 2048 characters or fewer' }
  if (!(ALLOWED_INTERVALS_SECONDS as readonly number[]).includes(intervalSeconds)) {
    return { error: `interval must be one of ${ALLOWED_INTERVALS_SECONDS.join(', ')}` }
  }
  if (timeoutSeconds < 1 || timeoutSeconds > 60) {
    return { error: 'timeout must be between 1 and 60 seconds' }
  }
  if (retryCount < 0 || retryCount > 5) {
    return { error: 'retryCount must be between 0 and 5' }
  }

  // Push monitors need a server-generated token; preserve any existing token
  // on update, otherwise mint a fresh one.
  if (type === 'push' && typeof config.token !== 'string') {
    config.token = generatePushToken()
  }

  return {
    name,
    type,
    target,
    intervalSeconds,
    timeoutSeconds,
    retryCount,
    config,
    tags: tagsResult.value,
  }
}

function generatePushToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function normalizeTags(input: unknown): { value: string[] } | { error: string } {
  if (input == null) return { value: [] }
  if (!Array.isArray(input)) return { error: 'tags must be an array of strings' }
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of input) {
    if (typeof raw !== 'string') return { error: 'tags must be an array of strings' }
    const trimmed = raw.trim().toLowerCase()
    if (!trimmed) continue
    if (trimmed.length > 32) return { error: 'tags must be 32 characters or fewer' }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(trimmed)) {
      return { error: `Invalid tag "${trimmed}" — use lowercase letters, digits, and hyphens` }
    }
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  if (out.length > 16) return { error: 'a monitor can have at most 16 tags' }
  return { value: out }
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
