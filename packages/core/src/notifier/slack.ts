import type { SlackChannelConfig } from '@pingboard/shared'
import type { ChannelDriver } from './types'
import { summarize } from './types'

export const slackDriver: ChannelDriver<SlackChannelConfig> = {
  async send(config, payload) {
    const { emoji, title, body, url } = summarize(payload)
    const text = url ? `${emoji} *${title}*\n${body}\n<${url}|View monitor>` : `${emoji} *${title}*\n${body}`
    await postSlack(config.webhookUrl, { text })
  },

  async testConfig(config) {
    await postSlack(config.webhookUrl, {
      text: '✅ PingBoard test notification — your Slack webhook works.',
    })
  },
}

async function postSlack(webhookUrl: string, body: object): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`Slack webhook returned ${response.status}`)
  }
}
