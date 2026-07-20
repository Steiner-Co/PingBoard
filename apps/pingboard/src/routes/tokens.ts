import { desc, eq } from 'drizzle-orm'
import { apiTokens, type DB } from '@pingboard/db'
import { error, json, noContent } from '../lib/responses'
import { generateApiToken } from '../lib/api-tokens'

interface TokenDeps {
  db: DB
}

const MAX_NAME_LENGTH = 64

export async function listApiTokens(deps: TokenDeps): Promise<Response> {
  const rows = await deps.db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      lastUsedAt: apiTokens.lastUsedAt,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .orderBy(desc(apiTokens.createdAt))
  return json({ tokens: rows })
}

export async function createApiToken(
  req: Request,
  deps: TokenDeps,
): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return error(400, 'Invalid JSON body')
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return error(400, 'Name is required')
  if (name.length > MAX_NAME_LENGTH) {
    return error(400, `Name must be ${MAX_NAME_LENGTH} characters or fewer`)
  }

  const generated = generateApiToken()
  const id = crypto.randomUUID()
  await deps.db.insert(apiTokens).values({
    id,
    name,
    tokenHash: generated.hash,
    prefix: generated.prefix,
  })

  const [created] = await deps.db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      lastUsedAt: apiTokens.lastUsedAt,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.id, id))

  // The only time the secret leaves the server. It isn't stored anywhere in
  // recoverable form, so a lost token has to be replaced rather than re-read.
  return json({ token: created, secret: generated.token }, { status: 201 })
}

export async function deleteApiToken(
  id: string,
  deps: TokenDeps,
): Promise<Response> {
  const [existing] = await deps.db
    .select({ id: apiTokens.id })
    .from(apiTokens)
    .where(eq(apiTokens.id, id))
  if (!existing) return error(404, 'Token not found')
  await deps.db.delete(apiTokens).where(eq(apiTokens.id, id))
  return noContent()
}
