import { eq, gt, and } from 'drizzle-orm'
import type { DB } from '@pingboard/db'
import { sessions, users } from '@pingboard/db'

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

// Session IDs are stored as SHA-256 hashes (same pattern as API tokens), so a
// read of the sessions table doesn't leak live sessions. Hashing happens at
// the boundary — callers always pass and receive the raw cookie value.
function hashSessionId(id: string): string {
  return new Bun.CryptoHasher('sha256').update(id).digest('hex')
}

export async function createSession(db: DB, userId: string): Promise<string> {
  const id = crypto.randomUUID() + '.' + crypto.randomUUID()
  await db.insert(sessions).values({
    id: hashSessionId(id),
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
    .where(
      and(eq(sessions.id, hashSessionId(sessionId)), gt(sessions.expiresAt, new Date())),
    )
    .limit(1)
  return rows[0] ?? null
}

export async function destroySession(db: DB, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashSessionId(sessionId)))
}

export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000
