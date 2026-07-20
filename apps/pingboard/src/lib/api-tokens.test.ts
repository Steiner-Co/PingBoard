import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apiTokens, createDb, runMigrations, type DB } from '@pingboard/db'
import {
  bearerFromRequest,
  generateApiToken,
  hashApiToken,
  verifyApiToken,
} from './api-tokens'

let dir: string
let db: DB

const MIGRATIONS_DIR = join(
  import.meta.dir,
  '..',
  '..',
  '..',
  '..',
  'packages',
  'db',
  'drizzle',
)

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pingboard-tokens-'))
  const dbPath = join(dir, 'test.db')
  runMigrations(dbPath, MIGRATIONS_DIR)
  db = createDb(dbPath)
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

async function store(name = 'CI') {
  const generated = generateApiToken()
  await db.insert(apiTokens).values({
    id: crypto.randomUUID(),
    name,
    tokenHash: generated.hash,
    prefix: generated.prefix,
  })
  return generated
}

describe('generateApiToken', () => {
  test('is prefixed, URL-safe, and unique per call', () => {
    const a = generateApiToken()
    const b = generateApiToken()
    expect(a.token.startsWith('pb_')).toBe(true)
    expect(a.token).not.toBe(b.token)
    expect(a.token).toMatch(/^pb_[A-Za-z0-9_-]+$/)
    // 32 random bytes -> 43 base64url chars, plus the 3-char prefix.
    expect(a.token.length).toBe(46)
  })

  test('never stores the secret itself', async () => {
    const generated = await store()
    const [row] = await db.select().from(apiTokens)
    expect(row!.tokenHash).toBe(hashApiToken(generated.token))
    expect(row!.tokenHash).not.toBe(generated.token)
    expect(row!.prefix.startsWith('pb_')).toBe(true)
    expect(generated.token.startsWith(row!.prefix)).toBe(true)
  })
})

describe('bearerFromRequest', () => {
  const withHeader = (v?: string) =>
    new Request('http://x/', v ? { headers: { authorization: v } } : undefined)

  test('reads a bearer token case-insensitively', () => {
    expect(bearerFromRequest(withHeader('Bearer abc'))).toBe('abc')
    expect(bearerFromRequest(withHeader('bearer abc'))).toBe('abc')
  })

  test('ignores other schemes and empty values', () => {
    expect(bearerFromRequest(withHeader('Basic abc'))).toBeNull()
    expect(bearerFromRequest(withHeader('Bearer'))).toBeNull()
    expect(bearerFromRequest(withHeader('Bearer   '))).toBeNull()
    expect(bearerFromRequest(withHeader())).toBeNull()
  })
})

describe('verifyApiToken', () => {
  test('accepts a stored token and rejects an unknown one', async () => {
    const generated = await store('deploy bot')
    const ok = await verifyApiToken(db, generated.token)
    expect(ok?.name).toBe('deploy bot')

    expect(await verifyApiToken(db, generateApiToken().token)).toBeNull()
  })

  test('rejects tokens without the prefix without touching the DB', async () => {
    await store()
    expect(await verifyApiToken(db, 'not-a-pingboard-token')).toBeNull()
  })

  test('rejects a revoked token', async () => {
    const generated = await store()
    await db.delete(apiTokens)
    expect(await verifyApiToken(db, generated.token)).toBeNull()
  })

  test('records last-used on first use', async () => {
    const generated = await store()
    const [before] = await db.select().from(apiTokens)
    expect(before!.lastUsedAt).toBeNull()

    await verifyApiToken(db, generated.token)
    const [after] = await db.select().from(apiTokens)
    expect(after!.lastUsedAt).not.toBeNull()
  })

  test('throttles last-used writes on rapid reuse', async () => {
    const generated = await store()
    await verifyApiToken(db, generated.token)
    const [first] = await db.select().from(apiTokens)
    const stamp = first!.lastUsedAt?.getTime()

    await verifyApiToken(db, generated.token)
    const [second] = await db.select().from(apiTokens)
    // Same timestamp: the second call must not have written again.
    expect(second!.lastUsedAt?.getTime()).toBe(stamp!)
  })
})
