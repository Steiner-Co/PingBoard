/**
 * Thin REST client for a running PingBoard instance.
 *
 * The MCP server deliberately does not touch the SQLite file directly: the
 * instance normally runs in a container, and going through the HTTP API means
 * the same server works against localhost or a remote deployment, and inherits
 * the API-token auth rather than inventing a second way in.
 */

export class PingBoardError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'PingBoardError'
  }
}

/** Only the call signature is needed — `typeof fetch` drags in runtime extras
 *  (Bun's `preconnect`) that make the seam awkward to substitute in tests. */
export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>

export interface ClientOptions {
  baseUrl: string
  token: string
  fetchImpl?: FetchLike
}

export class PingBoardClient {
  private readonly baseUrl: string
  private readonly token: string
  private readonly fetchImpl: FetchLike

  constructor({ baseUrl, token, fetchImpl }: ClientOptions) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.token = token
    this.fetchImpl = fetchImpl ?? fetch
  }

  async request<T>(
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    let res: Response
    try {
      res = await this.fetchImpl(url, {
        method: init.method ?? 'GET',
        headers: {
          authorization: `Bearer ${this.token}`,
          ...(init.body === undefined
            ? {}
            : { 'content-type': 'application/json' }),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      })
    } catch (err) {
      // A connection failure is the single most likely problem in practice, so
      // say what to check rather than surfacing a bare TypeError.
      throw new PingBoardError(
        `Could not reach PingBoard at ${this.baseUrl}. Is it running, and is PINGBOARD_URL correct? (${
          err instanceof Error ? err.message : String(err)
        })`,
      )
    }

    if (res.status === 401) {
      throw new PingBoardError(
        'PingBoard rejected the API token. Create one under Settings → API tokens and set PINGBOARD_TOKEN.',
        401,
      )
    }
    if (!res.ok) {
      let detail = ''
      try {
        const body = (await res.json()) as { error?: string }
        detail = body.error ? ` — ${body.error}` : ''
      } catch {
        // Non-JSON error body; the status alone will have to do.
      }
      throw new PingBoardError(`PingBoard returned ${res.status}${detail}`, res.status)
    }
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path)
  }
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: body ?? {} })
  }
  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body })
  }
  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' })
  }
}
