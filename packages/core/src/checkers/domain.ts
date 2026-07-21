import * as net from 'node:net'
import * as dns from 'node:dns/promises'
import * as tls from 'node:tls'
import type {
  CheckResult,
  DomainFacts,
  DomainMonitorConfig,
} from '@pingboard/shared'
import {
  DOMAIN_DEFAULT_CRITICAL_DAYS,
  DOMAIN_DEFAULT_WARNING_DAYS,
} from '@pingboard/shared'
import type { Monitor } from '@pingboard/db'

const DAY_MS = 24 * 60 * 60 * 1000
const IANA_WHOIS = 'whois.iana.org'
/** Cap the DNS + SSL enrichment so it never dominates the check. */
const ENRICH_MAX_MS = 8000

// Registration facts from RDAP or WHOIS. `source` records which answered so we
// can tell "no data" apart from "not looked up yet".
export interface Registration {
  expiryAt: Date | null
  registeredAt: Date | null
  registrar: string | null
  nameservers: string[]
  statuses: string[]
  source: 'rdap' | 'whois' | null
  error: string | null
}

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
  const enrichBudget = Math.min(totalTimeoutMs, ENRICH_MAX_MS)

  // DNS + SSL enrichment run in parallel with the registration lookup; both are
  // best-effort and never fail the check — a portfolio still wants records and
  // cert state even when RDAP/WHOIS is unreachable.
  const dnsPromise = resolveDns(domain, enrichBudget)
  const sslPromise = fetchSslInfo(domain, enrichBudget)

  const reg = await lookupRegistration(domain, totalTimeoutMs)
  const [dnsRecords, ssl] = await Promise.all([dnsPromise, sslPromise])
  const responseTimeMs = Math.round(performance.now() - startedAt)

  // Manual entry fills the gap when RDAP/WHOIS can't determine the facts (ccTLDs
  // without RDAP, private domains). Auto-detected values are authoritative and
  // always win; the manual date is only used when detection came up empty.
  const manualExpiry = parseIsoDate(config.manualExpiryAt)
  const expiryAt = reg.expiryAt ?? manualExpiry
  const expiryIsManual = !reg.expiryAt && manualExpiry !== null

  const facts: DomainFacts = {
    expiryAt,
    registeredAt: reg.registeredAt ?? parseIsoDate(config.manualRegisteredAt),
    registrar: reg.registrar ?? config.manualRegistrar ?? null,
    // Prefer the registry's authoritative nameservers; fall back to live DNS.
    nameservers: reg.nameservers.length ? reg.nameservers : (dnsRecords?.ns ?? []),
    statuses: reg.statuses,
    dns: dnsRecords,
    ssl,
  }

  // Expiry drives status. With neither a detected nor a manual date we couldn't
  // *verify* it — so degrade (amber) rather than fire a false expiry incident.
  // Only a real, near-expiry date escalates to `down`.
  if (!expiryAt) {
    const why = reg.error ?? 'no registration data available'
    return withFacts(
      done(
        'degraded',
        responseTimeMs,
        `Couldn't verify expiry — ${why}. Add a renewal date manually.`,
      ),
      facts,
    )
  }

  const daysRemaining = Math.floor((expiryAt.getTime() - Date.now()) / DAY_MS)
  const result = resolveStatus(
    daysRemaining,
    warningDays,
    criticalDays,
    responseTimeMs,
  )
  if (expiryIsManual && result.message) {
    result.message = `${result.message} (entered manually)`
  }
  return withFacts(result, facts)
}

function parseIsoDate(value: string | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function withFacts(result: CheckResult, facts: DomainFacts): CheckResult {
  return { ...result, facts }
}

// RDAP first (structured JSON over HTTPS — the ICANN-mandated successor to
// WHOIS), falling back to WHOIS (port 43, free-text) for the ccTLDs that don't
// publish RDAP yet.
async function lookupRegistration(
  domain: string,
  totalTimeoutMs: number,
): Promise<Registration> {
  const startedAt = performance.now()
  let lastError: string | null = null

  try {
    const rdap = await rdapLookup(domain, Math.min(totalTimeoutMs, 8000))
    if (rdap && rdap.expiryAt) return rdap
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err)
  }

  const remaining = Math.max(1500, totalTimeoutMs - (performance.now() - startedAt))
  try {
    const whois = await whoisLookup(domain, remaining)
    if (whois.expiryAt || whois.registrar) return whois
    lastError = 'RDAP and WHOIS returned no expiry'
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err)
  }

  return {
    expiryAt: null,
    registeredAt: null,
    registrar: null,
    nameservers: [],
    statuses: [],
    source: null,
    error: lastError,
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

// ─────────────────────────── RDAP (primary) ───────────────────────────
// The IANA bootstrap maps each TLD to its authoritative RDAP base URL. It
// changes rarely, so cache it in-process and refresh daily.

const RDAP_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json'
const BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000
let rdapBootstrap: { at: number; map: Map<string, string> } | null = null

async function getRdapBase(
  tld: string,
  timeoutMs: number,
): Promise<string | null> {
  const fresh = rdapBootstrap && Date.now() - rdapBootstrap.at < BOOTSTRAP_TTL_MS
  if (!fresh) {
    try {
      const res = await fetch(RDAP_BOOTSTRAP_URL, {
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (res.ok) {
        const data = (await res.json()) as {
          services?: [string[], string[]][]
        }
        const map = new Map<string, string>()
        for (const svc of data.services ?? []) {
          const tlds = svc[0] ?? []
          const urls = svc[1] ?? []
          const base = urls.find((u) => u.startsWith('https://')) ?? urls[0]
          if (base) {
            const normalized = base.endsWith('/') ? base : `${base}/`
            for (const t of tlds) map.set(t.toLowerCase(), normalized)
          }
        }
        rdapBootstrap = { at: Date.now(), map }
      }
    } catch {
      // Reuse any stale cache on fetch failure rather than losing RDAP entirely.
    }
  }
  return rdapBootstrap?.map.get(tld) ?? null
}

async function rdapLookup(
  domain: string,
  timeoutMs: number,
): Promise<Registration | null> {
  const tld = domain.split('.').pop()
  if (!tld) return null

  const startedAt = performance.now()
  const base = await getRdapBase(tld, Math.min(timeoutMs, 5000))
  if (!base) return null

  const remaining = Math.max(1500, timeoutMs - (performance.now() - startedAt))
  const res = await fetch(`${base}domain/${encodeURIComponent(domain)}`, {
    headers: { accept: 'application/rdap+json' },
    signal: AbortSignal.timeout(remaining),
    redirect: 'follow',
  })
  if (!res.ok) return null
  return parseRdap(await res.json())
}

export function parseRdap(json: unknown): Registration {
  const j = (json ?? {}) as Record<string, unknown>
  const events = Array.isArray(j.events) ? (j.events as RdapEvent[]) : []
  const dateFor = (action: string): Date | null => {
    const raw = events.find((e) => e?.eventAction === action)?.eventDate
    if (!raw) return null
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const entities = Array.isArray(j.entities) ? (j.entities as RdapEntity[]) : []
  const registrarEntity = entities.find(
    (e) => Array.isArray(e?.roles) && e.roles.includes('registrar'),
  )

  const nameservers = (Array.isArray(j.nameservers) ? j.nameservers : [])
    .map((n) => String((n as { ldhName?: string })?.ldhName ?? '').toLowerCase().replace(/\.$/, ''))
    .filter(Boolean)

  const statuses = (Array.isArray(j.status) ? j.status : []).map((s) => String(s))

  return {
    expiryAt: dateFor('expiration'),
    registeredAt: dateFor('registration'),
    registrar: vcardFullName(registrarEntity),
    nameservers,
    statuses,
    source: 'rdap',
    error: null,
  }
}

interface RdapEvent {
  eventAction?: string
  eventDate?: string
}
interface RdapEntity {
  roles?: string[]
  vcardArray?: unknown
}

// A vCard jCard is ["vcard", [ ["version",{},"text","4.0"], ["fn",{},"text","Name"], … ]].
function vcardFullName(entity: RdapEntity | undefined): string | null {
  const arr = (entity?.vcardArray as unknown[])?.[1]
  if (!Array.isArray(arr)) return null
  const fn = arr.find((f) => Array.isArray(f) && f[0] === 'fn') as
    | unknown[]
    | undefined
  return fn && typeof fn[3] === 'string' ? fn[3] : null
}

// ─────────────────────────── WHOIS (fallback) ───────────────────────────

async function whoisLookup(
  domain: string,
  timeoutMs: number,
): Promise<Registration> {
  const startedAt = performance.now()
  const ianaResponse = await whoisQuery(IANA_WHOIS, domain, timeoutMs)
  const authoritative = ianaResponse.match(/refer:\s*(\S+)/i)?.[1]
  if (!authoritative) {
    throw new Error(`IANA returned no WHOIS server for ${domain}`)
  }
  const remaining = Math.max(1000, timeoutMs - (performance.now() - startedAt))
  const registryResponse = await whoisQuery(authoritative, domain, remaining)
  return {
    expiryAt: parseExpiry(registryResponse),
    registeredAt: parseCreation(registryResponse),
    registrar: parseRegistrar(registryResponse),
    nameservers: parseNameservers(registryResponse),
    statuses: parseStatuses(registryResponse),
    source: 'whois',
    error: null,
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
    socket.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timer)
      // Socket errors like ETIMEDOUT/ECONNREFUSED carry an empty message; fall
      // back to the code so the failure is never reported with no explanation.
      const detail = err.code || err.message || 'connection failed'
      reject(new Error(`WHOIS lookup to ${server} failed: ${detail}`))
    })
  })
}

// Registry responses vary by TLD; each set of patterns covers the common
// formats and falls through gracefully to null/empty.

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
  return firstDate(whoisText, EXPIRY_PATTERNS)
}

const CREATION_PATTERNS = [
  /Creation Date:\s*(\S+)/i,
  /Created On\s*:\s*(.+)/i,
  /Registered on:\s*(.+)/i,
  /Registration Time:\s*(.+)/i,
  /created:\s*(.+)/i,
]

export function parseCreation(whoisText: string): Date | null {
  return firstDate(whoisText, CREATION_PATTERNS)
}

const REGISTRAR_PATTERNS = [
  /^\s*Registrar:\s*(.+)$/im,
  /Sponsoring Registrar:\s*(.+)/i,
  /^\s*registrar:\s*(.+)$/im,
]

export function parseRegistrar(whoisText: string): string | null {
  for (const re of REGISTRAR_PATTERNS) {
    const value = whoisText.match(re)?.[1]?.trim()
    if (value && !/^https?:/i.test(value)) return value
  }
  return null
}

export function parseNameservers(whoisText: string): string[] {
  const found = new Set<string>()
  const patterns = [
    /Name Server:\s*(\S+)/gi,
    /nserver:\s*(\S+)/gi,
    /Nameservers?:\s*(\S+)/gi,
  ]
  for (const re of patterns) {
    for (const m of whoisText.matchAll(re)) {
      const host = m[1]?.trim().toLowerCase().replace(/\.$/, '')
      if (host) found.add(host)
    }
  }
  return [...found]
}

export function parseStatuses(whoisText: string): string[] {
  const found = new Set<string>()
  const patterns = [/Domain Status:\s*(\S+)/gi, /^\s*status:\s*(\S+)/gim]
  for (const re of patterns) {
    for (const m of whoisText.matchAll(re)) {
      const status = m[1]?.trim()
      if (status && status.toLowerCase() !== 'connect') found.add(status)
    }
  }
  return [...found]
}

function firstDate(text: string, patterns: RegExp[]): Date | null {
  for (const re of patterns) {
    const raw = text.match(re)?.[1]?.trim()
    if (raw) {
      const parsed = new Date(raw)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }
  }
  return null
}

// ─────────────────────────── DNS + SSL enrichment ───────────────────────────

async function resolveDns(
  domain: string,
  timeoutMs: number,
): Promise<DomainFacts['dns']> {
  const bounded = <T>(p: Promise<T>, fallback: T): Promise<T> =>
    Promise.race([
      p.catch(() => fallback),
      new Promise<T>((r) => setTimeout(() => r(fallback), timeoutMs)),
    ])

  const [a, mx, ns] = await Promise.all([
    bounded(dns.resolve4(domain), [] as string[]),
    bounded(
      dns.resolveMx(domain).then((rs) => rs.map((r) => r.exchange)),
      [] as string[],
    ),
    bounded(dns.resolveNs(domain), [] as string[]),
  ])
  const clean = (h: string) => h.toLowerCase().replace(/\.$/, '')
  if (a.length === 0 && mx.length === 0 && ns.length === 0) return null
  return { a, mx: mx.map(clean), ns: ns.map(clean) }
}

function fetchSslInfo(
  host: string,
  timeoutMs: number,
): Promise<DomainFacts['ssl']> {
  return new Promise((resolve) => {
    // rejectUnauthorized false: we're inspecting the cert, not trusting it, so
    // an expired or self-signed cert should still report its dates.
    const socket = tls.connect(
      { host, port: 443, servername: host, rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate()
        socket.end()
        if (!cert || !cert.valid_to) return resolve(null)
        // DN attributes can be string or string[] in Node's typings.
        const issuerRaw = cert.issuer?.O ?? cert.issuer?.CN ?? null
        const issuer = Array.isArray(issuerRaw) ? (issuerRaw[0] ?? null) : issuerRaw
        const expiry = new Date(cert.valid_to)
        resolve({
          issuer,
          expiryAt: Number.isNaN(expiry.getTime()) ? null : expiry,
        })
      },
    )
    socket.setTimeout(timeoutMs, () => {
      socket.destroy()
      resolve(null)
    })
    socket.on('error', () => resolve(null))
  })
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
