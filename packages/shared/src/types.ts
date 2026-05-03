export type MonitorType = 'http' | 'tcp' | 'ping' | 'dns'

export type CheckStatus = 'up' | 'down' | 'degraded'

export type NotificationChannelType =
  | 'email'
  | 'webhook'
  | 'discord'
  | 'slack'
  | 'ntfy'

export type IncidentCause = 'auto' | 'manual'

export type Theme = 'light' | 'dark' | 'auto'

export interface CheckResult {
  status: CheckStatus
  responseTimeMs: number | null
  statusCode: number | null
  message: string | null
  checkedAt: Date
}

export interface HttpMonitorConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'
  headers?: Record<string, string>
  body?: string
  expectedStatusCodes?: number[]
  expectedKeyword?: string
  expectedJsonPath?: { path: string; equals: unknown }
  followRedirects?: boolean
  verifyTls?: boolean
}

export interface TcpMonitorConfig {
  port: number
}

export interface DnsMonitorConfig {
  recordType: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS'
  expectedValue?: string
  resolver?: string
}

export type MonitorConfig =
  | HttpMonitorConfig
  | TcpMonitorConfig
  | DnsMonitorConfig
  | Record<string, never>

export interface EmailChannelConfig {
  to: string
  // SMTP fields are optional; missing values fall back to instance-wide
  // defaults configured in Settings.
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPass?: string
  smtpFrom?: string
  smtpSecure?: boolean
}

export interface WebhookChannelConfig {
  url: string
  method?: 'POST' | 'PUT'
  headers?: Record<string, string>
}

export interface DiscordChannelConfig {
  webhookUrl: string
}

export interface SlackChannelConfig {
  webhookUrl: string
}

export interface NtfyChannelConfig {
  serverUrl: string
  topic: string
  authToken?: string
  priority?: 1 | 2 | 3 | 4 | 5
}

export type NotificationChannelConfig =
  | EmailChannelConfig
  | WebhookChannelConfig
  | DiscordChannelConfig
  | SlackChannelConfig
  | NtfyChannelConfig
