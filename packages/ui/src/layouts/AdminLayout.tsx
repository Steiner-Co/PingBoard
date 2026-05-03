import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Activity03Icon,
  Notification03Icon,
  GlobeIcon,
  DashboardSquare01Icon,
  Logout03Icon,
  Settings02Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: DashboardSquare01Icon, end: true },
  { to: '/admin/monitors', label: 'Monitors', icon: Activity03Icon, end: false },
  { to: '/admin/channels', label: 'Channels', icon: Notification03Icon, end: false },
  { to: '/admin/pages', label: 'Status pages', icon: GlobeIcon, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings02Icon, end: false },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r bg-muted/30 flex flex-col">
        <div className="px-6 py-5 border-b">
          <Link to="/admin" className="flex items-center gap-2 font-semibold">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
            PingBoard
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )
              }
            >
              <HugeiconsIcon icon={item.icon} className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t space-y-2">
          <div className="text-xs text-muted-foreground px-3 truncate">
            {user?.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <HugeiconsIcon icon={Logout03Icon} className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
