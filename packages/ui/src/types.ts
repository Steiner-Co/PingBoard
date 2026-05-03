export type MonitorType = 'http' | 'tcp' | 'ping' | 'dns'
export type CheckStatus = 'up' | 'down' | 'degraded'
export type ChannelType = 'email' | 'webhook' | 'discord' | 'slack' | 'ntfy'
export type Theme = 'light' | 'dark' | 'auto'

export interface Monitor {
  id: string
  name: string
  type: MonitorType
  target: string
  intervalSeconds: number
  timeoutSeconds: number
  retryCount: number
  config: Record<string, unknown>
  tags: string[]
  paused: boolean
  createdAt: string
  updatedAt: string
}

export interface Heartbeat {
  id: number
  monitorId: string
  status: CheckStatus
  responseTimeMs: number | null
  statusCode: number | null
  message: string | null
  checkedAt: string
}

export interface MonitorWithLatest extends Monitor {
  latest: Heartbeat | null
}

export interface Incident {
  id: string
  monitorId: string
  startedAt: string
  resolvedAt: string | null
  cause: 'auto' | 'manual'
  note: string | null
}

export interface NotificationChannel {
  id: string
  name: string
  type: ChannelType
  config: Record<string, unknown>
  enabled: boolean
}

export interface StatusPage {
  id: string
  slug: string
  title: string
  description: string | null
  theme: Theme
  passwordSet: boolean
  customDomain: string | null
  createdAt: string
}

export interface User {
  userId: string
  email: string
}
