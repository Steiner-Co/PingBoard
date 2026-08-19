import { NavLink } from 'react-router-dom'
import { docsByGroup } from '@/lib/content'
import { cn } from '@/lib/utils'

function DocsIcon({ slug, active }: { slug: string; active: boolean }) {
  const cls = cn('size-3.5 shrink-0', active ? 'text-foreground' : 'text-muted-foreground')
  // Minimal line icons — one per common doc slug
  switch (slug) {
    case 'getting-started':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={cls} aria-hidden>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" strokeLinejoin="round" />
        </svg>
      )
    case 'monitors':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={cls} aria-hidden>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" strokeLinecap="round" />
        </svg>
      )
    case 'monitor-types':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={cls} aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      )
    case 'notifications':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={cls} aria-hidden>
          <path d="M6 8a6 6 0 0 1 12 0c0 7-6 9-6 9s-6-2-6-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
        </svg>
      )
    case 'status-pages':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={cls} aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 9h6M9 13h6M9 17h6" strokeLinecap="round" />
        </svg>
      )
    case 'maintenance-windows':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={cls} aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )
    case 'api-tokens':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={cls} aria-hidden>
          <path d="M15 7a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2Z" />
          <path d="M12.5 11.5 7 17l-2 2 2-2 5.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13 11 9 7l3-3 4 4-3 3Z" strokeLinejoin="round" />
        </svg>
      )
    case 'mcp':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={cls} aria-hidden>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 9h6M9 13h6M9 17h6" strokeLinecap="round" />
          <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
          <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none" />
          <circle cx="9" cy="17" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'cli':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={cls} aria-hidden>
          <path d="M8 9 3 12l5 3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13 9h6M13 15h6" strokeLinecap="round" />
        </svg>
      )
    case 'self-hosting':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={cls} aria-hidden>
          <rect x="2" y="4" width="20" height="6" rx="1.5" />
          <rect x="2" y="14" width="20" height="6" rx="1.5" />
          <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
          <circle cx="7" cy="17" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={cls} aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" strokeLinejoin="round" />
        </svg>
      )
  }
}

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const groups = docsByGroup()

  return (
    <nav aria-label="Documentation" className="flex flex-col gap-6">
      {groups.map(({ group, items }) => (
        <div key={group} className="flex flex-col gap-1">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {group}
          </p>
          <div className="flex flex-col gap-0.5">
            {items.map((doc) => (
              <NavLink
                key={doc.slug}
                to={`/docs/${doc.slug}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13.5px] leading-[1.35] tracking-[-0.2px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/30',
                    isActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <DocsIcon slug={doc.slug} active={isActive} />
                    {doc.title}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
