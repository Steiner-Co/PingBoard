/**
 * Baseline security headers applied to every response at the server edge.
 * CSP only goes on HTML shells — API/SSE/asset responses don't need it, and
 * routes that set their own CSP (e.g. script-killing on SVG logos) keep it.
 *
 * script-src/style-src keep 'unsafe-inline': the public shell bootstraps the
 * theme with an inline script and admin-supplied customCss ships in a <style>
 * tag. Tightening that means nonces — deferred.
 */
const HTML_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ')

export function withSecurityHeaders(res: Response): Response {
  const headers = new Headers(res.headers)
  headers.set('x-content-type-options', 'nosniff')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  headers.set('x-frame-options', 'DENY')
  if (
    (headers.get('content-type') ?? '').includes('text/html') &&
    !headers.has('content-security-policy')
  ) {
    headers.set('content-security-policy', HTML_CSP)
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  })
}
