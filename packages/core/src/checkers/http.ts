import type { CheckResult, HttpMonitorConfig } from '@pingboard/shared'
import type { Monitor } from '@pingboard/db'

export async function checkHttp(monitor: Monitor): Promise<CheckResult> {
  const config = (monitor.config ?? {}) as HttpMonitorConfig
  const expectedCodes = config.expectedStatusCodes ?? defaultExpectedCodes()
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    monitor.timeoutSeconds * 1000,
  )
  const startedAt = performance.now()

  try {
    const response = await fetch(monitor.target, {
      method: config.method ?? 'GET',
      // Identify ourselves: UA-less requests get 403'd by many WAFs and
      // UA policies (Wikimedia, Cloudflare rules), reading as false downs.
      headers: {
        'user-agent':
          'PingBoard/1.0 (uptime monitor; +https://github.com/steiner-co/pingboard)',
        ...(config.headers ?? {}),
      },
      body: config.body,
      redirect: config.followRedirects === false ? 'manual' : 'follow',
      signal: controller.signal,
      ...(config.verifyTls === false
        ? { tls: { rejectUnauthorized: false } }
        : {}),
    } as RequestInit)
    const responseTimeMs = Math.round(performance.now() - startedAt)

    if (!expectedCodes.includes(response.status)) {
      return result('down', responseTimeMs, response.status, `Status ${response.status} not in expected codes`)
    }

    if (config.expectedKeyword || config.expectedJsonPath) {
      const text = await response.text()

      if (config.expectedKeyword && !text.includes(config.expectedKeyword)) {
        return result('down', responseTimeMs, response.status, `Keyword "${config.expectedKeyword}" not found in body`)
      }

      if (config.expectedJsonPath) {
        try {
          const json = JSON.parse(text)
          const actual = readPath(json, config.expectedJsonPath.path)
          if (!deepEqual(actual, config.expectedJsonPath.equals)) {
            return result('down', responseTimeMs, response.status, `JSON path ${config.expectedJsonPath.path} did not match`)
          }
        } catch {
          return result('down', responseTimeMs, response.status, 'Body was not valid JSON')
        }
      }
    }

    return result('up', responseTimeMs, response.status, null)
  } catch (err) {
    const responseTimeMs = Math.round(performance.now() - startedAt)
    const message = err instanceof Error ? err.message : String(err)
    return result('down', responseTimeMs, null, message)
  } finally {
    clearTimeout(timeout)
  }
}

function defaultExpectedCodes(): number[] {
  return [200, 201, 202, 203, 204, 205, 206, 207, 208, 226]
}

function result(
  status: CheckResult['status'],
  responseTimeMs: number,
  statusCode: number | null,
  message: string | null,
): CheckResult {
  return { status, responseTimeMs, statusCode, message, checkedAt: new Date() }
}

function readPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
