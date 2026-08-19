import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Wordmark } from '@/components/logo'
import { ThemeSwitch } from '@/components/theme-switch'
import { DocsSidebar } from '@/components/docs/DocsSidebar'
import { SearchPalette, SearchTrigger, useSearchHotkey } from '@/components/docs/Search'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="size-4" aria-hidden>
      <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="size-4" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Full-bleed docs shell — Fumadocs-inspired.
 * Header + 3-col body (sidebar | article | TOC) on desktop,
 * sheet nav on mobile. Landing page is untouched.
 */
export function DocsShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useSearchHotkey(() => setSearchOpen(true))

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 lg:hidden"
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileOpen}
            >
              <MenuIcon open={mobileOpen} />
            </button>

            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              aria-label="PingBoard home"
            >
              <Wordmark />
            </Link>

            <nav className="hidden items-center gap-1 lg:flex" aria-label="Site">
              <Link
                to="/docs"
                className="rounded-full bg-foreground px-3 py-1.5 text-[13px] font-medium text-background"
                aria-current="page"
              >
                Docs
              </Link>
              <Link
                to="/blog"
                className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Blog
              </Link>
              <Link
                to="/about"
                className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                About
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <SearchTrigger onOpen={() => setSearchOpen(true)} />
            <a
              href="https://github.com/Steiner-Co/PingBoard"
              target="_blank"
              rel="noreferrer"
              className="hidden size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              aria-label="GitHub"
            >
              <GithubIcon className="size-4" />
            </a>
            <ThemeSwitch className="size-8" iconSize={14} />
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="mx-auto flex max-w-[1440px] items-start px-4 sm:px-6 lg:px-8">
        {/* Left sidebar — desktop */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[240px] shrink-0 overflow-y-auto border-r border-border py-6 pr-6 lg:block">
          <DocsSidebar />
        </aside>

        {/* Center + right */}
        <div className="min-w-0 flex-1 lg:pl-8">
          <Outlet />
        </div>
      </div>

      {/* ── Mobile sheet ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 lg:hidden">
          <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute left-0 top-14 h-[calc(100vh-3.5rem)] w-[300px] overflow-y-auto border-r border-border bg-background p-6 shadow-xl">
            <DocsSidebar onNavigate={() => setMobileOpen(false)} />
            <div className="mt-6 flex flex-col gap-1 border-t border-border pt-6">
              <Link
                to="/blog"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-2 py-1.5 text-[13.5px] text-muted-foreground hover:text-foreground"
              >
                Blog
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-2 py-1.5 text-[13.5px] text-muted-foreground hover:text-foreground"
              >
                About
              </Link>
              <a
                href="https://github.com/Steiner-Co/PingBoard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13.5px] text-muted-foreground hover:text-foreground"
              >
                <GithubIcon className="size-3.5" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      )}

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
