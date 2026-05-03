import { describe, expect, test } from 'bun:test'
import type { Monitor } from '@pingboard/db'
import type { DnsMonitorConfig } from '@pingboard/shared'
import { checkDns } from './dns'

function monitor(
  config: Partial<DnsMonitorConfig> = {},
  overrides: Partial<Monitor> = {},
): Monitor {
  return {
    id: 'test-dns',
    name: 'dns',
    type: 'dns',
    target: 'localhost',
    intervalSeconds: 60,
    timeoutSeconds: 5,
    retryCount: 0,
    config,
    tags: [],
    paused: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Monitor
}

describe('checkDns', () => {
  test('localhost A record resolves → up', async () => {
    const result = await checkDns(monitor({ recordType: 'A' }))
    expect(result.status).toBe('up')
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0)
  })

  test('NXDOMAIN → down', async () => {
    const result = await checkDns(
      monitor({ recordType: 'A' }, {
        target: 'definitely-does-not-exist.invalid',
      }),
    )
    expect(result.status).toBe('down')
    expect(result.message).toBeTruthy()
  })

  test('expectedValue match → up', async () => {
    const result = await checkDns(
      monitor({ recordType: 'A', expectedValue: '127.0.0.1' }),
    )
    expect(result.status).toBe('up')
  })

  test('expectedValue mismatch → down', async () => {
    const result = await checkDns(
      monitor({ recordType: 'A', expectedValue: '203.0.113.99' }),
    )
    expect(result.status).toBe('down')
    expect(result.message).toContain('203.0.113.99')
  })
})
