const links = [
  { label: 'README', href: '#readme', active: true },
  { label: 'Docs', href: '#docs' },
  { label: 'Features', href: '#features' },
  { label: 'Plugins', href: '#plugins' },
  { label: 'Dashboard', href: '#dashboard' },
  { label: 'GitHub', href: 'https://github.com/steiner-co/pingboard' },
]

export function RightColumnNav() {
  return (
    <div className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="flex h-12 items-stretch">
        <nav className="flex flex-1 items-stretch overflow-x-auto">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={
                'relative flex items-center px-5 text-[0.6875rem] uppercase tracking-[0.18em] transition-colors hover:text-foreground' +
                (link.active
                  ? ' text-foreground after:absolute after:inset-x-4 after:bottom-[-1px] after:h-[2px] after:bg-foreground'
                  : ' text-muted-foreground')
              }
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href="/login"
          className="flex items-center gap-1.5 border-l border-border/60 bg-foreground/95 px-5 text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-background transition-colors hover:bg-foreground"
        >
          Sign In
          <span aria-hidden>↗</span>
        </a>
      </div>
    </div>
  )
}
