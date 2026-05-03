import type { DiscordChannelConfig } from '@pingboard/shared'
import type { ChannelDriver } from './types'
import { summarize } from './types'

export const discordDriver: ChannelDriver<DiscordChannelConfig> = {
  async send(config, payload) {
    const { emoji, title, body, color, url } = summarize(payload)
    await postDiscord(config.webhookUrl, {
      embeds: [
        {
          title: `${emoji} ${title}`,
          description: body,
          color,
          url: url ?? undefined,
          timestamp: new Date().toISOString(),
        },
      ],
    })
  },

  async testConfig(config) {
    await postDiscord(config.webhookUrl, {
      content: '✅ PingBoard test notification — your Discord webhook works.',
    })
  },
}

async function postDiscord(webhookUrl: string, body: object): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`Discord webhook returned ${response.status}`)
  }
}
