import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Logo } from '@/components/logo'
import { ThemeSwitch } from '@/components/theme-switch'
import { cn } from '@/lib/utils'

interface NavLink {
  label: string
  /** Passed to react-router Link; may include a hash (/#features). */
  to: string
  isActive: (pathname: string) => boolean
}

const LINKS: NavLink[] = [
  // Product points at the hero anchor (#top), not the feature grid —
  // it goes through the router either way, so no full page reload.
  { label: 'Product', to: '/#top', isActive: (p) => p === '/' },
  { label: 'About', to: '/about', isActive: (p) => p === '/about' },
  { label: 'Docs', to: '/docs', isActive: (p) => p.startsWith('/docs') },
  { label: 'Blog', to: '/blog', isActive: (p) => p.startsWith('/blog') },
]

export function TopNav() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the mobile menu on navigation or Escape.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // Uniform px on every item: the active pill can sit on any route, so the
  // first/last labels must never touch the container's rounded edge.
  const linkClass = (active: boolean) =>
    cn(
      'rounded-full px-[18px] py-3 text-[14px] font-medium leading-[0.96] tracking-[-0.35px] outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.97]',
      active
        ? 'bg-foreground text-background'
        : 'text-foreground/60 hover:text-foreground',
    )

  return (
    <header className="relative flex w-full items-center justify-between">
      <Link to="/" aria-label="PingBoard home" className="rounded-[4px] outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.97]">
        <Logo className="size-[34px] rounded-[4px]" />
      </Link>
      {/* Desktop pill nav — overflows sub-sm viewports, replaced by the menu below */}
      <div className="hidden items-center gap-2 sm:flex">
        <nav className="flex items-center rounded-full bg-muted">
          {LINKS.map((l) => {
            const active = l.isActive(pathname)
            return (
              <Link key={l.label} to={l.to} aria-current={active ? 'page' : undefined} className={linkClass(active)}>
                {l.label}
              </Link>
            )
          })}
        </nav>
        <ThemeSwitch className="size-9 shrink-0" />
      </div>
      {/* Mobile: theme + menu button with a dropdown panel */}
      <div className="flex items-center gap-2 sm:hidden">
        <ThemeSwitch className="size-9 shrink-0" />
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-foreground outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-95"
        >
          {menuOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden>
              <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          )}
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden />
            <nav
              aria-label="Site"
              className="absolute right-0 top-[calc(100%+8px)] z-40 flex w-48 flex-col gap-1 rounded-2xl border border-border bg-card p-2 shadow-xl"
            >
              {LINKS.map((l) => {
                const active = l.isActive(pathname)
                return (
                  <Link
                    key={l.label}
                    to={l.to}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'rounded-xl px-3 py-2.5 text-[14px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/30',
                      active ? 'bg-foreground text-background' : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {l.label}
                  </Link>
                )
              })}
            </nav>
          </>
        )}
      </div>
    </header>
  )
}
