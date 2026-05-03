import { eq, gt, and } from 'drizzle-orm'
import type { DB } from '@pingboard/db'
import { sessions, users } from '@pingboard/db'

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function createSession(db: DB, userId: string): Promise<string> {
  const id = crypto.randomUUID() + '.' + crypto.randomUUID()
  await db.insert(sessions).values({
    id,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  })
  return id
}

export async function loadSession(
  db: DB,
  sessionId: string | undefined,
): Promise<{ userId: string; email: string } | null> {
  if (!sessionId) return null
  const rows = await db
    .select({
      userId: sessions.userId,
      email: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1)
  return rows[0] ?? null
}

export async function destroySession(db: DB, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId))
}

export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000
