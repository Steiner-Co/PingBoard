/**
 * Prebuilt themes for public status pages, delivered through the Custom CSS
 * feature rather than a schema column: picking one writes this CSS into the
 * page's Custom CSS field, where the owner can then hand-edit it.
 *
 * Every theme is scoped to the page root with `div:has(> .max-w-3xl.mx-auto)`
 * — that element is the only div whose direct child is the page's content
 * column. Scoping matters: custom CSS is injected as a plain <style>, so an
 * unscoped `:root { … }` would restyle the admin shell too (and does, in the
 * editor's live preview). Light/dark are both shipped so the page holds up
 * whichever theme it renders in.
 *
 * Status semantics stay meaningful: success/warning/destructive are re-tinted
 * per theme, never collapsed into the accent.
 */

const PAGE = 'div:has(> .max-w-3xl.mx-auto)'
const PAGE_LIGHT = '.light div:has(> .max-w-3xl.mx-auto)'

interface Palette {
  bg: string
  fg: string
  card: string
  muted: string
  mutedFg: string
  accent: string
  border: string
  input: string
  primary: string
  primaryFg: string
  primaryText: string
  success: string
  warning: string
  destructive: string
}

/**
 * `--success`/`--primary` are fill colours paired with a foreground; as small
 * text on light surfaces they fail contrast (see globals.css). `*-text` gets
 * the darker tone, which the palettes pass separately where the two differ.
 */
function tokens(p: Palette): Record<string, string> {
  return {
    '--background': p.bg,
    '--foreground': p.fg,
    '--card': p.card,
    '--card-foreground': p.fg,
    '--popover': p.card,
    '--popover-foreground': p.mutedFg,
    '--primary': p.primary,
    '--primary-foreground': p.primaryFg,
    '--primary-text': p.primaryText,
    '--secondary': p.muted,
    '--secondary-foreground': p.fg,
    '--muted': p.muted,
    '--muted-foreground': p.mutedFg,
    '--accent': p.accent,
    '--accent-foreground': p.fg,
    '--destructive': p.destructive,
    '--destructive-foreground': p.primaryFg,
    '--success': p.success,
    '--success-text': p.success,
    '--warning': p.warning,
    '--warning-foreground': p.primaryFg,
    '--border': p.border,
    '--input': p.input,
    '--ring': p.primary,
    '--radius': '0.75rem',
  }
}

function block(selector: string, p: Palette): string {
  const body = Object.entries(tokens(p))
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n')
  return `${selector} {\n${body}\n}`
}

function theme(name: string, dark: Palette, light: Palette): string {
  return `/* ${name} */\n${block(PAGE, dark)}\n\n${block(PAGE_LIGHT, light)}\n`
}

export interface ThemePreset {
  id: string
  label: string
  /** Canvas / accent / status — a mini preview for the picker chip. */
  swatches: [string, string, string]
  css: string
}

const CATPPUCCIN: Palette = {
  bg: '#1e1e2e',
  fg: '#cdd6f4',
  card: '#181825',
  muted: '#313244',
  mutedFg: '#a6adc8',
  accent: '#45475a',
  border: '#313244',
  input: '#45475a',
  primary: '#89b4fa',
  primaryFg: '#1e1e2e',
  primaryText: '#b4befe',
  success: '#a6e3a1',
  warning: '#f9e2af',
  destructive: '#f38ba8',
}
const CATPPUCCIN_LIGHT: Palette = {
  bg: '#eff1f5',
  fg: '#4c4f69',
  card: '#ffffff',
  muted: '#e6e9ef',
  mutedFg: '#6c6f85',
  accent: '#ccd0da',
  border: '#ccd0da',
  input: '#bcc0cc',
  primary: '#1e66f5',
  primaryFg: '#eff1f5',
  primaryText: '#7287fd',
  success: '#40a02b',
  warning: '#df8e1d',
  destructive: '#d20f39',
}

const NORD: Palette = {
  bg: '#2e3440',
  fg: '#eceff4',
  card: '#3b4252',
  muted: '#434c5e',
  mutedFg: '#d8dee9',
  accent: '#4c566a',
  border: '#434c5e',
  input: '#4c566a',
  primary: '#88c0d0',
  primaryFg: '#2e3440',
  primaryText: '#8fbcbb',
  success: '#a3be8c',
  warning: '#ebcb8b',
  destructive: '#bf616a',
}
// Nord defines no light semantic variants; the text tones are darkened for
// contrast against Snow Storm.
const NORD_LIGHT: Palette = {
  bg: '#eceff4',
  fg: '#2e3440',
  card: '#ffffff',
  muted: '#e5e9f0',
  mutedFg: '#4c566a',
  accent: '#d8dee9',
  border: '#d8dee9',
  input: '#d8dee9',
  primary: '#5e81ac',
  primaryFg: '#eceff4',
  primaryText: '#5e81ac',
  success: '#4c7a2f',
  warning: '#9a7b1f',
  destructive: '#bf616a',
}

const GRUVBOX: Palette = {
  bg: '#282828',
  fg: '#ebdbb2',
  card: '#32302f',
  muted: '#3c3836',
  mutedFg: '#a89984',
  accent: '#504945',
  border: '#3c3836',
  input: '#504945',
  primary: '#83a598',
  primaryFg: '#282828',
  primaryText: '#8ec07c',
  success: '#b8bb26',
  warning: '#fabd2f',
  destructive: '#fb4934',
}
const GRUVBOX_LIGHT: Palette = {
  bg: '#fbf1c7',
  fg: '#3c3836',
  card: '#f9f5d7',
  muted: '#ebdbb2',
  mutedFg: '#7c6f64',
  accent: '#d5c4a1',
  border: '#ebdbb2',
  input: '#d5c4a1',
  primary: '#076678',
  primaryFg: '#fbf1c7',
  primaryText: '#076678',
  success: '#79740e',
  warning: '#b57614',
  destructive: '#9d0006',
}

const TOKYO_NIGHT: Palette = {
  bg: '#24283b',
  fg: '#c0caf5',
  card: '#1f2335',
  muted: '#292e42',
  mutedFg: '#a9b1d6',
  accent: '#292e42',
  border: '#292e42',
  input: '#3b4261',
  primary: '#7aa2f7',
  primaryFg: '#1a1b26',
  primaryText: '#7dcfff',
  success: '#9ece6a',
  warning: '#e0af68',
  destructive: '#f7768e',
}
const TOKYO_NIGHT_DAY: Palette = {
  bg: '#e1e2e7',
  fg: '#3760bf',
  card: '#ffffff',
  muted: '#d0d5e3',
  mutedFg: '#6172b0',
  accent: '#d0d5e3',
  border: '#d0d5e3',
  input: '#c4c8da',
  primary: '#2e7de9',
  primaryFg: '#e1e2e7',
  primaryText: '#2e7de9',
  success: '#587539',
  warning: '#8c6c3e',
  destructive: '#f52a65',
}

const ROSE_PINE: Palette = {
  bg: '#191724',
  fg: '#e0def4',
  card: '#1f1d2e',
  muted: '#26233a',
  mutedFg: '#908caa',
  accent: '#26233a',
  border: '#26233a',
  input: '#403d52',
  primary: '#c4a7e7',
  primaryFg: '#191724',
  primaryText: '#9ccfd8',
  success: '#9ccfd8',
  warning: '#f6c177',
  destructive: '#eb6f92',
}
const ROSE_PINE_DAWN: Palette = {
  bg: '#faf4ed',
  fg: '#575279',
  card: '#fffaf3',
  muted: '#f2e9e1',
  mutedFg: '#797593',
  accent: '#f2e9e1',
  border: '#f2e9e1',
  input: '#dfdad9',
  primary: '#907aa9',
  primaryFg: '#faf4ed',
  primaryText: '#286983',
  success: '#56949f',
  warning: '#ea9d34',
  destructive: '#b4637a',
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'catppuccin',
    label: 'Catppuccin',
    swatches: [CATPPUCCIN.bg, CATPPUCCIN.primary, CATPPUCCIN.success],
    css: theme('Catppuccin — Mocha (dark) / Latte (light)', CATPPUCCIN, CATPPUCCIN_LIGHT),
  },
  {
    id: 'nord',
    label: 'Nord',
    swatches: [NORD.bg, NORD.primary, NORD.success],
    css: theme('Nord — Polar Night (dark) / Snow Storm (light)', NORD, NORD_LIGHT),
  },
  {
    id: 'gruvbox',
    label: 'Gruvbox',
    swatches: [GRUVBOX.bg, GRUVBOX.primary, GRUVBOX.success],
    css: theme('Gruvbox (dark / light)', GRUVBOX, GRUVBOX_LIGHT),
  },
  {
    id: 'tokyo-night',
    label: 'Tokyo Night',
    swatches: [TOKYO_NIGHT.bg, TOKYO_NIGHT.primary, TOKYO_NIGHT.success],
    css: theme('Tokyo Night — Storm (dark) / Day (light)', TOKYO_NIGHT, TOKYO_NIGHT_DAY),
  },
  {
    id: 'rose-pine',
    label: 'Rosé Pine',
    swatches: [ROSE_PINE.bg, ROSE_PINE.primary, ROSE_PINE.success],
    css: theme('Rosé Pine — main (dark) / Dawn (light)', ROSE_PINE, ROSE_PINE_DAWN),
  },
]
