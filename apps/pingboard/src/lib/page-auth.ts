/**
 * Cookie-based access tokens for password-protected status pages.
 *
 * Tokens live in process memory only — server restart forces a re-entry,
 * which is fine for v1 (single-process deployment, password gate is for
 * casual privacy, not a security boundary).
 */

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const TOKEN_COOKIE_PREFIX = 'pb_page_'

interface TokenRecord {
  pageId: string
  expiresAt: number
}

const tokens = new Map<string, TokenRecord>()

export function issueToken(pageId: string): string {
  const token = crypto.randomUUID() + '.' + crypto.randomUUID()
  tokens.set(token, { pageId, expiresAt: Date.now() + TOKEN_TTL_MS })
  return token
}

export function verifyToken(pageId: string, token: string | undefined): boolean {
  if (!token) return false
  const record = tokens.get(token)
  if (!record) return false
  if (record.pageId !== pageId) return false
  if (record.expiresAt < Date.now()) {
    tokens.delete(token)
    return false
  }
  return true
}

export function revokeTokensForPage(pageId: string): void {
  for (const [token, record] of tokens) {
    if (record.pageId === pageId) tokens.delete(token)
  }
}

export function pageCookieName(pageId: string): string {
  return TOKEN_COOKIE_PREFIX + pageId
}
