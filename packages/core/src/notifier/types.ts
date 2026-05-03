import type { NotificationChannel, Monitor, Incident } from '@pingboard/db'
import type { NotificationChannelConfig } from '@pingboard/shared'

export type IncidentStatus = 'opened' | 'resolved'

export interface NotificationPayload {
  status: IncidentStatus
  monitor: Monitor
  incident: Incident
  baseUrl: string | null
}

export interface ChannelDriver<TConfig = NotificationChannelConfig> {
  send: (config: TConfig, payload: NotificationPayload) => Promise<void>
  testConfig: (config: TConfig) => Promise<void>
}

export function getChannelConfig<T extends NotificationChannelConfig>(
  channel: NotificationChannel,
): T {
  return channel.config as T
}

export function summarize(payload: NotificationPayload): {
  emoji: string
  title: string
  body: string
  color: number
  url: string | null
} {
  const { status, monitor, incident, baseUrl } = payload
  const url = baseUrl ? `${baseUrl}/admin/monitors/${monitor.id}` : null

  if (status === 'opened') {
    return {
      emoji: '🔴',
      title: `${monitor.name} is DOWN`,
      body: `First detected: ${incident.startedAt.toISOString()}`,
      color: 0xe53e3e,
      url,
    }
  }

  const downtimeMs =
    (incident.resolvedAt?.getTime() ?? Date.now()) - incident.startedAt.getTime()
  return {
    emoji: '🟢',
    title: `${monitor.name} is UP`,
    body: `Downtime: ${formatDuration(downtimeMs)}`,
    color: 0x38a169,
    url,
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}
