export const DEFAULT_CHECK_INTERVAL_SECONDS = 60
export const DEFAULT_CHECK_TIMEOUT_SECONDS = 10
export const DEFAULT_RETRY_COUNT = 1
export const DEFAULT_RETENTION_DAYS = 30
export const DEFAULT_STATUS_PAGE_CHART_DAYS = 30

export const ALLOWED_INTERVALS_SECONDS = [10, 30, 60, 300, 900, 3600] as const

export const ALLOWED_RETENTION_DAYS = [7, 30, 60, 90, 180, 365] as const

export const RESERVED_SLUGS = [
  'admin',
  'api',
  'auth',
  '_health',
  'static',
  'assets',
  'favicon.ico',
] as const

export const PUBLIC_RATE_LIMIT_PER_MINUTE = 60

export const ALLOWED_MONITOR_TYPES = [
  'http',
  'tcp',
  'ping',
  'dns',
  'ssl',
  'domain',
  'push',
] as const

export const SSL_DEFAULT_WARNING_DAYS = 14
export const SSL_DEFAULT_CRITICAL_DAYS = 3
export const SSL_DEFAULT_PORT = 443

export const DOMAIN_DEFAULT_WARNING_DAYS = 30
export const DOMAIN_DEFAULT_CRITICAL_DAYS = 7

export const PUSH_DEFAULT_GRACE_SECONDS = 30
export const PUSH_OVERDUE_TICK_MS = 10_000
