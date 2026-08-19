import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { docs } from '@/lib/content'
import { cn } from '@/lib/utils'

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}

export function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 lg:gap-3"
      aria-label="Search docs"
    >
      <SearchIcon className="size-3.5" />
      <span className="hidden sm:inline">Search</span>
      <span className="hidden items-center gap-1 rounded bg-card px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground shadow-sm ring-1 ring-border lg:inline-flex">
        <span className="text-[10px]">⌘</span>K
      </span>
    </button>
  )
}

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return docs.slice(0, 6)
    return docs
      .filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.slug.toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [query])

  const [activeIndex, setActiveIndex] = useState(0)

  // Reset active index when results change
  useEffect(() => setActiveIndex(0), [results])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      setQuery('')
    }
  }, [open])

  // Close on Escape, handle arrow keys
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && results[activeIndex]) {
      navigate(`/docs/${results[activeIndex].slug}`)
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={onClose} aria-hidden />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
        className="relative flex w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl max-[560px]:mx-4"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs…"
            className="h-12 w-full bg-transparent text-[14px] placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[320px] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">No results for “{query}”</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {results.map((doc, i) => (
                <li key={doc.slug}>
                  <button
                    onClick={() => {
                      navigate(`/docs/${doc.slug}`)
                      onClose()
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      'flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors',
                      i === activeIndex ? 'bg-muted' : 'hover:bg-muted/50',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                        {doc.group}
                      </span>
                      {i === activeIndex && (
                        <span className="text-[11px] text-muted-foreground">· {doc.slug}</span>
                      )}
                    </span>
                    <span className="text-[13.5px] font-medium leading-[1.3] tracking-[-0.3px] text-foreground">
                      {doc.title}
                    </span>
                    <span className="line-clamp-1 text-[12.5px] leading-[1.4] text-muted-foreground">
                      {doc.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">↑↓</kbd> Navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">↵</kbd> Select
            </span>
          </span>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  )
}

/** Global Cmd+K / Ctrl+K listener. */
export function useSearchHotkey(onOpen: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onOpen])
}
