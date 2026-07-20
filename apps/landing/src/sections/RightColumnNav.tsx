import { useEffect, useRef, useState } from 'react'

// Order must match document order — the spy picks the topmost visible section.
const links = [
  { label: 'README', id: 'readme' },
  { label: 'Features', id: 'features' },
  { label: 'Docs', id: 'docs' },
  { label: 'Checks', id: 'plugins' },
  { label: 'Dashboard', id: 'dashboard' },
]

const sectionIds = links.map((l) => l.id)

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  // A click jumps past every section in between; without a lock the observer
  // would light each one up on the way down. Released once the target lands,
  // or after the scroll has had time to settle.
  const lock = useRef<{ id: string; until: number } | null>(null)

  useEffect(() => {
    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const top = ids.find((id) => visible.has(id))
        if (!top) return

        const held = lock.current
        if (held) {
          if (held.id !== top && Date.now() < held.until) return
          lock.current = null
        }
        setActive(top)
      },
      // Band starts just below the 48px sticky bar and ends mid-viewport, so
      // "active" means the section under the nav — not merely one on screen.
      // The extra 8px keeps a section that landed flush against the bar (an
      // anchor jump, via scroll-mt-12) from tying with the one above it.
      { rootMargin: '-56px 0px -60% 0px', threshold: 0 },
    )

    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids])

  const select = (id: string) => {
    lock.current = { id, until: Date.now() + 1200 }
    setActive(id)
  }

  return [active, select] as const
}

export function RightColumnNav() {
  const [active, select] = useScrollSpy(sectionIds)

  return (
    <div className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="flex h-12 items-stretch">
        <nav className="flex flex-1 items-stretch overflow-x-auto">
          {links.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={() => select(link.id)}
              aria-current={active === link.id ? 'true' : undefined}
              className={
                'relative flex items-center px-5 text-[0.6875rem] uppercase tracking-[0.18em] transition-[color,transform] duration-150 ease-out hover:text-foreground active:scale-[0.98]' +
                (active === link.id
                  ? ' text-foreground after:absolute after:inset-x-4 after:bottom-[-1px] after:h-[2px] after:bg-foreground'
                  : ' text-muted-foreground')
              }
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://github.com/steiner-co/pingboard"
            className="relative flex items-center px-5 text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground transition-[color,transform] duration-150 ease-out hover:text-foreground active:scale-[0.98]"
          >
            GitHub
          </a>
        </nav>
        <a
          href="/login"
          className="flex items-center gap-1.5 border-l border-border/60 bg-foreground/95 px-5 text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-background transition-[background-color,transform] duration-150 ease-out hover:bg-foreground active:scale-[0.98]"
        >
          Sign In
          <span aria-hidden>↗</span>
        </a>
      </div>
    </div>
  )
}
