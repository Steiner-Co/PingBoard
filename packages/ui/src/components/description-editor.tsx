import { useCallback, useEffect, useRef, useState, type MutableRefObject, type ReactNode, type RefObject } from 'react'
import { Icon } from '@/components/ui/icon'
import { TextB } from '@phosphor-icons/react/dist/icons/TextB'
import { TextItalic } from '@phosphor-icons/react/dist/icons/TextItalic'
import { TextUnderline } from '@phosphor-icons/react/dist/icons/TextUnderline'
import { TextStrikethrough } from '@phosphor-icons/react/dist/icons/TextStrikethrough'
import { LinkSimple } from '@phosphor-icons/react/dist/icons/LinkSimple'
import { Highlighter } from '@phosphor-icons/react/dist/icons/Highlighter'
import { Eraser } from '@phosphor-icons/react/dist/icons/Eraser'
import { CaretLeft } from '@phosphor-icons/react/dist/icons/CaretLeft'
import { cn } from '@/lib/utils'
import { sanitizeRichText } from '@/lib/rich-text'

/**
 * Inline rich-text editing for the status page, driven entirely by the
 * floating bottom toolbar. The page itself is the canvas: the title and
 * description edit in place on the full-width preview, and the toolbar
 * expands upward to host the non-text settings (monitors, appearance,
 * access) that don't fit inline.
 *
 * Zero-dependency editing via contentEditable + execCommand — the editable
 * surface is two short fields, so a document framework would be dead weight.
 * Values are HTML using only the tags `sanitizeRichText` allows; scrubbed on
 * blur and at save time, sanitized again on every render.
 */

const TEXT_COLORS = [
  '#171717',
  '#6b7280',
  '#ef4444',
  '#ec4899',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
]

const HIGHLIGHT_COLORS = [
  '#e5e7eb',
  '#fecaca',
  '#fbcfe8',
  '#fed7aa',
  '#fef08a',
  '#bbf7d0',
  '#a5f3fc',
  '#bfdbfe',
  '#ddd6fe',
  '#fde68a',
]

type PickerMode = 'text' | 'highlight' | 'link' | null

/**
 * The raw inline editor — a contentEditable div with external-value sync that
 * never disturbs the caret mid-typing. Render it wherever the text lives
 * (on the page preview); pair it with `EditorToolbar` for controls.
 */
export function DescriptionEditor({
  editorRef,
  value,
  onChange,
  id,
  className,
  placeholder = 'Optional',
}: {
  editorRef?: MutableRefObject<HTMLDivElement | null>
  value: string
  onChange: (html: string) => void
  id?: string
  className?: string
  placeholder?: string
}) {
  const fallbackRef = useRef<HTMLDivElement | null>(null)
  const ref = editorRef ?? fallbackRef

  // Push external (hydrated/saved) HTML into the editor, but never while the
  // user is typing in it — resetting innerHTML mid-edit would jump the caret.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement !== el && el.innerHTML !== value) {
      el.innerHTML = value
    }
  }, [value, ref])

  return (
    <div
      ref={ref}
      id={id}
      role="textbox"
      aria-label="Description"
      aria-multiline="true"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      onInput={() => {
        const el = ref.current
        if (el) onChange(el.innerHTML)
      }}
      onBlur={() => {
        // Scrub anything pasted in from the web (divs, classes, junk
        // styles) down to the supported subset while editing is paused.
        const el = ref.current
        if (!el) return
        const clean = sanitizeRichText(el.innerHTML)
        if (clean !== el.innerHTML) {
          el.innerHTML = clean
          onChange(clean)
        }
      }}
      className={cn(
        'rich-edit min-h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        className,
      )}
    />
  )
}

export interface ToolbarSection {
  id: string
  label: string
  icon: ReactNode
}

/**
 * The floating bottom bar. Always visible while editing: the formatting row
 * acts on the description wherever the caret is, and each section button
 * opens its panel (monitors, appearance, access) in a card above the bar.
 */
export function EditorToolbar({
  editorRef,
  onInput,
  sections,
  activeSection,
  onSection,
  onClose,
  panel,
}: {
  editorRef: MutableRefObject<HTMLDivElement | null>
  /** Called with the editor's HTML after every formatting command. */
  onInput: (html: string) => void
  sections: ToolbarSection[]
  activeSection: string | null
  onSection: (id: string) => void
  /** Close the open section panel. */
  onClose: () => void
  /** Rendered in the card above the bar when a section is open. */
  panel: ReactNode
}) {
  const [mode, setMode] = useState<PickerMode>(null)
  const [marks, setMarks] = useState({ b: false, i: false, u: false, s: false })
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]!)
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[4]!)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkActive, setLinkActive] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  // Center on the content column, not the viewport: the admin sidebar eats
  // the left ~15rem, so viewport-centering would sit the bar right of the
  // canvas. Observing #main-content also glides the bar through the
  // sidebar's collapse animation. Falls back to viewport center when the
  // shell id is absent.
  useEffect(() => {
    const bar = barRef.current
    const main = document.getElementById('main-content')
    if (!bar || !main) return
    const update = () => {
      const r = main.getBoundingClientRect()
      bar.style.left = `${r.left + r.width / 2}px`
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(main)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  const refreshMarks = useCallback(() => {
    const el = editorRef.current
    if (!el || !selectionInside(el)) return
    try {
      setMarks({
        b: document.queryCommandState('bold'),
        i: document.queryCommandState('italic'),
        u: document.queryCommandState('underline'),
        s: document.queryCommandState('strikeThrough'),
      })
      setLinkActive(!!anchorOfSelection(el))
    } catch {
      // queryCommandState throws when there is no selection — ignore.
    }
  }, [editorRef])

  useEffect(() => {
    document.addEventListener('selectionchange', refreshMarks)
    return () => document.removeEventListener('selectionchange', refreshMarks)
  }, [refreshMarks])

  const run = useCallback(
    (command: string, arg?: string) => {
      const el = editorRef.current
      if (!el) return
      el.focus({ preventScroll: true })
      try {
        document.execCommand('styleWithCSS', false, 'true')
        document.execCommand(command, false, arg)
      } catch {
        // Unsupported command in this browser — the button just does nothing.
      }
      el.focus({ preventScroll: true })
      onInput(el.innerHTML)
      refreshMarks()
    },
    [editorRef, onInput, refreshMarks],
  )

  const openPicker = (next: Exclude<PickerMode, null>) => {
    if (next === 'link') {
      const el = editorRef.current
      const anchor = el ? anchorOfSelection(el) : null
      setLinkUrl(anchor?.getAttribute('href') ?? '')
    }
    setMode((m) => (m === next ? null : next))
  }

  const applyLink = () => {
    const raw = linkUrl.trim()
    if (!raw) {
      run('unlink')
      setMode(null)
      return
    }
    const href = /^(https?:\/\/|mailto:)/i.test(raw) ? raw : `https://${raw}`
    run('createLink', href)
    setMode(null)
  }

  return (
    <div
      ref={barRef}
      className="fixed bottom-5 left-1/2 z-40 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col items-center gap-2"
    >
      {activeSection !== null && panel != null && (
        <div
          role="dialog"
          aria-label={`${sections.find((s) => s.id === activeSection)?.label ?? 'Settings'} settings`}
          className="max-h-[50vh] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border/70 bg-card/95 p-4 shadow-lg backdrop-blur"
        >
          {panel}
        </div>
      )}

      {mode !== null && (
        <div
          role="toolbar"
          aria-label={mode === 'link' ? 'Edit link' : mode === 'text' ? 'Text color' : 'Highlight color'}
          className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card/95 px-2.5 py-2 shadow-lg backdrop-blur"
        >
          <button
            type="button"
            aria-label="Back to formatting"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              setMode(null)
              editorRef.current?.focus({ preventScroll: true })
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Icon icon={CaretLeft} className="h-4 w-4" />
          </button>
          <span className="shrink-0 px-1 text-sm font-medium capitalize">
            {mode === 'link' ? 'Link' : mode}
          </span>
          <span aria-hidden className="h-5 w-px shrink-0 bg-border" />
          {mode === 'link' ? (
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault()
                applyLink()
              }}
            >
              <input
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                spellCheck={false}
                aria-label="Link URL"
                className="h-8 w-48 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
              />
              <button
                type="submit"
                className="h-8 shrink-0 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-transform active:scale-[0.97]"
              >
                Apply
              </button>
              {linkActive && (
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    run('unlink')
                    setMode(null)
                  }}
                  className="h-8 shrink-0 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Remove
                </button>
              )}
            </form>
          ) : (
            <div className="flex items-center gap-1.5 px-1">
              <ClearSwatch
                label={mode === 'text' ? 'Default text color' : 'No highlight'}
                onSelect={() => {
                  if (mode === 'text') run('foreColor', 'inherit')
                  else run('hiliteColor', 'transparent')
                }}
              />
              {(mode === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS).map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`${mode === 'text' ? 'Text' : 'Highlight'} color ${color}`}
                  aria-pressed={(mode === 'text' ? textColor : highlightColor) === color}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (mode === 'text') {
                      setTextColor(color)
                      run('foreColor', color)
                    } else {
                      setHighlightColor(color)
                      run('hiliteColor', color)
                    }
                  }}
                  style={{ backgroundColor: color }}
                  className={cn(
                    'size-6 shrink-0 rounded-[7px] ring-1 ring-foreground/15 transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring',
                    (mode === 'text' ? textColor : highlightColor) === color &&
                      'ring-2 ring-ring',
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div
        role="toolbar"
        aria-label="Edit status page"
        className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-2xl border border-border/70 bg-card/95 px-2.5 py-2 shadow-lg backdrop-blur"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setMode(null)
            onClose()
            editorRef.current?.focus({ preventScroll: true })
          }
        }}
      >
        <button
          type="button"
          aria-label="Text color"
          aria-pressed={mode === 'text'}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => openPicker('text')}
          className={cn(
            'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm transition-colors hover:bg-accent',
            mode === 'text' && 'bg-accent',
          )}
        >
          Text
          <span
            aria-hidden
            className="size-4 rounded-[5px] ring-1 ring-foreground/20"
            style={{ backgroundColor: textColor }}
          />
        </button>
        <button
          type="button"
          aria-label="Highlight color"
          aria-pressed={mode === 'highlight'}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => openPicker('highlight')}
          className={cn(
            'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm transition-colors hover:bg-accent',
            mode === 'highlight' && 'bg-accent',
          )}
        >
          Highlight
          <span
            aria-hidden
            className="flex size-4 items-center justify-center rounded-[5px] ring-1 ring-foreground/20"
            style={{ backgroundColor: highlightColor }}
          >
            <Icon icon={Highlighter} className="h-2.5 w-2.5 text-foreground/70" />
          </span>
        </button>
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolButton
          label={linkActive ? 'Edit link' : 'Add link'}
          pressed={mode === 'link' || linkActive}
          onClick={() => openPicker('link')}
        >
          <Icon icon={LinkSimple} className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Bold" pressed={marks.b} onClick={() => run('bold')}>
          <Icon icon={TextB} className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Italic" pressed={marks.i} onClick={() => run('italic')}>
          <Icon icon={TextItalic} className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Underline"
          pressed={marks.u}
          onClick={() => run('underline')}
        >
          <Icon icon={TextUnderline} className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Strikethrough"
          pressed={marks.s}
          onClick={() => run('strikeThrough')}
        >
          <Icon icon={TextStrikethrough} className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Clear formatting" onClick={() => run('removeFormat')}>
          <Icon icon={Eraser} className="h-4 w-4" />
        </ToolButton>
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-label={`${s.label} settings`}
            title={s.label}
            aria-pressed={activeSection === s.id}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onSection(s.id)}
            className={cn(
              'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm transition-colors hover:bg-accent',
              activeSection === s.id
                ? 'bg-accent text-foreground'
                : 'text-foreground/80',
            )}
          >
            {s.icon}
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ToolButton({
  label,
  pressed = false,
  onClick,
  children,
}: {
  label: string
  pressed?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent hover:text-foreground',
        pressed ? 'bg-accent text-foreground' : 'text-foreground/80',
      )}
    >
      {children}
    </button>
  )
}

/** The "no color" swatch — a circle with a slash, like the reference. */
function ClearSwatch({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className="relative size-6 shrink-0 rounded-full bg-muted ring-1 ring-foreground/15 transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 h-[2px] w-7 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-destructive"
      />
    </button>
  )
}

function selectionInside(editor: HTMLElement): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return false
  return editor.contains(sel.anchorNode)
}

function anchorOfSelection(editor: HTMLElement): HTMLAnchorElement | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  let node: Node | null = sel.anchorNode
  while (node && node !== editor) {
    if (node instanceof HTMLAnchorElement) return node
    node = node.parentNode
  }
  return null
}
