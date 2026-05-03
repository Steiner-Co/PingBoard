import * as React from "react"
import { Link } from "react-router-dom"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Activity03Icon,
  Notification03Icon,
  GlobeIcon,
  DashboardSquare01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"

const navItems = [
  { title: "Dashboard", url: "/admin", icon: DashboardSquare01Icon },
  { title: "Monitors", url: "/admin/monitors", icon: Activity03Icon },
  { title: "Channels", url: "/admin/channels", icon: Notification03Icon },
  { title: "Status pages", url: "/admin/pages", icon: GlobeIcon },
  { title: "Settings", url: "/admin/settings", icon: Settings02Icon },
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
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to="/admin">
                <span className="inline-block size-2.5 rounded-full bg-success animate-pulse" />
                <span className="text-base font-semibold">PingBoard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onLogout={onLogout} />
      </SidebarFooter>
    </Sidebar>
  )
}
