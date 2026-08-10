import {
  type IconProps as PhosphorIconProps,
  type IconWeight,
} from '@phosphor-icons/react'
import type { ComponentType } from 'react'

interface IconProps {
  /** A Phosphor icon component (e.g. `import { CheckCircle } from '@phosphor-icons/react/dist/icons/CheckCircle'`). */
  icon: ComponentType<PhosphorIconProps>
  /**
   * Phosphor icon weight. Defaults to **fill** — the brand choice across the
   * app (the look the previous set called "Bold"). Override only when an
   * explicit visual call-out needs a different weight.
   */
  weight?: IconWeight
  /**
   * Decorative icons (default) get `aria-hidden="true"` so screen readers
   * skip them — they're always accompanied by a text label.
   * Pass `decorative={false}` and supply `label` when the icon carries meaning
   * the adjacent text doesn't already convey.
   */
  decorative?: boolean
  /** Required for non-decorative icons; exposed via `aria-label`. */
  label?: string
  size?: PhosphorIconProps['size']
  color?: PhosphorIconProps['color']
  mirrored?: boolean
  className?: string
}

/**
 * App-wide icon wrapper. Enforces:
 *   - **fill** weight by default (brand choice; one place to change).
 *   - **`aria-hidden="true"`** by default (locks in the Vercel audit finding
 *     about decorative icons leaking their names to screen readers).
 *
 * Phosphor Icons are licensed under MIT — see README.
 */
export function Icon({
  icon: IconComponent,
  weight = 'fill',
  decorative = true,
  label,
  size,
  color,
  mirrored,
  className,
}: IconProps) {
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': label }
  return (
    <IconComponent
      size={size}
      color={color}
      weight={weight}
      mirrored={mirrored}
      className={className}
      {...a11y}
    />
  )
}
