import { eq } from 'drizzle-orm'
import { apiTokens, type DB } from '@pingboard/db'

/**
 * Recognisable prefix: it tells a user what they've found in a config file,
 * and lets secret scanners match on it.
 */
const TOKEN_PREFIX = 'pb_'
const RANDOM_BYTES = 32
/** Characters kept in clear for identifying a token after its one reveal. */
const DISPLAY_PREFIX_LENGTH = TOKEN_PREFIX.length + 6
/** Don't write to the DB on every request just to move a timestamp. */
const LAST_USED_THROTTLE_MS = 60_000

export interface GeneratedToken {
  /** Full secret. Returned once, at creation, and never stored. */
  token: string
  hash: string
  prefix: string
}

export function generateApiToken(): GeneratedToken {
  const bytes = new Uint8Array(RANDOM_BYTES)
  crypto.getRandomValues(bytes)
  // base64url so the token is copy-paste safe in headers, URLs and YAML.
  const body = Buffer.from(bytes)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
  const token = TOKEN_PREFIX + body
  return {
    token,
    hash: hashApiToken(token),
    prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
  }
}

export function hashApiToken(token: string): string {
  return new Bun.CryptoHasher('sha256').update(token).digest('hex')
}

/** Reads a bearer token from the Authorization header, if present. */
export function bearerFromRequest(req: Request): string | null {
  const header = req.headers.get('authorization')
  if (!header) return null
  const [scheme, ...rest] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer') return null
  const value = rest.join(' ').trim()
  return value.length > 0 ? value : null
}

export interface VerifiedToken {
  id: string
  name: string
}

/**
 * Looks up a token by hash. Returns null when it doesn't match, so callers
 * can fall through to cookie auth.
 */
export async function verifyApiToken(
  db: DB,
  token: string,
): Promise<VerifiedToken | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null
  const hash = hashApiToken(token)
  const [row] = await db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      lastUsedAt: apiTokens.lastUsedAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, hash))
    .limit(1)
  if (!row) return null

  const now = Date.now()
  const last = row.lastUsedAt?.getTime() ?? 0
  if (now - last > LAST_USED_THROTTLE_MS) {
    await db
      .update(apiTokens)
      .set({ lastUsedAt: new Date(now) })
      .where(eq(apiTokens.id, row.id))
  }

  return { id: row.id, name: row.name }
}
