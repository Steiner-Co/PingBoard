export type MonitorType =
  | 'http'
  | 'tcp'
  | 'ping'
  | 'dns'
  | 'ssl'
  | 'domain'
  | 'push'
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
  channelIds: string[]
}

// Enriched portfolio facts for a domain monitor (dates arrive as ISO strings).
export interface DomainFacts {
  monitorId: string
  registrar: string | null
  expiryAt: string | null
  registeredAt: string | null
  nameservers: string[]
  statuses: string[]
  dns: { a: string[]; mx: string[]; ns: string[] } | null
  sslIssuer: string | null
  sslExpiryAt: string | null
  collectedAt: string
}

export interface DomainWithFacts extends Monitor {
  facts: DomainFacts | null
  latest: Heartbeat | null
  channelIds: string[]
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
  monitorCount?: number
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
