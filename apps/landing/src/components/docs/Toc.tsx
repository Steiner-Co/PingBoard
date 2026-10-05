import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface TocItem {
  id: string
  text: string
  level: number
}

export function Toc({ items }: { items: TocItem[] }) {
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
    <nav aria-label="On this page" className="flex flex-col gap-1">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">On this page</p>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          onClick={(e) => {
            e.preventDefault()
            document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            history.replaceState(null, '', `#${item.id}`)
          }}
          className={cn(
            'block border-l-2 py-1 text-[13px] leading-[1.4] transition-colors duration-150',
            item.level === 3 ? 'pl-6' : 'pl-3',
            activeId === item.id
              ? 'border-foreground font-medium text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {item.text}
        </a>
      ))}
    </nav>
  )
}

/** Collect h2/h3 headings from the rendered article for the TOC. */
export function useToc() {
  const [items, setItems] = useState<TocItem[]>([])

  useEffect(() => {
    const article = document.querySelector('[data-docs-article]')
    if (!article) return

    const headings = article.querySelectorAll('h2[id], h3[id]')
    setItems(
      Array.from(headings).map((el) => ({
        id: el.id,
        text: (el.textContent ?? '').replace(/\s*#\s*$/, '').trim(),
        level: el.tagName === 'H2' ? 2 : 3,
      })),
    )
  }, [])

  return items
}
