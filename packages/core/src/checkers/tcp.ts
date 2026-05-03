import type { CheckResult, TcpMonitorConfig } from '@pingboard/shared'
import type { Monitor } from '@pingboard/db'

export async function checkTcp(monitor: Monitor): Promise<CheckResult> {
  const config = (monitor.config ?? {}) as Partial<TcpMonitorConfig>
  const { host, port } = parseTarget(monitor.target, config.port)

  if (!host || !port) {
    return {
      status: 'down',
      responseTimeMs: null,
      statusCode: null,
      message: 'Invalid target — expected "host:port" or host with explicit port',
      checkedAt: new Date(),
    }
  }

  const startedAt = performance.now()
  const timeoutMs = monitor.timeoutSeconds * 1000

  try {
    await connectWithTimeout(host, port, timeoutMs)
    return {
      status: 'up',
      responseTimeMs: Math.round(performance.now() - startedAt),
      statusCode: null,
      message: null,
      checkedAt: new Date(),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      status: 'down',
      responseTimeMs: Math.round(performance.now() - startedAt),
      statusCode: null,
      message,
      checkedAt: new Date(),
    }
  }
}

function parseTarget(
  target: string,
  configPort: number | undefined,
): { host: string | null; port: number | null } {
  const match = target.match(/^([^:]+)(?::(\d+))?$/)
  if (!match) return { host: null, port: null }
  const host = match[1] ?? null
  const port = match[2] ? Number(match[2]) : (configPort ?? null)
  return { host, port }
}

function connectWithTimeout(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.then((s) => s.end()).catch(() => {})
      reject(new Error(`Connection timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    const socket = Bun.connect({
      hostname: host,
      port,
      socket: {
        open(s) {
          clearTimeout(timer)
          s.end()
          resolve()
        },
        error(_s, err) {
          clearTimeout(timer)
          reject(err)
        },
        data() {},
        close() {},
        drain() {},
      },
    })

    socket.catch((err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}
