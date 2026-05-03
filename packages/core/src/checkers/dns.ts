import { Resolver } from 'node:dns/promises'
import type { CheckResult, DnsMonitorConfig } from '@pingboard/shared'
import type { Monitor } from '@pingboard/db'

export async function checkDns(monitor: Monitor): Promise<CheckResult> {
  const config = (monitor.config ?? {}) as Partial<DnsMonitorConfig>
  const recordType = config.recordType ?? 'A'
  const startedAt = performance.now()

  const resolver = new Resolver()
  if (config.resolver) resolver.setServers([config.resolver])

  try {
    const records = await Promise.race([
      resolveRecord(resolver, monitor.target, recordType),
      timeoutAfter(monitor.timeoutSeconds * 1000),
    ])
    const responseTimeMs = Math.round(performance.now() - startedAt)

    if (!records || records.length === 0) {
      return down(responseTimeMs, `No ${recordType} records found`)
    }

    if (config.expectedValue) {
      const flat = records.map((r) => (typeof r === 'string' ? r : JSON.stringify(r)))
      if (!flat.some((v) => v.includes(config.expectedValue!))) {
        return down(
          responseTimeMs,
          `Expected value "${config.expectedValue}" not found in [${flat.join(', ')}]`,
        )
      }
    }

    return {
      status: 'up',
      responseTimeMs,
      statusCode: null,
      message: null,
      checkedAt: new Date(),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return down(Math.round(performance.now() - startedAt), message)
  }
}

async function resolveRecord(
  resolver: Resolver,
  host: string,
  type: NonNullable<DnsMonitorConfig['recordType']>,
): Promise<unknown[]> {
  switch (type) {
    case 'A':
      return resolver.resolve4(host)
    case 'AAAA':
      return resolver.resolve6(host)
    case 'CNAME':
      return resolver.resolveCname(host)
    case 'MX':
      return resolver.resolveMx(host)
    case 'TXT':
      return (await resolver.resolveTxt(host)).map((arr) => arr.join(''))
    case 'NS':
      return resolver.resolveNs(host)
  }
}

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`DNS query timeout after ${ms}ms`)), ms),
  )
}

function down(responseTimeMs: number, message: string): CheckResult {
  return {
    status: 'down',
    responseTimeMs,
    statusCode: null,
    message,
    checkedAt: new Date(),
  }
}
