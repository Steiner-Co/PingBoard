import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface BlogTocItem {
  id: string
  text: string
  level: number
}

/** Collect h2/h3 headings from the rendered blog article for the TOC. */
export function useBlogToc(slug: string | undefined) {
  const [items, setItems] = useState<BlogTocItem[]>([])

  useEffect(() => {
    // Re-run per post; the article mounts after the route swap.
    const collect = () => {
      const article = document.querySelector('[data-blog-article]')
      if (!article) return false
      const headings = article.querySelectorAll('h2[id], h3[id]')
      setItems(
        Array.from(headings).map((el) => ({
          id: el.id,
          text: (el.textContent ?? '').replace(/\s*#\s*$/, '').trim(),
          level: el.tagName === 'H2' ? 2 : 3,
        })),
      )
      return true
    }

    if (collect()) return
    // MDX component resolves a tick after mount — retry briefly.
    let frames = 0
    const raf = requestAnimationFrame(function tick() {
      frames += 1
      if (collect() || frames > 30) return
      requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [slug])

  return items
}

/** Estimated reading time from the rendered article text (200 wpm, min 1). */
export function useReadingTime(slug: string | undefined) {
  const [minutes, setMinutes] = useState<number | null>(null)

  useEffect(() => {
    const compute = () => {
      const article = document.querySelector('[data-blog-article]')
      if (!article?.textContent) return false
      const words = article.textContent.trim().split(/\s+/).length
      setMinutes(Math.max(1, Math.round(words / 200)))
      return true
    }

    if (compute()) return
    let frames = 0
    const raf = requestAnimationFrame(function tick() {
      frames += 1
      if (compute() || frames > 30) return
      requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [slug])

  return minutes
}

function scrollToHeading(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
}

/**
 * Sticky left-rail TOC — matches the reference: plain "Table of contents"
 * label, quiet items, active item gets the dark left border.
 */
export function BlogToc({ items }: { items: BlogTocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (items.length === 0) return

    const lastId = items[items.length - 1]!.id
    let raf = 0

    const update = () => {
      raf = 0
      // Deepest heading the reader has scrolled past the activation line.
      // Every section owns the highlight in turn — none can be skipped.
      const line = window.innerHeight * 0.35
      let current: string | null = null
      for (const item of items) {
        const el = document.getElementById(item.id)
        if (el && el.getBoundingClientRect().top <= line) current = item.id
      }
      // Fallback: a short trailing section may never cross the line, so pin
      // it once the page bottom is reached.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 48) {
        current = lastId
      }
      setActiveId(current)
    }

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('load', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('load', schedule)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [items])

  if (items.length === 0) return null

  return (
    <nav aria-label="Table of contents" className="flex flex-col">
      <p className="text-[14px] font-semibold tracking-[-0.2px] text-foreground">Table of contents</p>
      <div className="mt-3 flex flex-col gap-2.5">
        {items.map((item) => {
          const active = activeId === item.id
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault()
                scrollToHeading(item.id)
              }}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'border-l-2 py-0.5 text-[13.5px] leading-[1.4] tracking-[-0.2px] transition-colors duration-150',
                item.level === 3 ? 'ml-3 pl-3' : 'pl-3',
                active
                  ? 'border-foreground font-semibold text-foreground'
                  : 'border-transparent text-foreground/55 hover:text-foreground',
              )}
            >
              {item.text}
            </a>
          )
        })}
      </div>
    </nav>
  )
}

export function MobileBlogToc({ items }: { items: BlogTocItem[] }) {
  if (items.length === 0) return null
  return (
    <details className="rounded-xl border border-border bg-muted/30 lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] font-medium text-foreground">
        Table of contents
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-3.5 text-muted-foreground" aria-hidden>
          <path d="M6 9 12 15l6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="flex flex-col gap-0.5 border-t border-border px-2 py-2">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => {
              e.preventDefault()
              scrollToHeading(item.id)
            }}
            className={cn(
              'block rounded-md px-3 py-1.5 text-[13px] leading-[1.4] text-muted-foreground hover:bg-muted hover:text-foreground',
              item.level === 3 && 'ml-3',
            )}
          >
            {item.text}
          </a>
        ))}
      </div>
    </details>
  )
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1600)
        } catch {
          // Clipboard unavailable (permissions) — no-op, icon stays a link.
        }
      }}
      aria-label={copied ? 'Link copied' : 'Copy link'}
      title={copied ? 'Copied!' : 'Copy link'}
      className="grid size-8 place-items-center rounded-full text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-95"
    >
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden>
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}

/** Share row for the left rail — dashed rule on top like the reference. */
export function BlogShare({ title }: { title: string }) {
  const intent = (href: string, label: string, path: React.ReactNode) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-95"
    >
      {path}
    </a>
  )

  const url = typeof window !== 'undefined' ? window.location.href : ''
  const text = `${title} — PingBoard`

  return (
    <div className="flex items-center justify-between border-t border-dashed border-border pt-4">
      <span className="text-[13.5px] font-medium text-foreground">Share</span>
      <div className="flex items-center gap-0.5">
        <CopyLinkButton />
        {intent(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          'Share on Facebook',
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
            <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V11H8.5v3H11v7h2.5Z" />
          </svg>,
        )}
        {intent(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          'Share on LinkedIn',
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
            <path d="M6.5 8.8v11.3H3V8.8h3.5ZM4.7 3.5a2 2 0 1 1 0 4.1 2 2 0 0 1 0-4.1ZM20 13.4v6.7h-3.5v-6c0-1.5-.6-2.4-2-2.4-1.1 0-1.7.7-2 1.4-.1.3-.1.6-.1 1v5.9H9s.1-9.6 0-11.2h3.5v1.7c.5-.7 1.3-1.8 3.2-1.8 2.4 0 4.3 1.6 4.3 5.7Z" />
          </svg>,
        )}
        {intent(
          `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
          'Share on X',
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
            <path d="M17.8 3h3l-6.6 7.6L22 21h-6.1l-4.8-6.3L5.6 21h-3l7.1-8.1L2 3h6.3l4.3 5.7L17.8 3Zm-1.1 16.1h1.7L7.4 4.8H5.6l11.1 14.3Z" />
          </svg>,
        )}
      </div>
    </div>
  )
}

/**
 * Gradient hero art — same per-post preset as the index card, so the two
 * stay visually linked. Pure CSS, theme-agnostic.
 */
export function BlogHero({ seed }: { seed: string }) {
  const preset = blogArtPreset(seed)

  return (
    <div
      role="img"
      aria-label="Abstract cover art"
      className="relative grid aspect-[16/8] w-full place-items-center overflow-hidden rounded-[20px] dark:brightness-90"
      style={{ background: preset.bg }}
    >
      <div className="grid h-full w-full place-items-center [&>svg]:h-1/2 [&>svg]:w-auto" aria-hidden>
        {preset.mark}
      </div>
      <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(255,255,255,0.25) 100%)' }} />
    </div>
  )
}

/** Author mark — real photo when the author directory has one, initials otherwise. */
export function AuthorAvatar({ name, image }: { name: string; image?: string }) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        className="size-9 shrink-0 rounded-full object-cover"
      />
    )
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.replace(/^[^A-Za-z0-9]*/, '').charAt(0).toUpperCase())
    .join('')

  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-[12px] font-semibold text-background"
    >
      {initials || 'PB'}
    </span>
  )
}

const CARD_PRESETS: { bg: string; mark: React.ReactNode }[] = [
  {
    bg: 'radial-gradient(70% 90% at 12% 20%, rgba(125,211,252,0.95) 0%, transparent 55%), radial-gradient(60% 80% at 85% 15%, rgba(165,243,252,0.9) 0%, transparent 55%), radial-gradient(75% 95% at 78% 88%, rgba(251,191,36,0.95) 0%, transparent 58%), linear-gradient(115deg, #bae6fd 0%, #fce7f3 38%, #fde68a 68%, #f59e0b 100%)',
    mark: (
      <svg viewBox="0 0 120 72" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="opacity-90" aria-hidden>
        <path d="M14 58 V14 M14 36 H44 M44 14 V58 M30 14 L14 36 L30 58" />
        <ellipse cx="72" cy="36" rx="16" ry="22" />
        <path d="M100 14 V58" />
      </svg>
    ),
  },
  {
    bg: 'radial-gradient(70% 90% at 85% 15%, rgba(110,231,183,0.95) 0%, transparent 55%), radial-gradient(65% 85% at 15% 85%, rgba(45,212,191,0.9) 0%, transparent 58%), radial-gradient(60% 70% at 60% 60%, rgba(190,242,100,0.8) 0%, transparent 60%), linear-gradient(120deg, #99f6e4 0%, #bbf7d0 45%, #d9f99d 100%)',
    mark: (
      <svg viewBox="0 0 120 72" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-90" aria-hidden>
        <path d="M8 44 L32 44 L42 20 L54 60 L64 36 L72 44 L112 44" />
        <circle cx="112" cy="44" r="3.5" fill="white" stroke="none" />
      </svg>
    ),
  },
  {
    bg: 'radial-gradient(70% 90% at 15% 15%, rgba(253,224,71,0.9) 0%, transparent 55%), radial-gradient(65% 85% at 85% 80%, rgba(196,181,253,0.95) 0%, transparent 58%), radial-gradient(60% 70% at 70% 30%, rgba(249,168,212,0.85) 0%, transparent 60%), linear-gradient(120deg, #fde68a 0%, #f5d0fe 50%, #c4b5fd 100%)',
    mark: (
      <svg viewBox="0 0 120 72" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="opacity-90" aria-hidden>
        <ellipse cx="60" cy="36" rx="34" ry="20" />
        <ellipse cx="60" cy="36" rx="22" ry="12" />
        <ellipse cx="60" cy="36" rx="10" ry="5" />
      </svg>
    ),
  },
]

/**
 * Deterministic artwork per post — shared by index cards and the reader
 * hero so the two stay visually linked.
 */
export function blogArtPreset(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return CARD_PRESETS[((hash % CARD_PRESETS.length) + CARD_PRESETS.length) % CARD_PRESETS.length]!
}

/**
 * Cover art for index cards — mesh gradient + abstract line mark, picked
 * deterministically per post so each card is distinct but stable.
 * Decorative: the parent link already names the post.
 */
export function BlogCardArt({ seed }: { seed: string }) {
  const preset = blogArtPreset(seed)
  return (
    <div
      aria-hidden
      className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-[20px] dark:brightness-90"
      style={{ background: preset.bg }}
    >
      <div className="grid h-full w-full place-items-center [&>svg]:h-1/3 [&>svg]:w-auto" aria-hidden>
        {preset.mark}
      </div>
    </div>
  )
}
