import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { TopNav } from '@/sections/TopNav'
import { SiteFooter } from '@/sections/SiteFooter'

/**
 * Shared chrome for Docs, Blog and 404: same dotted page background and
 * floating card as the landing page. `width="wide"` gives docs a bigger
 * content column (the landing's 596px card is too narrow for a sidebar);
 * the default matches the landing card exactly.
 */
export function SiteLayout({
  children,
  width,
}: {
  children?: ReactNode
  width?: 'narrow' | 'wide'
}) {
  return (
    <div className="page-dots min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/15">
      <div className="px-4 py-6 sm:py-10">
        <main
          className={
            width === 'wide'
              ? 'mx-auto max-w-[1024px] rounded-[28px] border border-border/70 bg-card p-6 sm:p-10'
              : 'mx-auto max-w-[596px] rounded-[28px] border border-border/70 bg-card p-6'
          }
        >
          <div className="flex flex-col gap-12">
            <TopNav />
            {children ?? <Outlet />}
            <SiteFooter />
          </div>
        </main>
      </div>
    </div>
  )
}
