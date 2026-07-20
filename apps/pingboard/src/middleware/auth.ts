import { users, type DB } from '@pingboard/db'
import { loadSession } from '../lib/sessions'
import { parseCookies } from '../lib/cookies'
import { error } from '../lib/responses'
import { SESSION_COOKIE_NAME } from '../routes/auth'
import { bearerFromRequest, verifyApiToken } from '../lib/api-tokens'

export interface AuthedUser {
  userId: string
  email: string
  /** Set when the request authenticated with an API token rather than a session. */
  tokenId?: string
  tokenName?: string
}

export type AuthResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; response: Response }

export async function requireAuth(req: Request, db: DB): Promise<AuthResult> {
  // Bearer first: an explicit Authorization header is an unambiguous signal,
  // and it lets a browser session and a token coexist on the same origin.
  const bearer = bearerFromRequest(req)
  if (bearer) {
    const token = await verifyApiToken(db, bearer)
    if (!token) return { ok: false, response: error(401, 'Invalid API token') }
    // Single-admin model: a token acts as the admin account.
    const [admin] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .orderBy(users.createdAt)
      .limit(1)
    if (!admin) return { ok: false, response: error(401, 'Unauthorized') }
    return {
      ok: true,
      user: {
        userId: admin.id,
        email: admin.email,
        tokenId: token.id,
        tokenName: token.name,
      },
    }
  }

  const cookies = parseCookies(req.headers.get('cookie'))
  const session = await loadSession(db, cookies[SESSION_COOKIE_NAME])
  if (!session) {
    return { ok: false, response: error(401, 'Unauthorized') }
  }
  return { ok: true, user: session }
}
