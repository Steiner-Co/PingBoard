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
