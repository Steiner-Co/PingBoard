import * as tls from 'node:tls'
import type { CheckResult, SslMonitorConfig } from '@pingboard/shared'
import {
  SSL_DEFAULT_CRITICAL_DAYS,
  SSL_DEFAULT_PORT,
  SSL_DEFAULT_WARNING_DAYS,
} from '@pingboard/shared'
import type { Monitor } from '@pingboard/db'

const DAY_MS = 24 * 60 * 60 * 1000

export async function checkSsl(monitor: Monitor): Promise<CheckResult> {
  const config = (monitor.config ?? {}) as SslMonitorConfig
  const warningDays = config.warningDays ?? SSL_DEFAULT_WARNING_DAYS
  const criticalDays = config.criticalDays ?? SSL_DEFAULT_CRITICAL_DAYS
  const { host, port } = parseTarget(monitor.target, config.port)

  if (!host) {
    return done('down', null, 'Invalid target — expected a hostname or URL')
  }

  const startedAt = performance.now()
  try {
    const validTo = await fetchPeerCertNotAfter(
      host,
      port,
      monitor.timeoutSeconds * 1000,
    )
    const responseTimeMs = Math.round(performance.now() - startedAt)
    const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / DAY_MS)
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
    return done('down', responseTimeMs, `${days} day(s) until certificate expiry`)
  }
  if (days <= warningDays) {
    return done(
      'degraded',
      responseTimeMs,
      `${days} day(s) until certificate expiry`,
    )
  }
  return done('up', responseTimeMs, `${days} day(s) until certificate expiry`)
}

function parseTarget(
  target: string,
  configPort: number | undefined,
): { host: string; port: number } {
  const trimmed = target.trim()
  // Accept full URLs
  try {
    const url = new URL(trimmed)
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : (configPort ?? SSL_DEFAULT_PORT),
    }
  } catch {
    // Fall through — treat as bare host(:port)
  }
  const match = trimmed.match(/^([^:]+)(?::(\d+))?$/)
  if (!match) return { host: '', port: configPort ?? SSL_DEFAULT_PORT }
  const host = match[1] ?? ''
  const port = match[2] ? Number(match[2]) : (configPort ?? SSL_DEFAULT_PORT)
  return { host, port }
}

function fetchPeerCertNotAfter(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<Date> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error(`TLS connection timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
        // We need to inspect the cert even when it's expired/invalid; the
        // expiry comparison is the actual check.
        rejectUnauthorized: false,
      },
      () => {
        clearTimeout(timer)
        const cert = socket.getPeerCertificate()
        socket.end()
        if (!cert || !cert.valid_to) {
          reject(new Error('No certificate presented by peer'))
          return
        }
        const validTo = new Date(cert.valid_to)
        if (Number.isNaN(validTo.getTime())) {
          reject(new Error(`Could not parse certificate notAfter: ${cert.valid_to}`))
          return
        }
        resolve(validTo)
      },
    )

    socket.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
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
