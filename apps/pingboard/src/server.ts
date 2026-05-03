import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import {
  createDb,
  monitors,
  heartbeats,
  runMigrations,
  type DB,
} from '@pingboard/db'
import {
  Scheduler,
  reconcileIncident,
  startNotifier,
  startRetentionJob,
} from '@pingboard/core'
import type { CheckResult } from '@pingboard/shared'
import { RESERVED_SLUGS } from '@pingboard/shared'
import { loadConfig } from './config'
import {
  handleLogin,
  handleLogout,
  handleSetup,
  handleSetupStatus,
} from './routes/auth'
import {
  createChannel,
  createMonitor,
  createStatusPage,
  deleteChannel,
  deleteMonitor,
  deleteStatusPage,
  getMonitor,
  getStatusPage,
  listChannels,
  listMonitors,
  listStatusPages,
  testChannel,
  updateChannel,
  updateMonitor,
  updateStatusPage,
} from './routes/admin'
import { getStatusPagePublic, streamStatusPagePublic } from './routes/public'
import { requireAuth } from './middleware/auth'
import { error } from './lib/responses'
import { createSseResponse } from './lib/sse'
import { checkRateLimit } from './lib/rate-limit'

async function main() {
  const config = loadConfig()
  mkdirSync(config.dataDir, { recursive: true })

  console.log(`PingBoard starting on port ${config.port} (data: ${config.dataDir})`)

  // Migrations: tolerate either dev (running from source) or prod (built bundle)
  try {
    runMigrations(config.dbPath, resolveMigrationsDir())
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

  const secureCookies = (config.baseUrl ?? '').startsWith('https://')
  const authDeps = { db, secureCookies }
  const adminDeps = { db, scheduler }
  const publicDeps = { db }

  const server = Bun.serve({
    port: config.port,
    development: process.env.NODE_ENV !== 'production',
    async fetch(req) {
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
          if (path === '/api/admin/sse' && method === 'GET')
            return createSseResponse()

          // Monitors
          if (path === '/api/admin/monitors' && method === 'GET')
            return listMonitors(adminDeps)
          if (path === '/api/admin/monitors' && method === 'POST')
            return createMonitor(req, adminDeps)
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

          // Status pages
          if (path === '/api/admin/pages' && method === 'GET')
            return listStatusPages(adminDeps)
          if (path === '/api/admin/pages' && method === 'POST')
            return createStatusPage(req, adminDeps)
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

        // ───────── Public API ─────────
        if (path.startsWith('/api/public/')) {
          const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
          if (!checkRateLimit(ip)) return error(429, 'Rate limit exceeded')

          const sseMatch = path.match(/^\/api\/public\/([\w-]+)\/sse$/)
          if (sseMatch?.[1] && method === 'GET')
            return streamStatusPagePublic(sseMatch[1], publicDeps)

          const pageMatch = path.match(/^\/api\/public\/([\w-]+)$/)
          if (pageMatch?.[1] && method === 'GET')
            return getStatusPagePublic(pageMatch[1], publicDeps)

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

          // 2. Public status page slug? Serve public.html shell.
          const slugMatch = path.match(/^\/([a-z0-9-]+)\/?$/)
          if (
            slugMatch?.[1] &&
            !(RESERVED_SLUGS as readonly string[]).includes(slugMatch[1])
          ) {
            const publicShell = Bun.file(join(config.publicStaticDir, 'public.html'))
            if (await publicShell.exists()) return new Response(publicShell)
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

  const shutdown = async () => {
    console.log('Shutting down…')
    notifier.stop()
    retention.stop()
    await scheduler.drain()
    server.stop()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
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
