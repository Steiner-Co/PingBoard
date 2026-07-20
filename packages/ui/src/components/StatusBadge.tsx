import { Badge } from '@/components/ui/badge'
import type { CheckStatus } from '@/types'

interface Props {
  status: CheckStatus | 'unknown' | 'paused'
  responseTimeMs?: number | null
}

export function StatusBadge({ status, responseTimeMs }: Props) {
  const label = status === 'unknown' ? 'No data' : status.toUpperCase()
  const variant =
    status === 'up'
      ? 'success'
      : status === 'down'
        ? 'destructive'
        : status === 'degraded'
          ? 'warning'
          : 'secondary'

  return (
    <span className="inline-flex items-center gap-2">
      <Badge variant={variant}>{label}</Badge>
      {responseTimeMs != null && status === 'up' && (
        <span className="text-xs text-muted-foreground">{responseTimeMs}ms</span>
      )}
    </span>
  )
}
