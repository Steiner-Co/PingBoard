import type { NtfyChannelConfig } from '@pingboard/shared'
import type { ChannelDriver } from './types'
import { summarize } from './types'

export const ntfyDriver: ChannelDriver<NtfyChannelConfig> = {
  async send(config, payload) {
    const { emoji, title, body, url } = summarize(payload)
    await postNtfy(config, {
      title: `${emoji} ${title}`,
      message: body,
      priority: config.priority ?? 3,
      ...(url ? { click: url } : {}),
    })
  },

  async testConfig(config) {
    await postNtfy(config, {
      title: 'PingBoard test',
      message: '✅ PingBoard test notification — your ntfy topic works.',
      priority: 3,
    })
  },
}

async function postNtfy(
  config: NtfyChannelConfig,
  payload: object,
): Promise<void> {
  const url = `${config.serverUrl.replace(/\/$/, '')}/${config.topic}`
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (config.authToken) headers.authorization = `Bearer ${config.authToken}`

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ topic: config.topic, ...payload }),
  })
  if (!response.ok) {
    throw new Error(`ntfy returned ${response.status}`)
  }
}
