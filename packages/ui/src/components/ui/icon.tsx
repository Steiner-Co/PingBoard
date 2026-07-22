import {
  type IconProps as SolarIconProps,
  type IconWeight,
} from '@solar-icons/react'
import type { ComponentType } from 'react'

interface IconProps {
  /** A Solar icon component (e.g. `import CheckCircle from '@solar-icons/react/csr/ui/CheckCircle'`). */
  icon: ComponentType<SolarIconProps>
  /**
   * Solar icon variant. Defaults to **Bold** — the brand choice across the app.
   * Override only when an explicit visual call-out needs a different weight.
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
  size?: SolarIconProps['size']
  color?: SolarIconProps['color']
  mirrored?: boolean
  className?: string
}

/**
 * App-wide icon wrapper. Enforces:
 *   - **Bold** weight by default (brand choice; one place to change).
 *   - **`aria-hidden="true"`** by default (locks in the Vercel audit finding
 *     about decorative icons leaking their names to screen readers).
 *
 * Solar Icons are licensed under CC BY 4.0 by 480 Design — see README.
 */
export function Icon({
  icon: IconComponent,
  weight = 'Bold',
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
