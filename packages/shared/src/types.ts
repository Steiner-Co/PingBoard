export type MonitorType =
  | 'http'
  | 'tcp'
  | 'ping'
  | 'dns'
  | 'ssl'
  | 'domain'
  | 'push'

export type CheckStatus = 'up' | 'down' | 'degraded'

export type NotificationChannelType =
  | 'email'
  | 'webhook'
  | 'discord'
  | 'slack'
  | 'ntfy'

export type IncidentCause = 'auto' | 'manual'

export type Theme = 'light' | 'dark' | 'auto'

/**
 * Enriched facts about a domain, collected alongside its expiry check. Every
 * field beyond expiry is best-effort — WHOIS formats vary by TLD, and a domain
 * may not serve HTTPS — so anything unavailable is simply null/empty rather
 * than failing the check.
 */
export interface DomainFacts {
  expiryAt: Date | null
  registeredAt: Date | null
  registrar: string | null
  nameservers: string[]
  statuses: string[]
  dns: { a: string[]; mx: string[]; ns: string[] } | null
  ssl: { issuer: string | null; expiryAt: Date | null } | null
}

export interface CheckResult {
  status: CheckStatus
  responseTimeMs: number | null
  statusCode: number | null
  message: string | null
  checkedAt: Date
  /** Populated only by the domain checker; drives the Domains portfolio view. */
  facts?: DomainFacts
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

export interface SslMonitorConfig {
  warningDays?: number
  criticalDays?: number
  port?: number
}

export interface DomainMonitorConfig {
  warningDays?: number
  criticalDays?: number
  // Manual fallback for domains RDAP/WHOIS can't resolve (ccTLDs without RDAP,
  // private domains). Auto-detected values, when available, take precedence.
  manualExpiryAt?: string
  manualRegisteredAt?: string
  manualRegistrar?: string
}

export interface PushMonitorConfig {
  token: string
  graceSeconds?: number
}

export type MonitorConfig =
  | HttpMonitorConfig
  | TcpMonitorConfig
  | DnsMonitorConfig
  | SslMonitorConfig
  | DomainMonitorConfig
  | PushMonitorConfig
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
