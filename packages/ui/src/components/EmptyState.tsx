import type { ReactNode, ComponentType } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: ComponentType<PhosphorIconProps>
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[320px] flex-col items-center justify-center gap-5 rounded-lg border border-dashed bg-card/50 p-8 text-center',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <Icon icon={icon} className="h-5 w-5" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
