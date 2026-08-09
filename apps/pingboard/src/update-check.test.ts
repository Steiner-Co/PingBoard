import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { compareVersions, getUpdateState, startUpdateCheck } from './update-check'

const RELEASE = {
  tag_name: 'v0.6.0',
  html_url: 'https://github.com/Steiner-Co/PingBoard/releases/tag/v0.6.0',
}

function fetchOk(body: unknown = RELEASE) {
  return (_input: string, _init?: RequestInit) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
}

let savedEnv: string | undefined
let warn: ReturnType<typeof spyOn>

beforeEach(() => {
  savedEnv = process.env.PINGBOARD_UPDATE_CHECK
  delete process.env.PINGBOARD_UPDATE_CHECK
  // Failure paths log one warn line by design — keep the test output clean.
  warn = spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  if (savedEnv === undefined) delete process.env.PINGBOARD_UPDATE_CHECK
  else process.env.PINGBOARD_UPDATE_CHECK = savedEnv
  warn.mockRestore()
})

describe('compareVersions', () => {
  test('equal, older, newer', () => {
    expect(compareVersions('0.6.0', '0.6.0')).toBe(0)
    expect(compareVersions('0.5.0', '0.6.0')).toBe(-1)
    expect(compareVersions('0.7.0', '0.6.0')).toBe(1)
    expect(compareVersions('1.0.0', '0.9.9')).toBe(1)
    expect(compareVersions('0.6.1', '0.6.0')).toBe(1)
  })

  test('strips a leading v', () => {
    expect(compareVersions('0.6.0', 'v0.6.0')).toBe(0)
    expect(compareVersions('v0.5.0', 'v0.6.0')).toBe(-1)
  })

  test('dev builds compare as 0.0.0', () => {
    expect(compareVersions('0.0.0-dev', '0.0.0')).toBe(0)
    expect(compareVersions('0.0.0-dev', '0.6.0')).toBe(-1)
  })
})

describe('startUpdateCheck', () => {
  test('reports an available update with latest + url', async () => {
    let calls = 0
    await startUpdateCheck('0.5.0', (input, init) => {
      calls++
      expect(input).toContain('api.github.com/repos/Steiner-Co/PingBoard')
      expect((init?.headers as Record<string, string>)['User-Agent']).toBe(
        'pingboard/0.5.0',
      )
      return fetchOk()(input, init)
    })
    expect(calls).toBe(1)
    const state = getUpdateState()
    expect(state.state).toBe('update-available')
    expect(state.current).toBe('0.5.0')
    expect(state.latest).toBe('0.6.0')
    expect(state.url).toBe(RELEASE.html_url)
    expect(state.checkedAt).toBeString()
  })

  test('reports up-to-date when current matches latest', async () => {
    await startUpdateCheck('0.6.0', fetchOk())
    const state = getUpdateState()
    expect(state.state).toBe('up-to-date')
    expect(state.latest).toBe('0.6.0')
  })

  test('caches the result — reads do not re-fetch', async () => {
    let calls = 0
    await startUpdateCheck('0.5.0', () => {
      calls++
      return fetchOk()('', undefined)
    })
    getUpdateState()
    getUpdateState()
    expect(calls).toBe(1)
  })

  test('HTTP error leaves the state unknown', async () => {
    await startUpdateCheck('0.5.0', () =>
      Promise.resolve(new Response('nope', { status: 500 })),
    )
    expect(getUpdateState().state).toBe('unknown')
    expect(warn).toHaveBeenCalledTimes(1)
  })

  test('network failure leaves the state unknown', async () => {
    await startUpdateCheck('0.5.0', () =>
      Promise.reject(new TypeError('fetch failed')),
    )
    expect(getUpdateState().state).toBe('unknown')
    expect(warn).toHaveBeenCalledTimes(1)
  })

  test('PINGBOARD_UPDATE_CHECK=off disables without fetching', async () => {
    process.env.PINGBOARD_UPDATE_CHECK = 'off'
    let calls = 0
    await startUpdateCheck('0.5.0', () => {
      calls++
      return fetchOk()('', undefined)
    })
    expect(calls).toBe(0)
    expect(getUpdateState()).toEqual({ state: 'disabled', current: '0.5.0' })
  })

  test('dev builds are disabled without fetching', async () => {
    let calls = 0
    await startUpdateCheck('0.0.0-dev', () => {
      calls++
      return fetchOk()('', undefined)
    })
    expect(calls).toBe(0)
    expect(getUpdateState()).toEqual({ state: 'disabled', current: '0.0.0-dev' })
  })
})
