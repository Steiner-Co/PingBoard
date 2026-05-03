import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Incident, Monitor } from '@pingboard/db'
import { webhookDriver } from './webhook'
import type { NotificationPayload } from './types'

interface CapturedRequest {
  method: string
  headers: Record<string, string>
  body: unknown
}

let server: ReturnType<typeof Bun.serve>
let baseUrl: string
const captured: CapturedRequest[] = []
let nextStatus = 200

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const headers: Record<string, string> = {}
      req.headers.forEach((v, k) => (headers[k] = v))
      let body: unknown = null
      try {
        body = await req.json()
      } catch {
        body = null
      }
      captured.push({ method: req.method, headers, body })
      return new Response('ok', { status: nextStatus })
    },
  })
  baseUrl = `http://localhost:${server.port}`
})

afterAll(() => server.stop(true))

function payload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  const monitor = {
    id: 'mon-1',
    name: 'API',
    type: 'http',
    target: 'https://api.example.com',
  } as Monitor
  const incident = {
    id: 'inc-1',
    monitorId: 'mon-1',
    startedAt: new Date('2026-05-01T12:00:00Z'),
    resolvedAt: null,
    cause: 'auto',
    note: null,
  } as Incident
  return {
    status: 'opened',
    monitor,
    incident,
    baseUrl: 'https://pb.example.com',
    ...overrides,
  }
}

describe('webhookDriver.send', () => {
  test('POSTs JSON payload with monitor + incident details', async () => {
    captured.length = 0
    nextStatus = 200
    await webhookDriver.send({ url: baseUrl }, payload())
    expect(captured).toHaveLength(1)
    const req = captured[0]!
    expect(req.method).toBe('POST')
    expect(req.headers['content-type']).toContain('application/json')
    const body = req.body as Record<string, unknown>
    expect(body.status).toBe('opened')
    expect((body.monitor as { name: string }).name).toBe('API')
    expect((body.incident as { startedAt: string }).startedAt).toBe(
      '2026-05-01T12:00:00.000Z',
    )
  })

  test('respects custom method and headers', async () => {
    captured.length = 0
    nextStatus = 200
    await webhookDriver.send(
      { url: baseUrl, method: 'PUT', headers: { 'x-custom': 'hi' } },
      payload(),
    )
    expect(captured[0]!.method).toBe('PUT')
    expect(captured[0]!.headers['x-custom']).toBe('hi')
  })

  test('does not throw when target returns non-2xx (delivery is best-effort)', async () => {
    captured.length = 0
    nextStatus = 500
    await webhookDriver.send({ url: baseUrl }, payload())
    expect(captured).toHaveLength(1)
  })
})

describe('webhookDriver.testConfig', () => {
  test('200 → resolves', async () => {
    captured.length = 0
    nextStatus = 200
    await expect(webhookDriver.testConfig({ url: baseUrl })).resolves.toBeUndefined()
    expect(captured[0]!.body).toEqual({ test: true, source: 'pingboard' })
  })

  test('500 → throws', async () => {
    nextStatus = 500
    await expect(webhookDriver.testConfig({ url: baseUrl })).rejects.toThrow(
      /500/,
    )
  })
})
