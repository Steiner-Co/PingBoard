import type { WebhookChannelConfig } from '@pingboard/shared'
import type { ChannelDriver } from './types'

export const webhookDriver: ChannelDriver<WebhookChannelConfig> = {
  async send(config, payload) {
    requireUrl(config)
    const body = JSON.stringify({
      status: payload.status,
      monitor: {
        id: payload.monitor.id,
        name: payload.monitor.name,
        type: payload.monitor.type,
        target: payload.monitor.target,
      },
      incident: {
        id: payload.incident.id,
        startedAt: payload.incident.startedAt.toISOString(),
        resolvedAt: payload.incident.resolvedAt?.toISOString() ?? null,
      },
      baseUrl: payload.baseUrl,
    })
    await fetch(config.url, {
      method: config.method ?? 'POST',
      headers: {
        'content-type': 'application/json',
        ...config.headers,
      },
      body,
    })
  },

  async testConfig(config) {
    requireUrl(config)
    const response = await fetch(config.url, {
      method: config.method ?? 'POST',
      headers: { 'content-type': 'application/json', ...config.headers },
      body: JSON.stringify({ test: true, source: 'pingboard' }),
    })
    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`)
    }
  },
}

function requireUrl(config: WebhookChannelConfig): void {
  if (!config.url || !config.url.trim()) {
    throw new Error('Webhook URL is required')
  }
}
