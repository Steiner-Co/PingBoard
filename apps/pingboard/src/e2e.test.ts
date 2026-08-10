import { afterAll, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Core-flow end-to-end test: boots the real server as a child process against
 * a throwaway DATA_DIR, then walks the launch-critical path over localhost —
 * first-run setup → webhook channel → HTTP monitor → status page → forced
 * down/up checks → incident open/resolve → webhook notifications → public
 * status page reflecting each transition.
 *
 * Two helper servers run inside this test process on ephemeral ports:
 *   - `target`:   the monitored HTTP endpoint; flippable between 200 and 500.
 *   - `capture`:  records every webhook payload the notifier POSTs.
 *
 * Notes on the product behavior this test relies on:
 *   - POST /api/admin/monitors/run is a "test now" dry run — it does NOT
 *     persist a heartbeat or reconcile incidents (see runMonitorCheck in
 *     routes/admin.ts). To force an immediate *real* check we PATCH the
 *     monitor instead: updateMonitor calls scheduler.restart(), and the
 *     Scheduler fires the first check immediately on (re)start. The 10s
 *     scheduler interval is kept as a fallback so a missed restart still
 *     converges within the waitFor timeouts.
 *   - The notifier is fire-and-forget off an EventEmitter with no retry
 *     queue (packages/core/src/notifier/index.ts), so delivery lands shortly
 *     after the incident transition — well inside the polling timeouts.
 */

const REPO_ROOT = join(import.meta.dir, '..', '..', '..')
const SERVER_ENTRY = join(REPO_ROOT, 'apps', 'pingboard', 'src', 'server.ts')

const dataDir = mkdtempSync(join(tmpdir(), 'pingboard-e2e-'))

// ───────────────────────── Helper servers ─────────────────────────

let targetStatus = 200
const target = Bun.serve({
  port: 0,
  fetch: () =>
    new Response(targetStatus === 200 ? 'ok' : 'boom', { status: targetStatus }),
})

interface WebhookPayload {
  status?: string
  monitor?: { id?: string; name?: string; target?: string }
  incident?: { id?: string; resolvedAt?: string | null }
}
const webhookLog: WebhookPayload[] = []
const capture = Bun.serve({
  port: 0,
  fetch: async (req) => {
    webhookLog.push((await req.json()) as WebhookPayload)
    return new Response('ok')
  },
})

// ─────────────────────── Child server boot ───────────────────────

let child: ReturnType<typeof Bun.spawn> | null = null
let baseUrl = ''
let cookie = ''

async function bootServer(): Promise<number> {
  child = Bun.spawn(['bun', 'run', SERVER_ENTRY], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      PORT: '0',
      // The public API rate limit (60/min default) would strangle polling;
      // this is config, not a behavior change.
      PINGBOARD_PUBLIC_RATE_LIMIT: '100000',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const proc = child

  let stderrText = ''
  void (async () => {
    const reader = (proc.stderr as ReadableStream<Uint8Array>).getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      stderrText += decoder.decode(value, { stream: true })
    }
  })()

  const port = await Promise.race([
    (async () => {
      const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader()
      let buf = ''
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const m = buf.match(/listening on http:\/\/localhost:(\d+)/)
        if (m) {
          // Keep draining with the same reader so a chatty child never
          // blocks on a full pipe.
          void (async () => {
            while (!(await reader.read()).done) {
              /* discard */
            }
          })()
          return Number(m[1])
        }
      }
      throw new Error(
        `server exited before logging its port.\nstdout:\n${buf}\nstderr:\n${stderrText}`,
      )
    })(),
    Bun.sleep(20_000).then(() => {
      throw new Error(`timed out waiting for server boot. stderr:\n${stderrText}`)
    }),
  ])
  return port
}

afterAll(async () => {
  target.stop(true)
  capture.stop(true)
  if (child) {
    child.kill('SIGTERM')
    const exited = await Promise.race([
      child.exited.then(() => true),
      Bun.sleep(5_000).then(() => false),
    ])
    if (!exited) {
      child.kill('SIGKILL')
      await child.exited.catch(() => {})
    }
    child = null
  }
  rmSync(dataDir, { recursive: true, force: true })
})

// ─────────────────────────── Utilities ───────────────────────────

async function waitFor(
  cond: () => Promise<boolean> | boolean,
  what: string,
  timeoutMs = 15_000,
  intervalMs = 100,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastErr: unknown = null
  while (Date.now() < deadline) {
    try {
      if (await cond()) return
    } catch (err) {
      lastErr = err
    }
    await Bun.sleep(intervalMs)
  }
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for: ${what}` +
      (lastErr ? ` (last poll error: ${String(lastErr)})` : ''),
  )
}

interface ApiResult {
  status: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any
  text: string
}

async function api(method: string, path: string, body?: unknown): Promise<ApiResult> {
  const res = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json: ApiResult['json'] = null
  try {
    json = JSON.parse(text)
  } catch {
    // non-JSON response (health check, plain-text fallback) — text has it
  }
  return { status: res.status, json, text }
}

// ──────────────────────────── The flow ───────────────────────────

test(
  'core flow: setup → channel → monitor → page → incident → recovery',
  async () => {
    const port = await bootServer()
    baseUrl = `http://localhost:${port}`

    // 1. First-run setup
    const statusBefore = await api('GET', '/api/auth/setup-status')
    expect(statusBefore.status).toBe(200)
    expect(statusBefore.json).toEqual({ setupComplete: false })

    const setupRes = await fetch(`${baseUrl}/api/auth/setup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'correct horse battery staple',
      }),
    })
    expect(setupRes.status).toBe(200)
    const setCookie = setupRes.headers.get('set-cookie')
    expect(setCookie).toContain('pb_session=')
    cookie = setCookie!.split(';')[0]!

    const statusAfter = await api('GET', '/api/auth/setup-status')
    expect(statusAfter.json).toEqual({ setupComplete: true })

    // 2. Webhook alert channel pointing at the capture server
    const channelRes = await api('POST', '/api/admin/channels', {
      name: 'E2E webhook',
      type: 'webhook',
      config: { url: `http://localhost:${capture.port}/hook` },
    })
    expect(channelRes.status).toBe(201)
    const channelId = channelRes.json.channel.id as string

    // 3. HTTP monitor against the (healthy) target, channel attached.
    //    intervalSeconds: 10 is the smallest allowed value and acts as a
    //    fallback ticker; retryCount: 0 so one failed check = down.
    const monitorRes = await api('POST', '/api/admin/monitors', {
      name: 'E2E target',
      type: 'http',
      target: `http://localhost:${target.port}/`,
      intervalSeconds: 10,
      timeoutSeconds: 5,
      retryCount: 0,
      config: {},
      tags: [],
      channelIds: [channelId],
    })
    expect(monitorRes.status).toBe(201)
    const monitorId = monitorRes.json.monitor.id as string

    // The scheduler fires an immediate check on create; wait for the first
    // healthy heartbeat to land.
    await waitFor(async () => {
      const res = await api('GET', '/api/admin/monitors')
      const m = (res.json.monitors as { id: string; latest: { status: string } | null }[])
        .find((x) => x.id === monitorId)
      return m?.latest?.status === 'up'
    }, 'initial up heartbeat')

    // 4. Status page with the monitor attached
    const pageRes = await api('POST', '/api/admin/pages', {
      slug: 'e2e-status',
      title: 'E2E Status',
      monitors: [{ monitorId }],
    })
    expect(pageRes.status).toBe(201)

    const publicMonitorStatus = async (): Promise<string | null> => {
      const res = await api('GET', '/api/public/e2e-status')
      if (res.status !== 200) return null
      const m = (res.json.monitors as { id: string; currentStatus: string }[]).find(
        (x) => x.id === monitorId,
      )
      return m?.currentStatus ?? null
    }
    await waitFor(
      async () => (await publicMonitorStatus()) === 'up',
      'public page to show the monitor up',
    )

    const openIncident = async () => {
      const res = await api('GET', '/api/admin/incidents')
      return (res.json.incidents as {
        monitorId: string
        resolvedAt: string | null
      }[]).find((i) => i.monitorId === monitorId && i.resolvedAt === null)
    }

    // 5. Target goes down → forced check → incident + webhook + public down.
    //    (A no-op PATCH restarts the scheduler, firing an immediate check —
    //    /api/admin/monitors/run is only a dry run and persists nothing.)
    const forceCheck = async () => {
      const res = await api('PATCH', `/api/admin/monitors/${monitorId}`, {
        name: 'E2E target',
      })
      expect(res.status).toBe(200)
    }

    targetStatus = 500
    await forceCheck()

    await waitFor(async () => !!(await openIncident()), 'an open incident')
    await waitFor(
      () =>
        webhookLog.some(
          (w) => w.status === 'opened' && w.monitor?.id === monitorId,
        ),
      'an "opened" webhook notification',
    )
    await waitFor(
      async () => (await publicMonitorStatus()) === 'down',
      'public page to show the monitor down',
    )

    // 6. Target recovers → forced check → resolution + webhook + public up.
    targetStatus = 200
    await forceCheck()

    await waitFor(async () => {
      const res = await api('GET', '/api/admin/incidents')
      return (res.json.incidents as {
        monitorId: string
        resolvedAt: string | null
      }[]).some((i) => i.monitorId === monitorId && i.resolvedAt !== null)
    }, 'the incident to resolve')
    await waitFor(
      () =>
        webhookLog.some(
          (w) =>
            w.status === 'resolved' &&
            w.monitor?.id === monitorId &&
            w.incident?.resolvedAt != null,
        ),
      'a "resolved" webhook notification',
    )
    await waitFor(
      async () => (await publicMonitorStatus()) === 'up',
      'public page to show the monitor up again',
    )

    // Sanity: exactly one incident lifecycle and one notification of each kind.
    const incidentsRes = await api('GET', '/api/admin/incidents')
    const mine = (incidentsRes.json.incidents as { monitorId: string }[]).filter(
      (i) => i.monitorId === monitorId,
    )
    expect(mine).toHaveLength(1)
    expect(webhookLog.filter((w) => w.status === 'opened')).toHaveLength(1)
    expect(webhookLog.filter((w) => w.status === 'resolved')).toHaveLength(1)
  },
  120_000,
)
