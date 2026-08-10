import { describe, expect, test } from 'bun:test'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { PingBoardClient } from './client'
import { registerTools } from './tools'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const PAGE = {
  id: 'p1',
  slug: 'status',
  title: 'Status',
  description: null,
  theme: 'auto',
  passwordSet: false,
  hideBranding: false,
  customDomain: null,
  logoPath: null,
  accent: null,
  websiteUrl: null,
  customCss: null,
}

/** Wires the real tool registry to a stub fetch over an in-memory transport. */
async function setup(handler: (req: Request) => Response | Promise<Response>) {
  const calls: Request[] = []
  const api = new PingBoardClient({
    baseUrl: 'http://pingboard.test',
    token: 'pb_secret',
    fetchImpl: (input, init) => {
      const req = new Request(input, init)
      calls.push(req)
      return Promise.resolve(handler(req))
    },
  })
  const server = new McpServer({ name: 'pingboard-test', version: '0.0.0' })
  registerTools(server, api)
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const mcp = new Client({ name: 'test-client', version: '0.0.0' })
  await Promise.all([server.connect(serverTransport), mcp.connect(clientTransport)])
  return {
    mcp,
    calls,
    async close() {
      await mcp.close()
      await server.close()
    },
  }
}

async function callTool(mcp: Client, name: string, args: Record<string, unknown> = {}) {
  const result = await mcp.callTool({ name, arguments: args })
  const content = result.content as { type: string; text: string }[]
  const text = content[0]?.text ?? ''
  return { isError: result.isError === true, text, data: result.isError ? null : JSON.parse(text) }
}

describe('status page tools', () => {
  test('get_status_page returns the page summary and mapped monitor links', async () => {
    const { mcp, calls, close } = await setup(() =>
      json({
        page: { ...PAGE, logoPath: 'p1.png' },
        monitors: [
          { statusPageId: 'p1', monitorId: 'm1', groupName: 'APIs', sortOrder: 0 },
          { statusPageId: 'p1', monitorId: 'm2', groupName: null, sortOrder: 1 },
        ],
      }),
    )
    const { data } = await callTool(mcp, 'get_status_page', { pageId: 'p1' })
    expect(calls[0]!.url).toBe('http://pingboard.test/api/admin/pages/p1')
    expect(data.page.hasLogo).toBe(true)
    expect(data.page.path).toBe('/status')
    expect(data.monitors).toEqual([
      { monitorId: 'm1', groupName: 'APIs', sortOrder: 0 },
      { monitorId: 'm2', groupName: null, sortOrder: 1 },
    ])
    await close()
  })

  test('create_status_page normalizes the slug and posts the body', async () => {
    const { mcp, calls, close } = await setup(() => json({ page: PAGE }, 201))
    const { isError, data } = await callTool(mcp, 'create_status_page', {
      slug: 'My-Status',
      title: 'My Status',
      monitors: [{ monitorId: 'm1', groupName: 'APIs' }],
      accent: 'violet',
    })
    expect(isError).toBe(false)
    expect(calls[0]!.method).toBe('POST')
    expect(await calls[0]!.json()).toEqual({
      slug: 'my-status',
      title: 'My Status',
      monitors: [{ monitorId: 'm1', groupName: 'APIs' }],
      accent: 'violet',
    })
    expect(data.id).toBe('p1')
    await close()
  })

  test('create_status_page rejects bad slugs without touching the API', async () => {
    const { mcp, calls, close } = await setup(() => json({}))
    const invalid = await callTool(mcp, 'create_status_page', { slug: 'Not A Slug!' })
    expect(invalid.isError).toBe(true)
    expect(invalid.text).toContain('lowercase letters, digits, and hyphens')

    const reserved = await callTool(mcp, 'create_status_page', { slug: 'admin' })
    expect(reserved.isError).toBe(true)
    expect(reserved.text).toContain('reserved')

    expect(calls.length).toBe(0)
    await close()
  })

  test('update_status_page patches only the fields provided', async () => {
    const { mcp, calls, close } = await setup(() => json({ page: PAGE }))
    await callTool(mcp, 'update_status_page', { pageId: 'p1', title: 'New title' })
    expect(calls[0]!.method).toBe('PATCH')
    expect(calls[0]!.url).toBe('http://pingboard.test/api/admin/pages/p1')
    expect(await calls[0]!.json()).toEqual({ title: 'New title' })
    await close()
  })

  test('update_status_page passes explicit nulls through so fields clear', async () => {
    const { mcp, calls, close } = await setup(() => json({ page: PAGE }))
    await callTool(mcp, 'update_status_page', {
      pageId: 'p1',
      password: null,
      accent: null,
    })
    expect(await calls[0]!.json()).toEqual({ password: null, accent: null })
    await close()
  })

  test('delete_status_page issues a DELETE and confirms the id', async () => {
    const { mcp, calls, close } = await setup(
      () => new Response(null, { status: 204 }),
    )
    const { data } = await callTool(mcp, 'delete_status_page', { pageId: 'p1' })
    expect(calls[0]!.method).toBe('DELETE')
    expect(calls[0]!.url).toBe('http://pingboard.test/api/admin/pages/p1')
    expect(data).toEqual({ deleted: 'p1' })
    await close()
  })

  test('server errors surface as tool errors, not exceptions', async () => {
    const { mcp, close } = await setup(() =>
      json({ error: 'Slug already in use' }, 409),
    )
    const { isError, text } = await callTool(mcp, 'create_status_page', {
      slug: 'status',
    })
    expect(isError).toBe(true)
    expect(text).toContain('Slug already in use')
    await close()
  })
})

const MONITOR_ROW = {
  id: 'm1',
  name: 'API',
  type: 'http',
  target: 'https://api.example.com',
  intervalSeconds: 60,
  timeoutSeconds: 10,
  retryCount: 1,
  config: { expectedStatusCodes: [200] },
  tags: ['core'],
  paused: false,
  latest: { status: 'up', responseTimeMs: 42, statusCode: 200, message: null, checkedAt: '2026-08-10T00:00:00Z' },
  channelIds: ['c1'],
}

describe('monitor update and incident lookup', () => {
  test('update_monitor patches only the fields provided', async () => {
    const { mcp, calls, close } = await setup(() => json({ monitor: MONITOR_ROW }))
    await callTool(mcp, 'update_monitor', { monitorId: 'm1', retryCount: 2 })
    expect(calls[0]!.method).toBe('PATCH')
    expect(calls[0]!.url).toBe('http://pingboard.test/api/admin/monitors/m1')
    expect(await calls[0]!.json()).toEqual({ retryCount: 2 })
    await close()
  })

  test('list_incidents filters by monitorId and state together', async () => {
    const incidents = [
      { id: 'i1', monitorId: 'm1', monitorName: 'API', startedAt: 'a', resolvedAt: null, cause: 'auto', note: null },
      { id: 'i2', monitorId: 'm2', monitorName: 'Web', startedAt: 'b', resolvedAt: null, cause: 'auto', note: null },
      { id: 'i3', monitorId: 'm1', monitorName: 'API', startedAt: 'c', resolvedAt: 'd', cause: 'auto', note: null },
    ]
    const { mcp, close } = await setup(() => json({ incidents }))
    const { data } = await callTool(mcp, 'list_incidents', {
      monitorId: 'm1',
      state: 'open',
    })
    expect(data).toEqual([incidents[0]])
    await close()
  })

  test('get_incident finds one and errors on an unknown id', async () => {
    const incidents = [
      { id: 'i1', monitorId: 'm1', monitorName: 'API', startedAt: 'a', resolvedAt: null, cause: 'auto', note: 'noisy neighbor' },
    ]
    const { mcp, close } = await setup(() => json({ incidents }))
    const found = await callTool(mcp, 'get_incident', { incidentId: 'i1' })
    expect(found.data.note).toBe('noisy neighbor')

    const missing = await callTool(mcp, 'get_incident', { incidentId: 'nope' })
    expect(missing.isError).toBe(true)
    expect(missing.text).toContain('not found')
    await close()
  })
})

describe('config backup', () => {
  const WINDOW = {
    id: 'w1',
    monitorId: 'm1',
    title: 'DB migration',
    description: null,
    startsAt: '2026-08-11T02:00:00Z',
    endsAt: '2026-08-11T04:00:00Z',
  }

  function exportHandler(req: Request): Response {
    const path = new URL(req.url).pathname
    if (path === '/api/admin/monitors') return json({ monitors: [MONITOR_ROW] })
    if (path === '/api/admin/pages') return json({ pages: [PAGE] })
    if (path === '/api/admin/pages/p1')
      return json({
        page: PAGE,
        monitors: [{ statusPageId: 'p1', monitorId: 'm1', groupName: 'APIs', sortOrder: 0 }],
      })
    if (path === '/api/admin/maintenance-windows') return json({ windows: [WINDOW] })
    return json({ error: 'unexpected ' + path }, 500)
  }

  test('export_config aggregates monitors, pages and windows into one backup', async () => {
    const { mcp, close } = await setup(exportHandler)
    const { data } = await callTool(mcp, 'export_config')
    expect(data.version).toBe(1)
    expect(data.monitors).toHaveLength(1)
    expect(data.monitors[0].config).toEqual({ expectedStatusCodes: [200] })
    expect(data.monitors[0].latest).toBeUndefined()
    expect(data.statusPages[0].monitors).toEqual([
      { monitorId: 'm1', groupName: 'APIs', sortOrder: 0 },
    ])
    expect(data.maintenanceWindows[0].title).toBe('DB migration')
    await close()
  })

  test('import_config recreates items and remaps monitor references', async () => {
    const posted: Record<string, unknown>[] = []
    const { mcp, close } = await setup((req) => {
      const path = new URL(req.url).pathname
      if (req.method === 'POST') {
        return req.json().then((body) => {
          posted.push(body as Record<string, unknown>)
          if (path === '/api/admin/monitors')
            return json({ monitor: { ...MONITOR_ROW, id: 'new-m1' } }, 201)
          if (path === '/api/admin/pages') return json({ page: PAGE }, 201)
          if (path === '/api/admin/maintenance-windows') return json({ window: WINDOW }, 201)
          return json({ error: 'unexpected ' + path }, 500)
        })
      }
      return json({ error: 'unexpected ' + path }, 500)
    })

    const backup = {
      monitors: [{ ...MONITOR_ROW, latest: undefined, channelIds: undefined }],
      statusPages: [
        { slug: 'status', monitors: [{ monitorId: 'm1', groupName: 'APIs', sortOrder: 0 }, { monitorId: 'gone', sortOrder: 1 }] },
      ],
      maintenanceWindows: [WINDOW],
    }
    const { data } = await callTool(mcp, 'import_config', { backup })

    expect(data.created).toEqual({ monitors: 1, statusPages: 1, maintenanceWindows: 1 })
    expect(data.idMap).toEqual({ m1: 'new-m1' })
    // Page and window were posted with the NEW monitor id, not the old one.
    expect(posted[1]).toMatchObject({ slug: 'status', monitors: [{ monitorId: 'new-m1', groupName: 'APIs', sortOrder: 0 }] })
    expect(posted[2]).toMatchObject({ monitorId: 'new-m1', title: 'DB migration' })
    // The link to the unknown monitor was dropped with an explanation.
    expect(data.errors).toHaveLength(1)
    expect(data.errors[0]).toContain('dropped')
    await close()
  })

  test('import_config collects per-item errors and keeps going', async () => {
    const { mcp, close } = await setup((req) => {
      const path = new URL(req.url).pathname
      if (path === '/api/admin/monitors') return json({ error: 'Target required' }, 400)
      if (path === '/api/admin/pages') return json({ page: PAGE }, 201)
      return json({}, 201)
    })
    const { data } = await callTool(mcp, 'import_config', {
      backup: {
        monitors: [{ name: 'Broken', type: 'http' }],
        statusPages: [{ slug: 'status' }],
      },
    })
    expect(data.created.monitors).toBe(0)
    expect(data.created.statusPages).toBe(1)
    expect(data.errors[0]).toContain('Target required')
    await close()
  })
})
