/**
 * Prebuilt themes for public status pages, delivered through the Custom CSS
 * feature rather than a schema column: picking one writes this CSS into the
 * page's Custom CSS field, where the owner can then hand-edit it.
 *
 * Every theme is scoped to the page canvas with the `.pb-canvas` class the
 * PublicStatusView root carries — element-level, never an ancestor selector.
 * Ancestor scoping (`.light div:has(…)`) reads as cleaner CSS but breaks in
 * the admin editor: <html> wears the admin's own theme class there, so a
 * `.light` ancestor can exist while the canvas is dark. Scoping matters in
 * the first place because custom CSS is injected as a plain <style> — an
 * unscoped `:root { … }` would restyle the admin shell too (and did, in the
 * editor's live preview). Light/dark are both shipped so the page holds up
 * whichever theme it renders in.
 *
 * Status semantics stay meaningful: success/warning/destructive are re-tinted
 * per theme, never collapsed into the accent.
 */

const PAGE = '.pb-canvas'
const PAGE_LIGHT = '.pb-canvas.light'

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


// Dracula's official light companion (Alacritty's "Alucard" spec values).

const GITHUB_DARK: Palette = {
  bg: '#0d1117',
  fg: '#e6edf3',
  card: '#161b22',
  muted: '#21262d',
  mutedFg: '#7d8590',
  accent: '#30363d',
  border: '#30363d',
  input: '#30363d',
  primary: '#58a6ff',
  primaryFg: '#0d1117',
  primaryText: '#58a6ff',
  success: '#3fb950',
  warning: '#d29922',
  destructive: '#f85149',
}
const GITHUB_LIGHT: Palette = {
  bg: '#ffffff',
  fg: '#1f2328',
  card: '#f6f8fa',
  muted: '#eaeef2',
  mutedFg: '#59636e',
  accent: '#d1d9e0',
  border: '#d1d9e0',
  input: '#d1d9e0',
  primary: '#0969da',
  primaryFg: '#ffffff',
  primaryText: '#0550ae',
  success: '#1a7f37',
  warning: '#9a6700',
  destructive: '#cf222e',
}


const KANAGAWA: Palette = {
  bg: '#1f1f28',
  fg: '#dcd7ba',
  card: '#2a2a37',
  muted: '#363646',
  mutedFg: '#a09a7f',
  accent: '#414154',
  border: '#363646',
  input: '#49495c',
  primary: '#7e9cd8',
  primaryFg: '#1f1f28',
  primaryText: '#7fb4ca',
  success: '#98bb6c',
  warning: '#e6c384',
  destructive: '#ff5d62',
}
const KANAGAWA_LOTUS: Palette = {
  bg: '#f2ecbc',
  fg: '#545464',
  card: '#ece5c1',
  muted: '#e3dca9',
  mutedFg: '#716e61',
  accent: '#d9d2a0',
  border: '#ddd5a8',
  input: '#d5cea3',
  primary: '#4d699b',
  primaryFg: '#f2ecbc',
  primaryText: '#597b75',
  success: '#6f894e',
  warning: '#de9800',
  destructive: '#c84053',
}

// Neon on deep violet — the loud end of the set. The light variant is a
// synthwave dawn: lavender paper with magenta/cyan accents.
const SYNTHWAVE: Palette = {
  bg: '#241b2f',
  fg: '#f0edf7',
  card: '#2a2139',
  muted: '#34294f',
  mutedFg: '#848bbd',
  accent: '#3f3160',
  border: '#34294f',
  input: '#463465',
  primary: '#ff7edb',
  primaryFg: '#241b2f',
  primaryText: '#36f9f6',
  success: '#72f1b8',
  warning: '#fede5d',
  destructive: '#fe4450',
}
const SYNTHWAVE_DAWN: Palette = {
  bg: '#f6f2fb',
  fg: '#3d3252',
  card: '#ffffff',
  muted: '#ece4f7',
  mutedFg: '#7a6f9b',
  accent: '#e0d4f2',
  border: '#e3d9f2',
  input: '#d9cbee',
  primary: '#d63384',
  primaryFg: '#ffffff',
  primaryText: '#0f8b8d',
  success: '#1a7f54',
  warning: '#946800',
  destructive: '#d92d20',
}

// Pure monochrome — no hue anywhere except desaturated status signals, which
// stay colored so "up" and "down" never blur into the ink.
const NOIR: Palette = {
  bg: '#0a0a0a',
  fg: '#fafafa',
  card: '#171717',
  muted: '#262626',
  mutedFg: '#a3a3a3',
  accent: '#333333',
  border: '#262626',
  input: '#333333',
  primary: '#fafafa',
  primaryFg: '#0a0a0a',
  primaryText: '#d4d4d4',
  success: '#34d399',
  warning: '#fbbf24',
  destructive: '#f87171',
}
const NOIR_LIGHT: Palette = {
  bg: '#ffffff',
  fg: '#171717',
  card: '#fafafa',
  muted: '#f5f5f5',
  mutedFg: '#737373',
  accent: '#e5e5e5',
  border: '#e5e5e5',
  input: '#d4d4d4',
  primary: '#171717',
  primaryFg: '#ffffff',
  primaryText: '#525252',
  success: '#15803d',
  warning: '#b45309',
  destructive: '#b91c1c',
}

// Flexoki keeps 400-step accents on its dark base and 600-step accents on
// paper; yellow-700 steps in as primaryText since yellow-600 alone falls
// short of small-text contrast on paper.
const FLEXOKI: Palette = {
  bg: '#100f0f',
  fg: '#cecdc3',
  card: '#1c1b1a',
  muted: '#282726',
  mutedFg: '#878580',
  accent: '#343331',
  border: '#282726',
  input: '#403e3c',
  primary: '#d0a215',
  primaryFg: '#100f0f',
  primaryText: '#d0a215',
  success: '#879a39',
  warning: '#da702c',
  destructive: '#d14d41',
}
const FLEXOKI_LIGHT: Palette = {
  bg: '#fffcf0',
  fg: '#100f0f',
  card: '#f2f0e5',
  muted: '#e6e4d9',
  mutedFg: '#6f6e69',
  accent: '#dad8ce',
  border: '#e6e4d9',
  input: '#cecdc3',
  primary: '#ad8301',
  primaryFg: '#fffcf0',
  primaryText: '#8e6b01',
  success: '#66800b',
  warning: '#bc5215',
  destructive: '#af3029',
}

const ONE_DARK: Palette = {
  bg: '#282c34',
  fg: '#abb2bf',
  card: '#21252b',
  muted: '#2c313c',
  mutedFg: '#828997',
  accent: '#3e4451',
  border: '#2c313c',
  input: '#3e4451',
  primary: '#61afef',
  primaryFg: '#282c34',
  primaryText: '#61afef',
  success: '#98c379',
  warning: '#e5c07b',
  destructive: '#e06c75',
}
const ONE_LIGHT: Palette = {
  bg: '#fafafa',
  fg: '#383a42',
  card: '#ffffff',
  muted: '#eaeaeb',
  mutedFg: '#696c77',
  accent: '#dbdbdc',
  border: '#dbdbdc',
  input: '#dbdbdc',
  primary: '#4078f2',
  primaryFg: '#fafafa',
  primaryText: '#4078f2',
  success: '#50a14f',
  warning: '#c18401',
  destructive: '#e45649',
}

// Ayu's accent tint fails small-text contrast on its own paper, so the light
// variant pairs it with accent.on — the scheme's designated text-on-accent
// tone — and status signals take the darkest step of each colour family.
const AYU: Palette = {
  bg: '#0b0e14',
  fg: '#bfbdb6',
  card: '#10141c',
  muted: '#161a24',
  mutedFg: '#5a6378',
  accent: '#1b1f29',
  border: '#161a24',
  input: '#1b1f29',
  primary: '#e6b450',
  primaryFg: '#0b0e14',
  primaryText: '#e6b450',
  success: '#aad94c',
  warning: '#ffb454',
  destructive: '#d95757',
}
const AYU_LIGHT: Palette = {
  bg: '#fcfcfc',
  fg: '#5c6166',
  card: '#ffffff',
  muted: '#f8f9fa',
  mutedFg: '#828e9f',
  accent: '#ebeef0',
  border: '#ebeef0',
  input: '#c5c5c8',
  primary: '#f29718',
  primaryFg: '#7e4b01',
  primaryText: '#7e4b01',
  success: '#719700',
  warning: '#b37c00',
  destructive: '#e65050',
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
  {
    id: 'github',
    label: 'GitHub',
    swatches: [GITHUB_DARK.bg, GITHUB_DARK.primary, GITHUB_DARK.success],
    css: theme('GitHub (dark / light)', GITHUB_DARK, GITHUB_LIGHT),
  },
  {
    id: 'kanagawa',
    label: 'Kanagawa',
    swatches: [KANAGAWA.bg, KANAGAWA.primary, KANAGAWA.success],
    css: theme('Kanagawa — Wave (dark) / Lotus (light)', KANAGAWA, KANAGAWA_LOTUS),
  },
  {
    id: 'synthwave',
    label: 'Synthwave',
    swatches: [SYNTHWAVE.bg, SYNTHWAVE.primary, SYNTHWAVE.success],
    css: theme('Synthwave — \'84 (dark) / Dawn (light)', SYNTHWAVE, SYNTHWAVE_DAWN),
  },
  {
    id: 'noir',
    label: 'Noir',
    swatches: [NOIR.bg, NOIR.primary, NOIR.success],
    css: theme('Noir (dark / light)', NOIR, NOIR_LIGHT),
  },
  {
    id: 'flexoki',
    label: 'Flexoki',
    swatches: [FLEXOKI.bg, FLEXOKI.primary, FLEXOKI.success],
    css: theme('Flexoki (dark / light)', FLEXOKI, FLEXOKI_LIGHT),
  },
  {
    id: 'one-dark',
    label: 'One Dark',
    swatches: [ONE_DARK.bg, ONE_DARK.primary, ONE_DARK.success],
    css: theme('One Dark / One Light', ONE_DARK, ONE_LIGHT),
  },
  {
    id: 'ayu',
    label: 'Ayu',
    swatches: [AYU.bg, AYU.primary, AYU.success],
    css: theme('Ayu — Dark (dark) / Light (light)', AYU, AYU_LIGHT),
  },
]
