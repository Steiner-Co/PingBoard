import { describe, expect, test } from 'bun:test'
import {
  parseCreation,
  parseExpiry,
  parseNameservers,
  parseRdap,
  parseRegistrar,
  parseStatuses,
} from './domain'

// A representative .com registry response, with the noise fields (Registrar
// URL / WHOIS Server / IANA ID) that the registrar parser must not confuse for
// the registrar name.
const SAMPLE_COM = `
   Domain Name: EXAMPLE.COM
   Registry Domain ID: 2336799_DOMAIN_COM-VRSN
   Registrar WHOIS Server: whois.markmonitor.com
   Registrar URL: http://www.markmonitor.com
   Updated Date: 2024-08-14T07:01:34Z
   Creation Date: 1995-08-14T04:00:00Z
   Registry Expiry Date: 2027-08-13T04:00:00Z
   Registrar: MarkMonitor Inc.
   Registrar IANA ID: 292
   Domain Status: clientDeleteProhibited https://icann.org/epp#clientDeleteProhibited
   Domain Status: clientTransferProhibited https://icann.org/epp#clientTransferProhibited
   Name Server: A.IANA-SERVERS.NET
   Name Server: B.IANA-SERVERS.NET
`

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

describe('parseRegistrar', () => {
  test('picks the registrar name, not URL / WHOIS server / IANA ID', () => {
    expect(parseRegistrar(SAMPLE_COM)).toBe('MarkMonitor Inc.')
  })

  test('handles the "Sponsoring Registrar" variant', () => {
    expect(parseRegistrar('Sponsoring Registrar: Gandi SAS')).toBe('Gandi SAS')
  })

  test('returns null when absent', () => {
    expect(parseRegistrar('Domain Name: example.com')).toBeNull()
  })
})

describe('parseCreation', () => {
  test('parses the creation date', () => {
    expect(parseCreation(SAMPLE_COM)?.toISOString()).toBe(
      '1995-08-14T04:00:00.000Z',
    )
  })

  test('returns null when absent', () => {
    expect(parseCreation('No dates here')).toBeNull()
  })
})

describe('parseNameservers', () => {
  test('collects and lowercases nameservers', () => {
    expect(parseNameservers(SAMPLE_COM)).toEqual([
      'a.iana-servers.net',
      'b.iana-servers.net',
    ])
  })

  test('handles the ccTLD "nserver" variant and dedupes', () => {
    const sample = 'nserver: ns1.example.net\nnserver: NS1.EXAMPLE.NET'
    expect(parseNameservers(sample)).toEqual(['ns1.example.net'])
  })

  test('returns empty array when absent', () => {
    expect(parseNameservers('nothing')).toEqual([])
  })
})

describe('parseStatuses', () => {
  test('extracts EPP status codes without the trailing URL', () => {
    expect(parseStatuses(SAMPLE_COM)).toEqual([
      'clientDeleteProhibited',
      'clientTransferProhibited',
    ])
  })

  test('returns empty array when absent', () => {
    expect(parseStatuses('Domain Name: example.com')).toEqual([])
  })
})

describe('parseRdap', () => {
  // Shape mirrors a real Verisign RDAP response.
  const RDAP = {
    events: [
      { eventAction: 'registration', eventDate: '2007-10-09T18:20:50Z' },
      { eventAction: 'expiration', eventDate: '2026-10-09T18:20:50Z' },
      { eventAction: 'last changed', eventDate: '2024-09-07T09:16:33Z' },
    ],
    status: ['client delete prohibited', 'client transfer prohibited'],
    entities: [
      {
        roles: ['registrar'],
        vcardArray: ['vcard', [['version', {}, 'text', '4.0'], ['fn', {}, 'text', 'MarkMonitor Inc.']]],
      },
    ],
    nameservers: [{ ldhName: 'DNS1.P08.NSONE.NET' }, { ldhName: 'NS-520.AWSDNS-01.NET' }],
  }

  test('extracts expiry, registration, registrar, statuses, nameservers', () => {
    const r = parseRdap(RDAP)
    expect(r.expiryAt?.toISOString()).toBe('2026-10-09T18:20:50.000Z')
    expect(r.registeredAt?.toISOString()).toBe('2007-10-09T18:20:50.000Z')
    expect(r.registrar).toBe('MarkMonitor Inc.')
    expect(r.statuses).toEqual(['client delete prohibited', 'client transfer prohibited'])
    expect(r.nameservers).toEqual(['dns1.p08.nsone.net', 'ns-520.awsdns-01.net'])
    expect(r.source).toBe('rdap')
  })

  test('degrades gracefully on an empty / error body', () => {
    const r = parseRdap({ errorCode: 404 })
    expect(r.expiryAt).toBeNull()
    expect(r.registrar).toBeNull()
    expect(r.nameservers).toEqual([])
  })
})
