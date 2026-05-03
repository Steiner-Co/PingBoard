import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Monitor } from '@pingboard/db'
import { checkTcp } from './tcp'

// Bun.listen is overloaded for TCP and Unix sockets, so its return type is a
// union; pin to the TCP variant so .port is always present.
let listener: Bun.TCPSocketListener<undefined>
let openPort: number
let closedPort: number

beforeAll(() => {
  listener = Bun.listen<undefined>({
    hostname: '127.0.0.1',
    port: 0,
    socket: {
      open() {},
      data() {},
      close() {},
      drain() {},
      error() {},
    },
  })
  openPort = listener.port

  // Pick a closed port by opening then closing a temporary listener.
  const tmp = Bun.listen<undefined>({
    hostname: '127.0.0.1',
    port: 0,
    socket: { open() {}, data() {}, close() {}, drain() {}, error() {} },
  })
  closedPort = tmp.port
  tmp.stop(true)
})

afterAll(() => listener.stop(true))

function monitor(overrides: Partial<Monitor> = {}): Monitor {
  return {
    id: 'test-tcp',
    name: 'tcp',
    type: 'tcp',
    target: `127.0.0.1:${openPort}`,
    intervalSeconds: 60,
    timeoutSeconds: 2,
    retryCount: 0,
    config: {},
    tags: [],
    paused: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Monitor
}

describe('checkTcp', () => {
  test('open port → up', async () => {
    const result = await checkTcp(monitor())
    expect(result.status).toBe('up')
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0)
    expect(result.statusCode).toBeNull()
  })

  test('closed port → down', async () => {
    const result = await checkTcp(monitor({ target: `127.0.0.1:${closedPort}` }))
    expect(result.status).toBe('down')
    expect(result.message).toBeTruthy()
  })

  test('host without port → down with explanatory message', async () => {
    const result = await checkTcp(monitor({ target: '127.0.0.1' }))
    expect(result.status).toBe('down')
    expect(result.message).toContain('host:port')
  })

  test('config.port supplies port when target omits it', async () => {
    const result = await checkTcp(
      monitor({ target: '127.0.0.1', config: { port: openPort } }),
    )
    expect(result.status).toBe('up')
  })
})
