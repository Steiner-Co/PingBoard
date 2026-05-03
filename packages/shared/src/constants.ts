export const DEFAULT_CHECK_INTERVAL_SECONDS = 60
export const DEFAULT_CHECK_TIMEOUT_SECONDS = 10
export const DEFAULT_RETRY_COUNT = 1
export const DEFAULT_RETENTION_DAYS = 30
export const DEFAULT_STATUS_PAGE_CHART_DAYS = 30

export const ALLOWED_INTERVALS_SECONDS = [10, 30, 60, 300, 900, 3600] as const

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
