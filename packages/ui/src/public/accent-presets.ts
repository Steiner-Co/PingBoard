/**
 * Accent presets for public status pages. Keys match STATUS_PAGE_ACCENTS in
 * @pingboard/shared (absent key = PingBoard's default green). Each preset ships
 * light + dark values so contrast holds in both themes. They're applied as
 * inline CSS variables on the status page's root element, scoping the override
 * to that page — status semantics (success/warning/destructive) never change.
 */

export interface AccentValues {
  primary: string
  primaryForeground: string
  primaryText: string
  ring: string
}

export interface AccentPreset {
  label: string
  /** Dot color for the admin swatch picker. */
  swatch: string
  light: AccentValues
  dark: AccentValues
}

function preset(label: string, hue: number, chroma = 0.15): AccentPreset {
  return {
    label,
    swatch: `oklch(0.65 ${chroma} ${hue})`,
    light: {
      primary: `oklch(0.72 ${chroma} ${hue})`,
      primaryForeground: `oklch(0.25 0.02 ${hue})`,
      primaryText: `oklch(0.48 ${Math.min(chroma, 0.13)} ${hue})`,
      ring: `oklch(0.72 ${chroma} ${hue})`,
    },
    dark: {
      primary: `oklch(0.45 ${Math.min(chroma, 0.12)} ${hue})`,
      primaryForeground: `oklch(0.93 0.01 ${hue})`,
      primaryText: `oklch(0.78 ${Math.min(chroma, 0.14)} ${hue})`,
      ring: `oklch(0.78 ${Math.min(chroma, 0.14)} ${hue})`,
    },
  }
}

export const ACCENT_PRESETS: Record<string, AccentPreset> = {
  blue: preset('Blue', 255, 0.16),
  violet: preset('Violet', 295, 0.16),
  orange: preset('Orange', 55, 0.17),
  rose: preset('Rose', 15, 0.17),
  amber: preset('Amber', 85, 0.15),
  cyan: preset('Cyan', 200, 0.12),
  slate: preset('Slate', 255, 0.02),
}
