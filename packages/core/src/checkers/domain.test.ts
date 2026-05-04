import { describe, expect, test } from 'bun:test'
import { parseExpiry } from './domain'

describe('parseExpiry', () => {
  test('parses .com Registry Expiry Date', () => {
    const sample = `
      Domain Name: EXAMPLE.COM
      Registry Domain ID: 2336799_DOMAIN_COM-VRSN
      Registrar WHOIS Server: whois.iana.org
      Updated Date: 2024-08-14T07:01:34Z
      Creation Date: 1995-08-14T04:00:00Z
      Registry Expiry Date: 2027-08-13T04:00:00Z
    `
    const got = parseExpiry(sample)
    expect(got?.toISOString()).toBe('2027-08-13T04:00:00.000Z')
  })

  test('parses .io Expiry Date', () => {
    const sample = `
      Domain Name: example.io
      Registry Domain ID: D503300001234567890-LRMS
      Registrar WHOIS Server: whois.nic.io
      Expiry Date: 2026-09-15T12:00:00Z
    `
    const got = parseExpiry(sample)
    expect(got?.toISOString()).toBe('2026-09-15T12:00:00.000Z')
  })

  test('returns null for unrecognized format', () => {
    expect(parseExpiry('No expiry information at all')).toBeNull()
  })
})
