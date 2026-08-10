import { Icon } from '@/components/ui/icon'
import { WarningCircle } from "@phosphor-icons/react/dist/icons/WarningCircle"

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QueryErrorProps {
  /** What failed to load, lowercase: "monitors", "incidents". */
  subject: string
  onRetry: () => void
  className?: string
}

/**
 * Failure state for a fetch. Deliberately distinct from EmptyState: on a
 * monitoring product, rendering "no incidents" when the request actually
 * failed tells the operator everything is fine while it isn't.
 */
export function QueryError({ subject, onRetry, className }: QueryErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center gap-4 border border-dashed border-destructive/40 bg-destructive/5 p-8 text-center',
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Icon icon={WarningCircle} className="h-5 w-5" />
      </div>
      <div className="max-w-sm space-y-1">
        <h2 className="text-sm font-medium">Couldn't load {subject}</h2>
        <p className="text-xs text-muted-foreground">
          The PingBoard API didn't respond. Checks keep running in the
          background — this only affects what you're seeing here.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
