import * as net from 'node:net'
import type { CheckResult, DomainMonitorConfig } from '@pingboard/shared'
import {
  DOMAIN_DEFAULT_CRITICAL_DAYS,
  DOMAIN_DEFAULT_WARNING_DAYS,
} from '@pingboard/shared'
import type { Monitor } from '@pingboard/db'

const DAY_MS = 24 * 60 * 60 * 1000
const IANA_WHOIS = 'whois.iana.org'

export async function checkDomain(monitor: Monitor): Promise<CheckResult> {
  const config = (monitor.config ?? {}) as DomainMonitorConfig
  const warningDays = config.warningDays ?? DOMAIN_DEFAULT_WARNING_DAYS
  const criticalDays = config.criticalDays ?? DOMAIN_DEFAULT_CRITICAL_DAYS
  const domain = normalizeDomain(monitor.target)

  if (!domain) {
    return done('down', null, 'Invalid target — expected a domain')
  }

  const startedAt = performance.now()
  const totalTimeoutMs = monitor.timeoutSeconds * 1000

  try {
    // Two hops: IANA → registry-specific server.
    const ianaResponse = await whoisQuery(IANA_WHOIS, domain, totalTimeoutMs)
    const referMatch = ianaResponse.match(/refer:\s*(\S+)/i)
    const authoritative = referMatch?.[1]
    if (!authoritative) {
      return done(
        'degraded',
        Math.round(performance.now() - startedAt),
        `IANA did not return an authoritative WHOIS server for ${domain}`,
      )
    }

    const remainingMs = Math.max(
      1000,
      totalTimeoutMs - (performance.now() - startedAt),
    )
    const registryResponse = await whoisQuery(authoritative, domain, remainingMs)
    const responseTimeMs = Math.round(performance.now() - startedAt)

    const expiry = parseExpiry(registryResponse)
    if (!expiry) {
      return done(
        'degraded',
        responseTimeMs,
        'Could not parse expiry date from WHOIS response',
      )
    }

    const daysRemaining = Math.floor((expiry.getTime() - Date.now()) / DAY_MS)
    return resolveStatus(daysRemaining, warningDays, criticalDays, responseTimeMs)
  } catch (err) {
    const responseTimeMs = Math.round(performance.now() - startedAt)
    const message = err instanceof Error ? err.message : String(err)
    return done('down', responseTimeMs, message)
  }
}

function resolveStatus(
  days: number,
  warningDays: number,
  criticalDays: number,
  responseTimeMs: number,
): CheckResult {
  if (days <= criticalDays) {
    return done('down', responseTimeMs, `${days} day(s) until domain expiry`)
  }
  if (days <= warningDays) {
    return done('degraded', responseTimeMs, `${days} day(s) until domain expiry`)
  }
  return done('up', responseTimeMs, `${days} day(s) until domain expiry`)
}

function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null
  // Strip protocol and path if user pasted a URL
  try {
    const url = new URL(/^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`)
    return url.hostname.replace(/^www\./, '') || null
  } catch {
    return null
  }
}

function whoisQuery(
  server: string,
  domain: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const socket = net.createConnection({ host: server, port: 43 }, () => {
      socket.write(`${domain}\r\n`)
    })

    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error(`WHOIS timeout to ${server} after ${timeoutMs}ms`))
    }, timeoutMs)

    socket.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    })
    socket.on('end', () => {
      clearTimeout(timer)
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    socket.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

// Registry responses vary by TLD. These patterns cover the common ones we
// care about (.com/.net/.org, ccTLDs popular with indie hackers like .io,
// .dev, .app, .co, .xyz, .so, .ai, .me) and gracefully fall through.
const EXPIRY_PATTERNS = [
  /Registry Expiry Date:\s*(\S+)/i,
  /Registrar Registration Expiration Date:\s*(\S+)/i,
  /Expiration Date:\s*(\S+)/i,
  /Expiry Date:\s*(\S+)/i,
  /paid-till:\s*(\S+)/i,
  /expires:\s*(.+)/i, // .me, .io variants
  /Expires On\s*:\s*(.+)/i,
  /Domain Expiration Date:\s*(.+)/i,
]

export function parseExpiry(whoisText: string): Date | null {
  for (const re of EXPIRY_PATTERNS) {
    const match = whoisText.match(re)
    if (match?.[1]) {
      const raw = match[1].trim()
      const parsed = new Date(raw)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }
  }
  return null
}

function done(
  status: CheckResult['status'],
  responseTimeMs: number | null,
  message: string | null,
): CheckResult {
  return {
    status,
    responseTimeMs,
    statusCode: null,
    message,
    checkedAt: new Date(),
  }
}
