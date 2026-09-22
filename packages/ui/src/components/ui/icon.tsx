import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  type IconProps as PhosphorIconProps,
  type IconWeight,
} from '@phosphor-icons/react'
import type { ComponentType } from 'react'

interface IconProps {
  /** A Phosphor icon component (e.g. `import { CheckCircle } from '@phosphor-icons/react/dist/icons/CheckCircle'`). */
  icon: ComponentType<PhosphorIconProps>
  /** Force a single weight. */
  weight?: IconWeight
  /**
   * Opt into the regular → fill state language: the icon fills while its
   * surrounding control is hovered/focused, or while `active`. Off by default —
   * most icons are static, and only the sidebar nav wants a moving target.
   * Skipped entirely when `weight` is set.
   */
  stateful?: boolean
  /** Selected state for a `stateful` icon. */
  active?: boolean
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
 * Controls whose hover/focus fills a `stateful` icon. Scoped to interactive
 * elements so a decorative icon in body copy never changes.
 */
const FILL_CONTROLS =
  'a, button, [role="button"], [role="menuitem"], [role="option"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"]'

/**
 * App-wide icon wrapper.
 *
 * Default is a plain, static **regular** weight — no listeners, no state, no
 * animation. `stateful` opts an icon into the hover/selected fill language
 * (used by the sidebar nav), where a short WAAPI fade sells the glyph swap.
 * A weight swap is a geometry change, so there is no CSS property to
 * transition; a true crossfade would need both glyphs mounted at once, which
 * means wrapping every icon and breaking the `[&_svg]:size-*` / `ml-auto` /
 * absolute-positioning conventions the call sites rely on.
 *
 * Phosphor Icons are licensed under MIT — see README.
 */
export function Icon({
  icon: IconComponent,
  weight,
  stateful = false,
  active,
  decorative = true,
  label,
  size,
  color,
  mirrored,
  className,
}: IconProps) {
  const ref = useRef<SVGSVGElement>(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (!stateful || weight) return
    const control = ref.current?.closest(FILL_CONTROLS)
    if (!control) return
    const on = () => setHovered(true)
    const off = () => setHovered(false)
    control.addEventListener('pointerenter', on)
    control.addEventListener('pointerleave', off)
    control.addEventListener('focusin', on)
    control.addEventListener('focusout', off)
    return () => {
      control.removeEventListener('pointerenter', on)
      control.removeEventListener('pointerleave', off)
      control.removeEventListener('focusin', on)
      control.removeEventListener('focusout', off)
    }
  }, [stateful, weight])

  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': label }
  const resolved = weight ?? (stateful && (active || hovered) ? 'fill' : 'regular')

  const shown = useRef(resolved)
  const anim = useRef<Animation | null>(null)
  useLayoutEffect(() => {
    if (shown.current === resolved) return
    shown.current = resolved
    const svg = ref.current
    if (!stateful || !svg) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    anim.current?.cancel()
    svg.style.transformBox = 'fill-box'
    svg.style.transformOrigin = 'center'
    anim.current = svg.animate(
      [
        { opacity: 0.35, transform: 'scale(0.86)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      { duration: 180, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
    )
  }, [resolved, stateful])

  return (
    <IconComponent
      ref={ref}
      weight={resolved}
      size={size}
      color={color}
      mirrored={mirrored}
      className={className}
      {...a11y}
    />
  )
}
