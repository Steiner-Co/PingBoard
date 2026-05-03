import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Monitor } from '@pingboard/db'
import { checkHttp } from './http'

let server: ReturnType<typeof Bun.serve>
let baseUrl: string

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url)
      if (url.pathname === '/ok') return new Response('hello world')
      if (url.pathname === '/fail') return new Response('nope', { status: 500 })
      if (url.pathname === '/json') return Response.json({ status: 'green' })
      if (url.pathname === '/slow') {
        return new Promise((resolve) =>
          setTimeout(() => resolve(new Response('slow')), 100),
        )
      }
      return new Response('not found', { status: 404 })
    },
  })
  baseUrl = `http://localhost:${server.port}`
})

afterAll(() => server.stop(true))

function monitor(overrides: Partial<Monitor> = {}): Monitor {
  return {
    id: 'test',
    name: 'test',
    type: 'http',
    target: `${baseUrl}/ok`,
    intervalSeconds: 60,
    timeoutSeconds: 5,
    retryCount: 0,
    config: {},
    paused: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Monitor
}

describe('checkHttp', () => {
  test('200 response → up', async () => {
    const result = await checkHttp(monitor())
    expect(result.status).toBe('up')
    expect(result.statusCode).toBe(200)
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0)
  })

  test('500 response → down', async () => {
    const result = await checkHttp(monitor({ target: `${baseUrl}/fail` }))
    expect(result.status).toBe('down')
    expect(result.statusCode).toBe(500)
  })

  test('keyword match passes', async () => {
    const result = await checkHttp(
      monitor({ config: { expectedKeyword: 'hello' } }),
    )
    expect(result.status).toBe('up')
  })

  test('keyword miss → down', async () => {
    const result = await checkHttp(
      monitor({ config: { expectedKeyword: 'goodbye' } }),
    )
    expect(result.status).toBe('down')
    expect(result.message).toContain('goodbye')
  })

  test('JSON path match passes', async () => {
    const result = await checkHttp(
      monitor({
        target: `${baseUrl}/json`,
        config: { expectedJsonPath: { path: 'status', equals: 'green' } },
      }),
    )
    expect(result.status).toBe('up')
  })

  test('JSON path mismatch → down', async () => {
    const result = await checkHttp(
      monitor({
        target: `${baseUrl}/json`,
        config: { expectedJsonPath: { path: 'status', equals: 'red' } },
      }),
    )
    expect(result.status).toBe('down')
  })

  test('timeout → down', async () => {
    const result = await checkHttp(
      monitor({ target: `${baseUrl}/slow`, timeoutSeconds: 0 }),
    )
    expect(result.status).toBe('down')
  })

  test('unreachable host → down', async () => {
    const result = await checkHttp(
      monitor({ target: 'http://127.0.0.1:1' }),
    )
    expect(result.status).toBe('down')
  })
})
