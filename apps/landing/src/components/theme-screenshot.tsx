import { cn } from '@/lib/utils'

/**
 * A framed product screenshot that follows the active theme. Renders the
 * light and dark captures from /public/screens and toggles them with the
 * .dark class, so it stays in sync with next-themes without waiting on
 * hydration. Both imgs carry the same alt; exactly one is visible (and thus
 * announced) at a time.
 */
export function ThemeScreenshot({
  name,
  alt,
  className,
  imgClassName,
}: {
  /** Base file name in /public/screens, without the -light/-dark suffix. */
  name: string
  alt: string
  className?: string
  imgClassName?: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-[14px] border border-border bg-card', className)}>
      <img
        src={`/screens/${name}-light.png`}
        alt={alt}
        loading="lazy"
        className={cn('block w-full dark:hidden', imgClassName)}
      />
      <img
        src={`/screens/${name}-dark.png`}
        alt={alt}
        loading="lazy"
        className={cn('hidden w-full dark:block', imgClassName)}
      />
    </div>
  )
}
