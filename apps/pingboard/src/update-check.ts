const RELEASES_URL =
  'https://api.github.com/repos/Steiner-Co/PingBoard/releases/latest'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

/** Only the call signature is needed — `typeof fetch` drags in runtime extras
 *  (Bun's `preconnect`) that make the seam awkward to substitute in tests. */
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface UpdateInfo {
  state: 'up-to-date' | 'update-available' | 'unknown' | 'disabled'
  current: string
  latest?: string
  url?: string
  checkedAt?: string
}

let state: UpdateInfo = { state: 'unknown', current: '0.0.0-dev' }
let timer: ReturnType<typeof setInterval> | null = null

/** -1 when `current` is older, 0 when equal, 1 when newer. */
export function compareVersions(current: string, latest: string): number {
  const a = current.replace(/^v/, '').split('.')
  const b = latest.replace(/^v/, '').split('.')
  for (let i = 0; i < 3; i++) {
    const diff =
      (Number.parseInt(a[i] ?? '0', 10) || 0) -
      (Number.parseInt(b[i] ?? '0', 10) || 0)
    if (diff !== 0) return diff < 0 ? -1 : 1
  }
  return 0
}

export function getUpdateState(): UpdateInfo {
  return state
}

/**
 * Daily "is there a newer release?" probe against the GitHub releases API.
 * Result lives in memory only — a restart simply re-checks. Returns the
 * initial check's promise so tests can await it; callers ignore it.
 */
export function startUpdateCheck(
  version: string,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  if (timer) {
    clearInterval(timer)
    timer = null
  }

  // Dev builds and explicit opt-outs shouldn't phone home at all.
  if (process.env.PINGBOARD_UPDATE_CHECK === 'off' || version === '0.0.0-dev') {
    state = { state: 'disabled', current: version }
    return Promise.resolve()
  }

  state = { state: 'unknown', current: version }

  const check = async (): Promise<void> => {
    try {
      const res = await fetchImpl(RELEASES_URL, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': `pingboard/${version}`,
        },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) throw new Error(`GitHub responded ${res.status}`)
      const data = (await res.json()) as {
        tag_name?: string
        html_url?: string
      }
      if (!data.tag_name || !data.html_url) {
        throw new Error('unexpected release payload')
      }
      const latest = data.tag_name.replace(/^v/, '')
      state = {
        state:
          compareVersions(version, latest) < 0
            ? 'update-available'
            : 'up-to-date',
        current: version,
        latest,
        url: data.html_url,
        checkedAt: new Date().toISOString(),
      }
    } catch (err) {
      // Fires at boot and then once a day — one warn line, no retry storm.
      console.warn(
        'Update check failed:',
        err instanceof Error ? err.message : err,
      )
      state = { state: 'unknown', current: version }
    }
  }

  timer = setInterval(() => void check(), CHECK_INTERVAL_MS)
  timer.unref()
  return check()
}
