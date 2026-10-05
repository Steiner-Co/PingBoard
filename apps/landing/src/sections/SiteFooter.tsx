import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StudioModal } from '@/components/StudioModal'

const LINKS = [
  { label: 'Community', href: 'https://github.com/steiner-co/pingboard/discussions' },
  { label: 'Changelog', href: 'https://github.com/steiner-co/pingboard/releases' },
  { label: 'License', href: 'https://github.com/steiner-co/pingboard/blob/main/LICENSE' },
]

export function SiteFooter() {
  const [studioOpen, setStudioOpen] = useState(false)

  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-[12px] text-foreground/50">
      <div className="flex items-center gap-2">
          <span>Software by</span>
          <button
            type="button"
            onClick={() => setStudioOpen(true)}
            aria-haspopup="dialog"
            aria-label="About Steiner&Co."
            translate="no"
            className="inline-flex items-center rounded-[4px] text-foreground/80 outline-none transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.98]"
          >
            <img
              src="/steiner-co-fulllogo.svg"
              alt="Steiner&Co."
              className="brand-logo h-[22px] w-auto"
            />
          </button>
      </div>
      <nav className="flex items-center gap-5">
        {LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="transition-colors duration-150 hover:text-foreground"
          >
            {l.label}
          </a>
        ))}
        <Link
          to="/docs"
          className="outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          Docs
        </Link>
      </nav>
      <StudioModal open={studioOpen} onClose={() => setStudioOpen(false)} />
    </footer>
  )
}
