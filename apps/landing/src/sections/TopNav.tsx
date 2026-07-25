import { Logo } from '@/components/logo'
import { ThemeSwitch } from '@/components/theme-switch'
import { cn } from '@/lib/utils'

const LINKS = [
  { label: 'Product', href: '#features', active: true },
  { label: 'About', href: '#about' },
  { label: 'Docs', href: '#faq' },
  { label: 'Blog', href: 'https://github.com/steiner-co/pingboard' },
]

export function TopNav() {
  return (
    <header className="flex w-full items-center justify-between">
      <a href="#top" aria-label="PingBoard home" className="transition-transform active:scale-[0.97]">
        <Logo className="size-[34px] rounded-[4px]" />
      </a>
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-2 rounded-full bg-muted pr-[18px] sm:gap-4">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className={cn(
                'rounded-full text-[14px] font-medium leading-[0.96] tracking-[-0.35px] transition-colors',
                l.active
                  ? 'bg-foreground px-[18px] py-3 text-background'
                  : 'py-3 text-foreground/60 hover:text-foreground',
              )}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <ThemeSwitch className="size-9 shrink-0" />
      </div>
    </header>
  )
}
