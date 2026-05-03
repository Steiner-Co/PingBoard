import type { DB } from '@pingboard/db'
import { loadSession } from '../lib/sessions'
import { parseCookies } from '../lib/cookies'
import { error } from '../lib/responses'
import { SESSION_COOKIE_NAME } from '../routes/auth'

export interface AuthedRequest extends Request {
  user: { userId: string; email: string }
}

export async function requireAuth(
  req: Request,
  db: DB,
): Promise<{ ok: true; user: { userId: string; email: string } } | { ok: false; response: Response }> {
  const cookies = parseCookies(req.headers.get('cookie'))
  const session = await loadSession(db, cookies[SESSION_COOKIE_NAME])
  if (!session) {
    return { ok: false, response: error(401, 'Unauthorized') }
  }
  return { ok: true, user: session }
}
