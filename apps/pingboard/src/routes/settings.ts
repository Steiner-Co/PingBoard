import { eq, sql } from 'drizzle-orm'
import { statSync } from 'node:fs'
import {
  heartbeats,
  monitors,
  notificationChannels,
  statusPages,
  getRetentionDays,
  getSmtpDefaults,
  setRetentionDays,
  setSmtpDefaults,
  users,
  type DB,
  type SmtpDefaults,
} from '@pingboard/db'
import { ALLOWED_RETENTION_DAYS } from '@pingboard/shared'
import { error, json, noContent } from '../lib/responses'

interface SettingsDeps {
  db: DB
}

interface InstanceDeps {
  db: DB
  dbPath: string
  dataDir: string
  version: string
  startedAt: number
}

/**
 * Facts a self-hoster actually needs and can't get from the UI otherwise:
 * how large the database has grown, how far back raw history reaches, and
 * whether retention is doing its job. Sits next to the retention setting.
 */
export async function getInstanceInfo(deps: InstanceDeps): Promise<Response> {
  const [hb] = await deps.db
    .select({
      total: sql<number>`count(*)`.as('total'),
      oldest: sql<number | null>`min(${heartbeats.checkedAt})`.as('oldest'),
    })
    .from(heartbeats)
  const [mon] = await deps.db
    .select({ total: sql<number>`count(*)`.as('total') })
    .from(monitors)
  const [ch] = await deps.db
    .select({ total: sql<number>`count(*)`.as('total') })
    .from(notificationChannels)
  const [pg] = await deps.db
    .select({ total: sql<number>`count(*)`.as('total') })
    .from(statusPages)

  let dbBytes: number | null = null
  try {
    // Include the WAL — on a busy instance it's a real share of disk use.
    dbBytes = statSync(deps.dbPath).size
    try {
      dbBytes += statSync(`${deps.dbPath}-wal`).size
    } catch {
      // No WAL file yet; the main file alone is the honest number.
    }
  } catch {
    dbBytes = null
  }

  return json({
    version: deps.version,
    dataDir: deps.dataDir,
    dbBytes,
    startedAt: new Date(deps.startedAt).toISOString(),
    heartbeats: hb?.total ?? 0,
    oldestHeartbeat: hb?.oldest ? new Date(hb.oldest).toISOString() : null,
    monitors: mon?.total ?? 0,
    channels: ch?.total ?? 0,
    statusPages: pg?.total ?? 0,
  })
}

interface AccountDeps {
  db: DB
  userId: string
}

// Never returned to the client.
const REDACTED = '__set__'

function publicSmtp(s: SmtpDefaults): Omit<SmtpDefaults, 'pass'> & {
  passwordSet: boolean
} {
  const { pass: _pass, ...rest } = s
  return { ...rest, passwordSet: !!s.pass }
}

export async function getSettings(deps: SettingsDeps): Promise<Response> {
  const [retentionDays, smtp] = await Promise.all([
    getRetentionDays(deps.db),
    getSmtpDefaults(deps.db),
  ])
  return json({ retentionDays, smtp: publicSmtp(smtp) })
}

export async function updateSettings(
  req: Request,
  deps: SettingsDeps,
): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')

  if (body.retentionDays != null) {
    const days = Number(body.retentionDays)
    if (!(ALLOWED_RETENTION_DAYS as readonly number[]).includes(days)) {
      return error(
        400,
        `retentionDays must be one of ${ALLOWED_RETENTION_DAYS.join(', ')}`,
      )
    }
    await setRetentionDays(deps.db, days)
  }

  if (body.smtp && typeof body.smtp === 'object') {
    const incoming = body.smtp as Partial<SmtpDefaults> & { pass?: string | null }
    const patch: Partial<SmtpDefaults> = {}
    if ('host' in incoming) patch.host = nonEmpty(incoming.host)
    if ('port' in incoming) {
      const n = incoming.port == null ? null : Number(incoming.port)
      patch.port = n != null && Number.isFinite(n) && n > 0 ? n : null
    }
    if ('user' in incoming) patch.user = nonEmpty(incoming.user)
    if ('from' in incoming) patch.from = nonEmpty(incoming.from)
    if ('secure' in incoming) {
      patch.secure = incoming.secure == null ? null : !!incoming.secure
    }
    // Treat the redacted sentinel as "leave password as-is"; an explicit
    // empty string clears it.
    if ('pass' in incoming && incoming.pass !== REDACTED) {
      patch.pass = nonEmpty(incoming.pass)
    }
    await setSmtpDefaults(deps.db, patch)
  }

  return getSettings(deps)
}

export async function changePassword(
  req: Request,
  deps: AccountDeps,
): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')

  const currentPassword = String(body.currentPassword ?? '')
  const newPassword = String(body.newPassword ?? '')
  if (!currentPassword || !newPassword) {
    return error(400, 'currentPassword and newPassword required')
  }
  if (newPassword.length < 8) {
    return error(400, 'New password must be at least 8 characters')
  }
  if (newPassword === currentPassword) {
    return error(400, 'New password must differ from current password')
  }

  const [user] = await deps.db.select().from(users).where(eq(users.id, deps.userId))
  if (!user) return error(404, 'User not found')

  const ok = await Bun.password.verify(currentPassword, user.passwordHash)
  if (!ok) return error(401, 'Current password is incorrect')

  const passwordHash = await Bun.password.hash(newPassword)
  await deps.db.update(users).set({ passwordHash }).where(eq(users.id, deps.userId))
  return noContent()
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

async function safeJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>
  } catch {
    return null
  }
}
