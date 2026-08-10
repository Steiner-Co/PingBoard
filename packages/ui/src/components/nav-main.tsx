import { useLocation } from "react-router-dom"
import { useRef, type ComponentType } from "react"
import type { IconProps as PhosphorIconProps } from "@phosphor-icons/react"

import { Link } from "react-router-dom"
import { Icon } from "@/components/ui/icon"
import { PlusSquare } from "@phosphor-icons/react/dist/icons/PlusSquare"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export interface NavGroup {
  label: string | null
  items: { title: string; url: string; icon: ComponentType<PhosphorIconProps> }[]
}

/**
 * Sidebar nav icon with a two-state language:
 *
 * - **Selected** items render the `fill` weight — the app-wide brand weight —
 *   so "you are here" reads at a glance; a 100ms fade covers the swap.
 * - **Idle** items render at line weight (`regular`) and draw their strokes
 *   in on hover via a Web Animations API dash-offset sweep; leaving cancels
 *   and restores the drawn state instantly. The CSS-transition alternative
 *   proved unreliable — the rAF "re-enable transition" trick collapses into
 *   the event's own frame (before style recalc), so the browser never sees
 *   the intermediate hidden state and no transition starts. WAAPI always
 *   animates and is cancellable.
 *
 * Reduced-motion users skip the draw effect entirely (nothing ever hides);
 * the fill-vs-line state distinction still works for them.
 */
function NavIcon({
  icon,
  active,
}: {
  icon: ComponentType<PhosphorIconProps>
  active: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const anims = useRef<Animation[]>([])

  const draw = (on: boolean) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const all = [...(ref.current?.querySelectorAll("path") ?? [])] as SVGPathElement[]
    if (!all.length) return
    anims.current.forEach((a) => a.cancel())
    anims.current = []
    for (const p of all) {
      if (on) {
        // A dash-offset sweep needs an explicit dash-array to sweep against
        // (stroke-dashoffset alone is a no-op); the array is cleared again
        // when the draw completes so the idle icon renders as a plain line.
        const len = p.getTotalLength()
        p.style.strokeDasharray = `${len}`
        const anim = p.animate(
          [{ strokeDashoffset: `${len}` }, { strokeDashoffset: "0" }],
          { duration: 300, easing: "cubic-bezier(0.25, 1, 0.5, 1)" },
        )
        anim.addEventListener("finish", () => {
          p.style.strokeDasharray = ""
          p.style.strokeDashoffset = ""
        })
        anims.current.push(anim)
      } else {
        p.style.strokeDasharray = ""
        p.style.strokeDashoffset = ""
      }
    }
  }

  if (active) {
    return (
      <span className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-100">
        <Icon icon={icon} weight="fill" />
      </span>
    )
  }

  return (
    <span
      ref={ref}
      className="nav-icon-line"
      onPointerEnter={() => draw(true)}
      onPointerLeave={() => draw(false)}
    >
      <Icon icon={icon} weight="regular" />
    </span>
  )
}

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const { pathname } = useLocation()

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Add monitor"
                className="min-w-8 bg-primary text-primary-foreground duration-150 ease-out hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground active:scale-[0.97]"
              >
                <Link to="/admin/monitors/new">
                  <Icon icon={PlusSquare} />
                  <span>Add monitor</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      {groups.map((group) => (
        <SidebarGroup key={group.label ?? "main"} className="py-1">
          {group.label && (
            <SidebarGroupLabel className="font-mono text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive =
                  item.url === "/admin"
                    ? pathname === "/admin" || pathname.startsWith("/admin/monitors")
                    : pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                      className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium"
                    >
                      <Link to={item.url}>
                        <NavIcon icon={item.icon} active={isActive} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}
