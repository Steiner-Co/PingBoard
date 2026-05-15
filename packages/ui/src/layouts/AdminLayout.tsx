import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useAuth } from '@/contexts/auth'

const ROUTE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/monitors/new': 'Add monitor',
  '/admin/incidents': 'Incidents',
  '/admin/maintenance': 'Maintenance',
  '/admin/channels': 'Channels',
  '/admin/pages': 'Status pages',
  '/admin/settings': 'Settings',
}

function titleForPath(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  if (/^\/admin\/monitors\/[^/]+\/edit$/.test(pathname)) return 'Edit monitor'
  if (pathname.startsWith('/admin/monitors/')) return 'Monitor'
  if (pathname.startsWith('/admin/monitors')) return 'Monitors'
  return 'Dashboard'
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const title = titleForPath(pathname)

  // Reflect the current section in the browser tab so admins juggling
  // multiple tabs can find PingBoard at a glance.
  useEffect(() => {
    document.title = `${title} — PingBoard`
  }, [title])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const sidebarUser = {
    name: user?.email?.split('@')[0] ?? 'User',
    email: user?.email ?? '',
  }

  return (
    <SidebarProvider
      style={{
        // Block ships these as scoped CSS vars; declare them on the provider.
        ['--sidebar-width' as string]: 'calc(var(--spacing) * 72)',
        ['--header-height' as string]: 'calc(var(--spacing) * 12)',
      }}
    >
      <AppSidebar variant="inset" user={sidebarUser} onLogout={handleLogout} />
      <SidebarInset>
        <SiteHeader title={title} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <Outlet />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
