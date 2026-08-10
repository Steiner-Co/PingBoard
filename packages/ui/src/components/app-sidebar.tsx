import * as React from "react"
import { Link } from "react-router-dom"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { VersionBadge } from "@/components/version-badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ChartBar } from "@phosphor-icons/react/dist/icons/ChartBar"
import { Globe } from "@phosphor-icons/react/dist/icons/Globe"
import { WarningCircle } from "@phosphor-icons/react/dist/icons/WarningCircle"
import { CalendarBlank } from "@phosphor-icons/react/dist/icons/CalendarBlank"
import { Bell } from "@phosphor-icons/react/dist/icons/Bell"
import { GearSix } from "@phosphor-icons/react/dist/icons/GearSix"
import { Monitor } from "@phosphor-icons/react/dist/icons/Monitor"

const navGroups = [
  {
    label: "Monitor",
    items: [
      { title: "Dashboard", url: "/admin", icon: ChartBar },
      { title: "Domains", url: "/admin/domains", icon: Globe },
      { title: "Incidents", url: "/admin/incidents", icon: WarningCircle },
      { title: "Maintenance", url: "/admin/maintenance", icon: CalendarBlank },
    ],
  },
  {
    label: "Configure",
    items: [
      { title: "Channels", url: "/admin/channels", icon: Bell },
      { title: "Status pages", url: "/admin/pages", icon: Monitor },
      { title: "Settings", url: "/admin/settings", icon: GearSix },
    ],
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: { name: string; email: string }
  onLogout: () => void | Promise<void>
}

export function AppSidebar({ user, onLogout, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:h-auto data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to="/admin">
                <img src="/logomark.png" alt="" className="size-6 rounded-md" />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span translate="no" className="truncate text-sm font-semibold text-sidebar-accent-foreground">
                    PingBoard
                  </span>
                  <span className="truncate text-[11px] text-sidebar-foreground">
                    Uptime monitoring
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navGroups} />
      </SidebarContent>
      <SidebarFooter>
        <VersionBadge />
        <NavUser user={user} onLogout={onLogout} />
      </SidebarFooter>
    </Sidebar>
  )
}
