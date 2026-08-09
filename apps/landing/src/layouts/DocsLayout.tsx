import { Link, NavLink, Outlet } from 'react-router-dom'
import { docsByGroup } from '@/lib/content'
import { cn } from '@/lib/utils'

/**
 * Docs chrome: left sidebar grouped by frontmatter `group` (sorted by
 * `order`), content rendered by the nested route. On mobile the sidebar
 * stacks above the content.
 */
export function DocsLayout() {
  const groups = docsByGroup()

  return (
    <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
      <nav aria-label="Documentation" className="shrink-0 lg:sticky lg:top-6 lg:self-start">
        <div className="flex flex-col gap-6">
          {groups.map(({ group, items }) => (
            <div key={group} className="flex flex-col gap-1">
              <p className="px-3 pb-1 text-[12px] font-medium tracking-wide text-foreground/40">
                {group}
              </p>
              {items.map((doc) => (
                <NavLink
                  key={doc.slug}
                  to={`/docs/${doc.slug}`}
                  className={({ isActive }) =>
                    cn(
                      'rounded-[8px] px-3 py-1.5 text-[14px] leading-[1.35] tracking-[-0.35px] outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.97]',
                      isActive
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-foreground/60 hover:text-foreground',
                    )
                  }
                >
                  {doc.title}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}

/** Prev/next pager rendered at the bottom of each docs page. */
export function DocsPager({ prev, next }: { prev?: { slug: string; title: string }; next?: { slug: string; title: string } }) {
  return (
    <nav aria-label="Pagination" className="mt-16 flex items-stretch justify-between gap-4 border-t border-border pt-6">
      {prev ? (
        <Link
          to={`/docs/${prev.slug}`}
          className="group flex flex-col gap-1 rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <span className="text-[12px] text-foreground/40">Previous</span>
          <span className="text-[14px] font-medium text-foreground/70 transition-colors duration-150 group-hover:text-foreground">
            ← {prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          to={`/docs/${next.slug}`}
          className="group flex flex-col items-end gap-1 rounded-[8px] text-right outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <span className="text-[12px] text-foreground/40">Next</span>
          <span className="text-[14px] font-medium text-foreground/70 transition-colors duration-150 group-hover:text-foreground">
            {next.title} →
          </span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
