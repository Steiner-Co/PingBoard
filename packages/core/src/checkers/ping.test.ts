import { describe, expect, test } from 'bun:test'
import type { Monitor } from '@pingboard/db'
import { checkPing } from './ping'

const pingAvailable = await isPingAvailable()

function monitor(overrides: Partial<Monitor> = {}): Monitor {
  return {
    id: 'test-ping',
    name: 'ping',
    type: 'ping',
    target: '127.0.0.1',
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

describe.skipIf(!pingAvailable)('checkPing', () => {
  test('loopback → up', async () => {
    const result = await checkPing(monitor())
    expect(result.status).toBe('up')
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0)
  })

  test('unroutable address → down', async () => {
    // RFC 5737 TEST-NET-1, guaranteed unroutable.
    const result = await checkPing(
      monitor({ target: '192.0.2.1', timeoutSeconds: 1 }),
    )
    expect(result.status).toBe('down')
  })
})

async function isPingAvailable(): Promise<boolean> {
  const { spawnSync } = await import('node:child_process')
  const result = spawnSync('ping', ['-c', '1', '-W', '1', '127.0.0.1'])
  return result.status === 0
}
