const LINKS = [
  { label: 'Community', href: 'https://github.com/steiner-co/pingboard/discussions' },
  { label: 'Changelog', href: 'https://github.com/steiner-co/pingboard/releases' },
  { label: 'License', href: 'https://github.com/steiner-co/pingboard/blob/main/LICENSE' },
  { label: 'Docs', href: '#faq' },
]

export function SiteFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-[12px] text-foreground/50">
      <div className="flex items-center gap-2">
        <span>Software by</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
          <span className="grid size-4 place-items-center rounded-[4px] bg-foreground text-[9px] font-bold text-background">
            S
          </span>
          Steiner&amp;Co.
        </span>
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
      </nav>
    </footer>
  )
}
