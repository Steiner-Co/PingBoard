import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import {
  createDb,
  monitors,
  heartbeats,
  domainFacts,
  runMigrations,
  type DB,
} from '@pingboard/db'
import {
  Scheduler,
  reconcileIncident,
  startNotifier,
  startPushOverdueJob,
  startRetentionJob,
} from '@pingboard/core'
import type { CheckResult } from '@pingboard/shared'
import { RESERVED_SLUGS } from '@pingboard/shared'
import { loadConfig } from './config'
import { VERSION } from './version'
import {
  handleLogin,
  handleLogout,
  handleSetup,
  handleSetupStatus,
} from './routes/auth'
import {
  createChannel,
  createMaintenanceWindow,
  createMonitor,
  createStatusPage,
  deleteChannel,
  deleteMaintenanceWindow,
  deleteMonitor,
  deleteStatusPage,
  deleteStatusPageLogo,
  getMonitor,
  getMonitorTimeline,
  getStatusPage,
  listChannels,
  listIncidents,
  listMaintenanceWindows,
  heartbeatSummary,
  listMonitors,
  listMonitorsUptime,
  listDomains,
  listStatusPages,
  resolveIncident,
  runMonitorCheck,
  testChannel,
  updateChannel,
  updateIncident,
  updateMaintenanceWindow,
  updateMonitor,
  updateStatusPage,
  uploadStatusPageLogo,
} from './routes/admin'
import {
  authStatusPagePublic,
  getPublicAsset,
  getStatusPagePublic,
  handlePushHeartbeat,
  injectPublicShellMeta,
  streamStatusPagePublic,
} from './routes/public'
import {
  changePassword,
  getInstanceInfo,
  getSettings,
  updateSettings,
} from './routes/settings'
import {
  createApiToken,
  deleteApiToken,
  listApiTokens,
} from './routes/tokens'
import { requireAuth } from './middleware/auth'
import { error } from './lib/responses'
import { createSseResponse } from './lib/sse'
import { checkRateLimit } from './lib/rate-limit'

// `bun --hot` re-runs this module on every reload without tearing down the
// previous generation's timers. Without this guard, each reload stacks another
// scheduler + background jobs — ghost check loops running stale configs.
declare global {
  var __pingboardHotCleanup: (() => Promise<void>) | undefined
}


async function main() {
  await globalThis.__pingboardHotCleanup?.()
  const bootedAt = Date.now()
  const config = loadConfig()
  mkdirSync(config.dataDir, { recursive: true })

  console.log(
    `PingBoard ${VERSION} starting on port ${config.port} (mode: ${config.mode}, data: ${config.dataDir})`,
  )

  // Migrations: prefer the explicit env-configured dir (set in the bundled
  // Docker image); otherwise fall back to the source-tree layout for dev.
  try {
    runMigrations(config.dbPath, config.migrationsDir ?? resolveMigrationsDir())
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  }

  const db = createDb(config.dbPath)
  const scheduler = new Scheduler({
    onHeartbeat: makeHeartbeatHandler(db),
  })

  // Boot existing monitors
  const all = await db.select().from(monitors)
  for (const m of all) {
    if (!m.paused) scheduler.start(m)
  }
  console.log(`Loaded ${all.length} monitor(s) (${all.filter((m) => !m.paused).length} active)`)

  const notifier = startNotifier(db, { baseUrl: config.baseUrl })
  const retention = startRetentionJob(db)
  const pushOverdue = startPushOverdueJob(db)

  const secureCookies = (config.baseUrl ?? '').startsWith('https://')
  const authDeps = { db, secureCookies }
  const adminDeps = { db, scheduler, mode: config.mode, dataDir: config.dataDir }
  const publicDeps = { db, secureCookies, dataDir: config.dataDir }

  const server = Bun.serve({
    port: config.port,
    development: process.env.NODE_ENV !== 'production',
    async fetch(req, server) {
      const url = new URL(req.url)
      const path = url.pathname
      const method = req.method

      try {
        // ───────── Auth (public) ─────────
        if (path === '/api/auth/setup-status' && method === 'GET')
          return handleSetupStatus(authDeps)
        if (path === '/api/auth/setup' && method === 'POST')
          return handleSetup(req, authDeps)
        if (path === '/api/auth/login' && method === 'POST')
          return handleLogin(req, authDeps)
        if (path === '/api/auth/logout' && method === 'POST')
          return handleLogout(req, authDeps)

        // ───────── Admin (auth gate) ─────────
        if (path.startsWith('/api/admin') || path === '/api/admin') {
          const auth = await requireAuth(req, db)
          if (!auth.ok) return auth.response

          if (path === '/api/admin/me' && method === 'GET') {
            return new Response(JSON.stringify({ user: auth.user }), {
              headers: { 'content-type': 'application/json' },
            })
          }
          if (path === '/api/admin/sse' && method === 'GET') {
            // Long-lived stream: Bun's default 10s idleTimeout would sever the
            // connection before the first 25s keepalive ping ever fires.
            server.timeout(req, 0)
            return createSseResponse()
          }

          // Monitors
          if (path === '/api/admin/monitors' && method === 'GET')
            return listMonitors(adminDeps)
          if (path === '/api/admin/domains' && method === 'GET')
            return listDomains(adminDeps)
          if (path === '/api/admin/heartbeats/summary' && method === 'GET')
            return heartbeatSummary(adminDeps)
          if (path === '/api/admin/monitors' && method === 'POST')
            return createMonitor(req, adminDeps)
          if (path === '/api/admin/monitors/run' && method === 'POST')
            return runMonitorCheck(req, adminDeps)
          // Registered before the /monitors/:id regex — 'uptime' would match it.
          if (path === '/api/admin/monitors/uptime' && method === 'GET')
            return listMonitorsUptime(adminDeps)
          const monitorTimelineMatch = path.match(
            /^\/api\/admin\/monitors\/([\w-]+)\/timeline$/,
          )
          if (monitorTimelineMatch?.[1] && method === 'GET')
            return getMonitorTimeline(monitorTimelineMatch[1], adminDeps)
          const monitorMatch = path.match(/^\/api\/admin\/monitors\/([\w-]+)$/)
          if (monitorMatch?.[1]) {
            const id = monitorMatch[1]
            if (method === 'GET') return getMonitor(id, adminDeps)
            if (method === 'PATCH' || method === 'PUT')
              return updateMonitor(id, req, adminDeps)
            if (method === 'DELETE') return deleteMonitor(id, adminDeps)
          }

          // Channels
          if (path === '/api/admin/channels' && method === 'GET')
            return listChannels(adminDeps)
          if (path === '/api/admin/channels' && method === 'POST')
            return createChannel(req, adminDeps)
          const channelMatch = path.match(/^\/api\/admin\/channels\/([\w-]+)$/)
          if (channelMatch?.[1]) {
            const id = channelMatch[1]
            if (method === 'PATCH' || method === 'PUT')
              return updateChannel(id, req, adminDeps)
            if (method === 'DELETE') return deleteChannel(id, adminDeps)
          }
          const channelTestMatch = path.match(
            /^\/api\/admin\/channels\/([\w-]+)\/test$/,
          )
          if (channelTestMatch?.[1] && method === 'POST') {
            return testChannel(channelTestMatch[1], adminDeps)
          }

          // Settings
          if (path === '/api/admin/settings' && method === 'GET')
            return getSettings({ db })
          if (path === '/api/admin/instance' && method === 'GET')
            return getInstanceInfo({
              db,
              dbPath: config.dbPath,
              dataDir: config.dataDir,
              version: VERSION,
              mode: config.mode,
              startedAt: bootedAt,
            })
          if (
            path === '/api/admin/settings' &&
            (method === 'PATCH' || method === 'PUT')
          )
            return updateSettings(req, { db })

          // API tokens
          if (path === '/api/admin/tokens' && method === 'GET')
            return listApiTokens({ db })
          if (path === '/api/admin/tokens' && method === 'POST')
            return createApiToken(req, { db })
          const tokenMatch = path.match(/^\/api\/admin\/tokens\/([\w-]+)$/)
          if (tokenMatch?.[1] && method === 'DELETE')
            return deleteApiToken(tokenMatch[1], { db })

          // Account
          if (path === '/api/admin/account/password' && method === 'POST') {
            return changePassword(req, { db, userId: auth.user.userId })
          }

          // Incidents
          if (path === '/api/admin/incidents' && method === 'GET')
            return listIncidents(adminDeps)
          const incidentResolveMatch = path.match(
            /^\/api\/admin\/incidents\/([\w-]+)\/resolve$/,
          )
          if (incidentResolveMatch?.[1] && method === 'POST') {
            return resolveIncident(incidentResolveMatch[1], adminDeps)
          }
          const incidentMatch = path.match(/^\/api\/admin\/incidents\/([\w-]+)$/)
          if (incidentMatch?.[1] && (method === 'PATCH' || method === 'PUT')) {
            return updateIncident(incidentMatch[1], req, adminDeps)
          }

          // Maintenance windows
          if (path === '/api/admin/maintenance-windows' && method === 'GET')
            return listMaintenanceWindows(req, adminDeps)
          if (path === '/api/admin/maintenance-windows' && method === 'POST')
            return createMaintenanceWindow(req, adminDeps)
          const mwMatch = path.match(
            /^\/api\/admin\/maintenance-windows\/([\w-]+)$/,
          )
          if (mwMatch?.[1]) {
            const id = mwMatch[1]
            if (method === 'PATCH' || method === 'PUT')
              return updateMaintenanceWindow(id, req, adminDeps)
            if (method === 'DELETE') return deleteMaintenanceWindow(id, adminDeps)
          }

          // Status pages
          if (path === '/api/admin/pages' && method === 'GET')
            return listStatusPages(adminDeps)
          if (path === '/api/admin/pages' && method === 'POST')
            return createStatusPage(req, adminDeps)
          const pageLogoMatch = path.match(/^\/api\/admin\/pages\/([\w-]+)\/logo$/)
          if (pageLogoMatch?.[1]) {
            if (method === 'POST')
              return uploadStatusPageLogo(pageLogoMatch[1], req, adminDeps)
            if (method === 'DELETE')
              return deleteStatusPageLogo(pageLogoMatch[1], adminDeps)
          }
          const pageMatch = path.match(/^\/api\/admin\/pages\/([\w-]+)$/)
          if (pageMatch?.[1]) {
            const id = pageMatch[1]
            if (method === 'GET') return getStatusPage(id, adminDeps)
            if (method === 'PATCH' || method === 'PUT')
              return updateStatusPage(id, req, adminDeps)
            if (method === 'DELETE') return deleteStatusPage(id, adminDeps)
          }

          return error(404, 'Not found')
        }

        // ───────── Push ingest (no auth — token is the secret) ─────────
        const pushMatch = path.match(/^\/api\/push\/([\w-]+)$/)
        if (pushMatch?.[1] && method === 'POST') {
          if (!checkRateLimit(`push:${pushMatch[1]}`)) {
            return error(429, 'Rate limit exceeded')
          }
          return handlePushHeartbeat(pushMatch[1], req, { db })
        }

        // ───────── Public API ─────────
        if (path.startsWith('/api/public/')) {
          const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
          if (!checkRateLimit(ip)) return error(429, 'Rate limit exceeded')

          const sseMatch = path.match(/^\/api\/public\/([\w-]+)\/sse$/)
          if (sseMatch?.[1] && method === 'GET') {
            server.timeout(req, 0) // long-lived stream, see /api/admin/sse
            return streamStatusPagePublic(sseMatch[1], req, publicDeps)
          }

          const authMatch = path.match(/^\/api\/public\/([\w-]+)\/auth$/)
          if (authMatch?.[1] && method === 'POST')
            return authStatusPagePublic(authMatch[1], req, publicDeps)

          const assetMatch = path.match(/^\/api\/public\/assets\/(.+)$/)
          if (assetMatch?.[1] && method === 'GET')
            return getPublicAsset(assetMatch[1], publicDeps)

          const pageMatch = path.match(/^\/api\/public\/([\w-]+)$/)
          if (pageMatch?.[1] && method === 'GET')
            return getStatusPagePublic(pageMatch[1], req, publicDeps)

          return error(404, 'Not found')
        }

        // ───────── Health ─────────
        if (path === '/_health') return new Response('ok')

        // ───────── Static assets + SPA shells ─────────
        if (config.publicStaticDir) {
          // 1. Existing asset on disk (e.g. /assets/admin-x.js)?
          if (path !== '/' && !path.endsWith('/')) {
            const filePath = join(config.publicStaticDir, path.slice(1))
            const file = Bun.file(filePath)
            if (await file.exists()) return new Response(file)
          }

          // 2. Public status page slug? Serve public.html shell with the
          //    page's own share-preview meta rendered in.
          const slugMatch = path.match(/^\/([a-z0-9-]+)\/?$/)
          if (
            slugMatch?.[1] &&
            !(RESERVED_SLUGS as readonly string[]).includes(slugMatch[1])
          ) {
            const publicShell = Bun.file(join(config.publicStaticDir, 'public.html'))
            if (await publicShell.exists()) {
              const html = await injectPublicShellMeta(
                await publicShell.text(),
                slugMatch[1],
                config.baseUrl ?? url.origin,
                { db },
              )
              return new Response(html, {
                headers: { 'content-type': 'text/html; charset=utf-8' },
              })
            }
          }

          // 3. Anything else → admin SPA shell.
          const indexFile = Bun.file(join(config.publicStaticDir, 'index.html'))
          if (await indexFile.exists()) return new Response(indexFile)
        }

        return new Response('PingBoard backend running. UI not yet bundled.', {
          headers: { 'content-type': 'text/plain' },
        })
      } catch (err) {
        console.error('Request error:', err)
        return error(500, 'Internal server error')
      }
    },
  })

  console.log(`✓ PingBoard listening on http://localhost:${server.port}`)

  const stopBackground = async () => {
    notifier.stop()
    retention.stop()
    pushOverdue.stop()
    await scheduler.drain()
  }

  const shutdown = async () => {
    console.log('Shutting down…')
    await stopBackground()
    server.stop()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  globalThis.__pingboardHotCleanup = async () => {
    console.log('Hot reload: stopping previous scheduler and jobs…')
    process.off('SIGINT', shutdown)
    process.off('SIGTERM', shutdown)
    await stopBackground()
    server.stop()
  }
}

function makeHeartbeatHandler(db: DB) {
  return async (monitorId: string, result: CheckResult) => {
    await db.insert(heartbeats).values({
      monitorId,
      status: result.status,
      responseTimeMs: result.responseTimeMs,
      statusCode: result.statusCode,
      message: result.message,
      checkedAt: result.checkedAt,
    })
    await reconcileIncident(db, monitorId, result)

    // Domain checks carry enriched portfolio facts; upsert them so the Domains
    // view has registrar/nameserver/SSL data without a separate collector.
    if (result.facts) {
      const f = result.facts
      const row = {
        monitorId,
        registrar: f.registrar,
        expiryAt: f.expiryAt,
        registeredAt: f.registeredAt,
        nameservers: f.nameservers,
        statuses: f.statuses,
        dns: f.dns ?? null,
        sslIssuer: f.ssl?.issuer ?? null,
        sslExpiryAt: f.ssl?.expiryAt ?? null,
        collectedAt: new Date(),
      }
      await db
        .insert(domainFacts)
        .values(row)
        .onConflictDoUpdate({ target: domainFacts.monitorId, set: row })
    }
  }
}

function resolveMigrationsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  // Source layout: apps/pingboard/src/server.ts → ../../../packages/db/drizzle
  return join(here, '..', '..', '..', 'packages', 'db', 'drizzle')
}

// Unused import workaround — keeps `eq` available for future inline queries
void eq

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
