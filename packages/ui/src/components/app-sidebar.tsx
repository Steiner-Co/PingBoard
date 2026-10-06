import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "react-router-dom"
import {
  Bell,
  CalendarCheck,
  Cube,
  GearSix,
  Globe,
  Pulse,
  Warning,
} from "@phosphor-icons/react"
import type { Icon as PhosphorIcon } from "@phosphor-icons/react"
import { Icon } from "@/components/ui/icon"
import { api } from "@/lib/api"

interface NavItem {
  title: string
  url: string
  icon: PhosphorIcon
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Monitor",
    items: [
      { title: "Monitors", url: "/admin", icon: Pulse },
      { title: "Domains", url: "/admin/domains", icon: Globe },
      { title: "Incidents", url: "/admin/incidents", icon: Warning },
      { title: "Maintenance", url: "/admin/maintenance", icon: CalendarCheck },
    ],
  },
  {
    label: "Configure",
    items: [
      { title: "Channels", url: "/admin/channels", icon: Bell },
      { title: "Status pages", url: "/admin/pages", icon: Cube },
      { title: "Settings", url: "/admin/settings", icon: GearSix },
    ],
  },
]

function isActive(pathname: string, url: string): boolean {
  if (url === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/monitors")
  }
  return pathname === url || pathname.startsWith(`${url}/`)
}

interface InstanceInfo {
  version: string
}

/**
 * Sidebar version card. Shares the ['instance'] query key with the Settings
 * Instance card, so react-query dedupes the fetch. Renders nothing until
 * loaded — the footer shouldn't shift under the user's cursor.
 */
function VersionCard() {
  const query = useQuery({
    queryKey: ["instance"],
    queryFn: () => api.get<InstanceInfo>("/api/admin/instance"),
    staleTime: 30_000,
  })
  const version = query.data?.version
  if (!version) return null
  return (
    <Link to="/admin/settings" className="shell-version-card">
      <span className="shell-version-badge" aria-hidden />
      <div>
        <b>PingBoard · Selfhosted</b>
        <span>v{version}</span>
      </div>
    </Link>
  )
}

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="shell-sidebar" aria-label="Primary">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="shell-nav-section">{group.label}</div>
          <nav className="shell-nav" aria-label={group.label}>
            {group.items.map((item) => {
              const active = isActive(pathname, item.url)
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon icon={item.icon} stateful active={active} size={24} />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      ))}
      <div className="shell-footer">
        <VersionCard />
      </div>
    </aside>
  )
}
