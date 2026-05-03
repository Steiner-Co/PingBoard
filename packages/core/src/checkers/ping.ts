import { spawn } from 'node:child_process'
import type { CheckResult } from '@pingboard/shared'
import type { Monitor } from '@pingboard/db'

export async function checkPing(monitor: Monitor): Promise<CheckResult> {
  const startedAt = performance.now()
  const timeoutSeconds = monitor.timeoutSeconds

  return new Promise((resolve) => {
    const args = ['-c', '1', '-W', String(timeoutSeconds), monitor.target]
    const child = spawn('ping', args)
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => (stdout += chunk.toString()))
    child.stderr.on('data', (chunk) => (stderr += chunk.toString()))

    const killTimer = setTimeout(
      () => child.kill('SIGKILL'),
      (timeoutSeconds + 1) * 1000,
    )

    child.on('close', (code) => {
      clearTimeout(killTimer)
      const responseTimeMs = Math.round(performance.now() - startedAt)

      if (code === 0) {
        const rttMs = parseRtt(stdout) ?? responseTimeMs
        resolve({
          status: 'up',
          responseTimeMs: rttMs,
          statusCode: null,
          message: null,
          checkedAt: new Date(),
        })
      } else {
        resolve({
          status: 'down',
          responseTimeMs,
          statusCode: null,
          message: stderr.trim() || `ping exited with code ${code}`,
          checkedAt: new Date(),
        })
      }
    })

    child.on('error', (err) => {
      clearTimeout(killTimer)
      resolve({
        status: 'down',
        responseTimeMs: Math.round(performance.now() - startedAt),
        statusCode: null,
        message: err.message,
        checkedAt: new Date(),
      })
    })
  })
}

function parseRtt(output: string): number | null {
  const match = output.match(/time=([0-9.]+)\s*ms/)
  return match?.[1] ? Math.round(Number(match[1])) : null
}
