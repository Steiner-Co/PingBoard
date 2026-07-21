import { cn } from '@/lib/utils'

/**
 * The recurring section header from the design: a 28px medium heading (one or
 * more lines) with an optional muted subtitle. Centered by default.
 */
export function SectionHeading({
  lines,
  subtitle,
  align = 'center',
  className,
}: {
  lines: string[]
  subtitle?: string
  align?: 'center' | 'left'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-[18px]',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      <h2 className="text-[28px] font-medium leading-[0.96] tracking-[-0.7px] text-foreground">
        {lines.map((line) => (
          <span key={line} className="block text-balance">
            {line}
          </span>
        ))}
      </h2>
      {subtitle && (
        <p className="max-w-[280px] text-[14px] leading-[1.3] tracking-[-0.35px] text-foreground/55">
          {subtitle}
        </p>
      )}
    </div>
  )
}
