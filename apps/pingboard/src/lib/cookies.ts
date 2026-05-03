export interface CookieOptions {
  maxAge?: number
  path?: string
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {}
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const idx = part.indexOf('=')
    if (idx === -1) return acc
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (key) acc[key] = decodeURIComponent(value)
    return acc
  }, {})
}

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  parts.push(`Path=${options.path ?? '/'}`)
  if (options.httpOnly !== false) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  parts.push(`SameSite=${capitalize(options.sameSite ?? 'lax')}`)
  return parts.join('; ')
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
