import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { CheckResult } from '@pingboard/shared'
import type { Monitor } from '@pingboard/db'
import { Scheduler } from './scheduler'

let server: ReturnType<typeof Bun.serve>
let baseUrl: string

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch: () => new Response('ok'),
  })
  baseUrl = `http://localhost:${server.port}`
})

afterAll(() => server.stop(true))

function monitor(overrides: Partial<Monitor> = {}): Monitor {
  return {
    id: crypto.randomUUID(),
    name: 'sched-test',
    type: 'http',
    target: baseUrl,
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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('Scheduler', () => {
  test('fires immediately on start', async () => {
    const calls: Array<[string, CheckResult]> = []
    const scheduler = new Scheduler({
      onHeartbeat: (id, result) => void calls.push([id, result]),
    })
    const m = monitor()
    scheduler.start(m)
    await wait(50)
    expect(calls.length).toBeGreaterThanOrEqual(1)
    expect(calls[0]?.[0]).toBe(m.id)
    expect(calls[0]?.[1].status).toBe('up')
    await scheduler.drain()
  })

  test('does not fire when paused', async () => {
    const calls: string[] = []
    const scheduler = new Scheduler({
      onHeartbeat: (id) => void calls.push(id),
    })
    scheduler.start(monitor({ paused: true }))
    await wait(50)
    expect(calls).toEqual([])
    await scheduler.drain()
  })

  test('stop cancels future ticks', async () => {
    const calls: string[] = []
    const scheduler = new Scheduler({
      onHeartbeat: (id) => void calls.push(id),
    })
    const m = monitor({ intervalSeconds: 1 })
    scheduler.start(m)
    await wait(30)
    scheduler.stop(m.id)
    const countAfterStop = calls.length
    await wait(150)
    expect(calls.length).toBe(countAfterStop)
  })

  test('drain stops scheduling and clears entries', async () => {
    const scheduler = new Scheduler({ onHeartbeat: () => {} })
    scheduler.start(monitor())
    scheduler.start(monitor())
    await scheduler.drain()
    expect(scheduler.has('any')).toBe(false)
  })
})
