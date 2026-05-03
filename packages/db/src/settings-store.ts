import { eq } from 'drizzle-orm'
import { DEFAULT_RETENTION_DAYS } from '@pingboard/shared'
import type { DB } from './client'
import { settings } from './schema'

export interface SmtpDefaults {
  host: string | null
  port: number | null
  user: string | null
  pass: string | null
  from: string | null
  secure: boolean | null
}

const KEY_RETENTION_DAYS = 'retention_days'
const KEY_SMTP_DEFAULTS = 'smtp_defaults'

const EMPTY_SMTP: SmtpDefaults = {
  host: null,
  port: null,
  user: null,
  pass: null,
  from: null,
  secure: null,
}

async function readRaw(db: DB, key: string): Promise<string | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key))
  return row?.value ?? null
}

async function writeRaw(db: DB, key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
}

export async function getRetentionDays(db: DB): Promise<number> {
  const raw = await readRaw(db, KEY_RETENTION_DAYS)
  if (!raw) return DEFAULT_RETENTION_DAYS
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RETENTION_DAYS
}

export async function setRetentionDays(db: DB, days: number): Promise<void> {
  await writeRaw(db, KEY_RETENTION_DAYS, String(days))
}

export async function getSmtpDefaults(db: DB): Promise<SmtpDefaults> {
  const raw = await readRaw(db, KEY_SMTP_DEFAULTS)
  if (!raw) return { ...EMPTY_SMTP }
  try {
    const parsed = JSON.parse(raw) as Partial<SmtpDefaults>
    return { ...EMPTY_SMTP, ...parsed }
  } catch {
    return { ...EMPTY_SMTP }
  }
}

export async function setSmtpDefaults(
  db: DB,
  partial: Partial<SmtpDefaults>,
): Promise<SmtpDefaults> {
  const current = await getSmtpDefaults(db)
  const merged: SmtpDefaults = { ...current, ...partial }
  await writeRaw(db, KEY_SMTP_DEFAULTS, JSON.stringify(merged))
  return merged
}
