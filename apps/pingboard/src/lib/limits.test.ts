import { describe, expect, test } from 'bun:test'
import { checkLimit, isUnlimited, withinCap, type LimitedResource } from './limits'

const RESOURCES: LimitedResource[] = ['monitor', 'status_page']

describe('self-host is unlimited', () => {
  // This is the open-core guarantee. If it ever fails, the free product has
  // started capping something, and that's a promise broken.
  test('every resource reports unlimited', () => {
    for (const resource of RESOURCES) {
      expect(isUnlimited('selfhost', resource)).toBe(true)
    }
  })

  test('checkLimit passes at any count, including absurd ones', () => {
    for (const resource of RESOURCES) {
      for (const count of [0, 1, 100, 10_000, Number.MAX_SAFE_INTEGER]) {
        expect(checkLimit('selfhost', resource, count).ok).toBe(true)
      }
    }
  })
})

describe('cloud without plans is also unlimited (no SaaS yet)', () => {
  test('cloud reports unlimited until plan enforcement ships', () => {
    for (const resource of RESOURCES) {
      expect(isUnlimited('cloud', resource)).toBe(true)
      expect(checkLimit('cloud', resource, 10_000).ok).toBe(true)
    }
  })
})

describe('withinCap enforces a finite cap (the future cloud path)', () => {
  test('allows below the cap and blocks at or over it', () => {
    expect(withinCap(0, 3, 'monitor').ok).toBe(true)
    expect(withinCap(2, 3, 'monitor').ok).toBe(true)
    expect(withinCap(3, 3, 'monitor').ok).toBe(false)
    expect(withinCap(4, 3, 'monitor').ok).toBe(false)
  })

  test('a zero cap blocks the first one', () => {
    expect(withinCap(0, 0, 'monitor').ok).toBe(false)
  })

  test('the block reason names the resource and pluralises the cap', () => {
    const one = withinCap(1, 1, 'status_page')
    expect(one.ok).toBe(false)
    if (!one.ok) expect(one.reason).toContain('1 status page.')

    const many = withinCap(5, 5, 'monitor')
    expect(many.ok).toBe(false)
    if (!many.ok) expect(many.reason).toContain('5 monitors.')
  })
})
