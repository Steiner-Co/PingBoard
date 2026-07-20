import { describe, expect, test } from 'bun:test'
import { PingBoardClient, PingBoardError } from './client'

function clientWith(handler: (req: Request) => Response | Promise<Response>) {
  const calls: Request[] = []
  const client = new PingBoardClient({
    baseUrl: 'http://pingboard.test/',
    token: 'pb_secret',
    fetchImpl: (input, init) => {
      const req = new Request(input, init)
      calls.push(req)
      return Promise.resolve(handler(req))
    },
  })
  return { client, calls }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

describe('PingBoardClient', () => {
  test('sends the bearer token and strips a trailing slash from the base URL', async () => {
    const { client, calls } = clientWith(() => json({ monitors: [] }))
    await client.get('/api/admin/monitors')
    expect(calls[0]!.url).toBe('http://pingboard.test/api/admin/monitors')
    expect(calls[0]!.headers.get('authorization')).toBe('Bearer pb_secret')
  })

  test('sends JSON bodies with a content-type only when there is a body', async () => {
    const { client, calls } = clientWith(() => json({ ok: true }))
    await client.post('/api/admin/monitors', { name: 'x' })
    expect(calls[0]!.method).toBe('POST')
    expect(calls[0]!.headers.get('content-type')).toBe('application/json')
    expect(await calls[0]!.json()).toEqual({ name: 'x' })

    const { client: c2, calls: calls2 } = clientWith(() => json({}))
    await c2.get('/api/admin/monitors')
    expect(calls2[0]!.headers.get('content-type')).toBeNull()
  })

  test('explains a 401 in terms of the token, not the status code', async () => {
    const { client } = clientWith(() => json({ error: 'Invalid API token' }, 401))
    const err = (await client.get('/x').catch((e) => e)) as PingBoardError
    expect(err).toBeInstanceOf(PingBoardError)
    expect(err.status).toBe(401)
    expect(err.message).toContain('Settings → API tokens')
  })

  test('surfaces the server error message on other failures', async () => {
    const { client } = clientWith(() => json({ error: 'Name is required' }, 400))
    const err = (await client.post('/x', {}).catch((e) => e)) as PingBoardError
    expect(err.status).toBe(400)
    expect(err.message).toContain('Name is required')
  })

  test('tolerates a non-JSON error body', async () => {
    const { client } = clientWith(() => new Response('nginx 502', { status: 502 }))
    const err = (await client.get('/x').catch((e) => e)) as PingBoardError
    expect(err.status).toBe(502)
    expect(err.message).toContain('502')
  })

  test('turns a connection failure into actionable guidance', async () => {
    const client = new PingBoardClient({
      baseUrl: 'http://pingboard.test',
      token: 'pb_secret',
      fetchImpl: () => Promise.reject(new TypeError('fetch failed')),
    })
    const err = (await client.get('/x').catch((e) => e)) as PingBoardError
    expect(err.message).toContain('Could not reach PingBoard')
    expect(err.message).toContain('PINGBOARD_URL')
  })

  test('handles 204 responses without trying to parse a body', async () => {
    const { client } = clientWith(() => new Response(null, { status: 204 }))
    expect(await client.delete('/api/admin/monitors/abc')).toBeUndefined()
  })
})
