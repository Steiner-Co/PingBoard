import { eq, sql } from 'drizzle-orm'
import type { DB } from '@pingboard/db'
import { users } from '@pingboard/db'
import {
  createSession,
  destroySession,
  SESSION_TTL_SECONDS,
} from '../lib/sessions'
import { error, json, noContent } from '../lib/responses'
import { parseCookies, serializeCookie } from '../lib/cookies'

const SESSION_COOKIE = 'pb_session'

interface AuthDeps {
  db: DB
  secureCookies: boolean
}

export async function handleSetup(req: Request, deps: AuthDeps): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')

  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  if (!email || !password) return error(400, 'Email and password required')
  if (password.length < 8) return error(400, 'Password must be at least 8 characters')

  const existing = await deps.db.select({ count: sql<number>`count(*)` }).from(users)
  if ((existing[0]?.count ?? 0) > 0) {
    return error(403, 'Setup already completed')
  }

  const passwordHash = await Bun.password.hash(password)
  const id = crypto.randomUUID()
  await deps.db.insert(users).values({ id, email, passwordHash, role: 'admin' })

  const sessionId = await createSession(deps.db, id)
  return json(
    { ok: true, user: { id, email } },
    { headers: { 'set-cookie': sessionCookie(sessionId, deps.secureCookies) } },
  )
}

export async function handleLogin(req: Request, deps: AuthDeps): Promise<Response> {
  const body = await safeJson(req)
  if (!body) return error(400, 'Invalid JSON body')

  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  if (!email || !password) return error(400, 'Email and password required')

  const [user] = await deps.db.select().from(users).where(eq(users.email, email))
  if (!user) return error(401, 'Invalid credentials')

  const ok = await Bun.password.verify(password, user.passwordHash)
  if (!ok) return error(401, 'Invalid credentials')

  const sessionId = await createSession(deps.db, user.id)
  return json(
    { ok: true, user: { id: user.id, email: user.email } },
    { headers: { 'set-cookie': sessionCookie(sessionId, deps.secureCookies) } },
  )
}

export async function handleLogout(req: Request, deps: AuthDeps): Promise<Response> {
  const cookies = parseCookies(req.headers.get('cookie'))
  const sessionId = cookies[SESSION_COOKIE]
  if (sessionId) await destroySession(deps.db, sessionId)
  return noContent({ 'set-cookie': clearSessionCookie(deps.secureCookies) })
}

export async function handleSetupStatus(deps: AuthDeps): Promise<Response> {
  const result = await deps.db.select({ count: sql<number>`count(*)` }).from(users)
  return json({ setupComplete: (result[0]?.count ?? 0) > 0 })
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE

function sessionCookie(sessionId: string, secure: boolean): string {
  return serializeCookie(SESSION_COOKIE, sessionId, {
    maxAge: SESSION_TTL_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    secure,
  })
}

function clearSessionCookie(secure: boolean): string {
  return serializeCookie(SESSION_COOKIE, '', {
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure,
  })
}

async function safeJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>
  } catch {
    return null
  }
}
