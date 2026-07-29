import { Link, useLocation } from 'react-router-dom'
import { Logo } from '@/components/logo'
import { ThemeSwitch } from '@/components/theme-switch'
import { cn } from '@/lib/utils'

interface NavLink {
  label: string
  /** Internal route (rendered as react-router Link) or hash anchor (plain <a>). */
  href: string
  internal?: boolean
  isActive: (pathname: string) => boolean
}

const LINKS: NavLink[] = [
  { label: 'Product', href: '/#features', isActive: (p) => p === '/' },
  { label: 'About', href: '/#about', isActive: () => false },
  { label: 'Docs', href: '/docs', internal: true, isActive: (p) => p.startsWith('/docs') },
  { label: 'Blog', href: '/blog', internal: true, isActive: (p) => p.startsWith('/blog') },
]

export function TopNav() {
  const { pathname } = useLocation()

  // Uniform px on every item: the active pill can sit on any route, so the
  // first/last labels must never touch the container's rounded edge.
  const linkClass = (active: boolean) =>
    cn(
      'rounded-full px-[18px] py-3 text-[14px] font-medium leading-[0.96] tracking-[-0.35px] outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.98]',
      active
        ? 'bg-foreground text-background'
        : 'text-foreground/60 hover:text-foreground',
    )

  return (
    <header className="flex w-full items-center justify-between">
      <Link to="/" aria-label="PingBoard home" className="rounded-[4px] outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.98]">
        <Logo className="size-[34px] rounded-[4px]" />
      </Link>
      <div className="flex items-center gap-2">
        <nav className="flex items-center rounded-full bg-muted">
          {LINKS.map((l) => {
            const active = l.isActive(pathname)
            return l.internal ? (
              <Link key={l.label} to={l.href} aria-current={active ? 'page' : undefined} className={linkClass(active)}>
                {l.label}
              </Link>
            ) : (
              <a key={l.label} href={l.href} aria-current={active ? 'page' : undefined} className={linkClass(active)}>
                {l.label}
              </a>
            )
          })}
        </nav>
        <ThemeSwitch className="size-9 shrink-0" />
      </div>
    </header>
  )
}
