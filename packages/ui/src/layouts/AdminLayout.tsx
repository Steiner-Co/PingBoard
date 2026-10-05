import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import {
  PrimaryActionContext,
  type PrimaryAction,
} from '@/contexts/primary-action'
import { cn } from '@/lib/utils'
import './shell.css'

const ROUTE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/monitors/new': 'Add monitor',
  '/admin/domains': 'Domains',
  '/admin/incidents': 'Incidents',
  '/admin/maintenance': 'Maintenance',
  '/admin/channels': 'Channels',
  '/admin/pages': 'Status pages',
  '/admin/settings': 'Settings',
}

// Pages that know something the route can't (a monitor's name) push a title
// up to the shell, which drives both the header and the browser tab.
const PageTitleContext = createContext<(title: string | null) => void>(() => {})

export function usePageTitle(title: string | null): void {
  const setTitle = useContext(PageTitleContext)
  useEffect(() => {
    setTitle(title)
    return () => setTitle(null)
  }, [setTitle, title])
}

function titleForPath(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  if (/^\/admin\/monitors\/[^/]+\/edit$/.test(pathname)) return 'Edit monitor'
  if (pathname.startsWith('/admin/monitors/')) return 'Monitor'
  if (pathname.startsWith('/admin/monitors')) return 'Monitors'
  if (/^\/admin\/pages\/[^/]+\/edit$/.test(pathname)) return 'Edit status page'
  return 'Dashboard'
}

const COLLAPSED_KEY = 'pb-shell-collapsed'

export function AdminLayout() {
  const { pathname } = useLocation()
  const [override, setOverride] = useState<string | null>(null)
  const title = override ?? titleForPath(pathname)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === '1',
  )
  const [navOpen, setNavOpen] = useState(false)
  const [primaryAction, setPrimaryAction] = useState<PrimaryAction | null>(null)
  const primaryActionState = useMemo(
    () => ({ action: primaryAction, setAction: setPrimaryAction }),
    [primaryAction],
  )

  // Reflect the current section in the browser tab so admins juggling
  // multiple tabs can find PingBoard at a glance.
  useEffect(() => {
    document.title = `${title} — PingBoard`
  }, [title])

  // The mobile overlay closes on navigation.
  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  const toggleSidebar = useCallback(() => {
    // Narrow viewports get the overlay nav; wide ones collapse the rail.
    if (window.innerWidth <= 900) {
      setCollapsed(false)
      setNavOpen((open) => !open)
      return
    }
    setNavOpen(false)
    setCollapsed((was) => {
      localStorage.setItem(COLLAPSED_KEY, was ? '0' : '1')
      return !was
    })
  }, [])

  return (
    <PageTitleContext.Provider value={setOverride}>
      <PrimaryActionContext.Provider value={primaryActionState}>
      <div className="shell-canvas">
        {/* Screen-reader / keyboard-only: jump past the sidebar+header to the
            main content. Visually hidden until focused. */}
        <a
          href="#main-content"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-3 focus-visible:top-3 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-foreground focus-visible:px-3 focus-visible:py-1.5 focus-visible:text-sm focus-visible:text-background focus-visible:shadow-lg"
        >
          Skip to main content
        </a>
        <div
          className={cn('shell', collapsed && 'shell-collapsed', navOpen && 'shell-nav-open')}
        >
          <AppSidebar />
          <div className="shell-panel">
            <SiteHeader title={title} onToggleSidebar={toggleSidebar} />
            <main id="main-content" tabIndex={-1} className="shell-body">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
      </PrimaryActionContext.Provider>
    </PageTitleContext.Provider>
  )
}
