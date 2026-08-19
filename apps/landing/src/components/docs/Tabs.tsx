import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TabItem {
  label: string
  value: string
  content: ReactNode
}

export function Tabs({ items, defaultValue }: { items: TabItem[]; defaultValue?: string }) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.value)

  const activeItem = items.find((i) => i.value === active) ?? items[0]

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border">
      <div role="tablist" className="flex gap-0 border-b border-border bg-muted/40 px-1">
        {items.map((item) => (
          <button
            key={item.value}
            role="tab"
            aria-selected={active === item.value}
            onClick={() => setActive(item.value)}
            className={cn(
              'relative -mb-px border-b-2 px-3 py-2.5 text-[13px] font-medium tracking-[-0.2px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
              active === item.value
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="bg-muted/20 p-0 [&_pre]:m-0 [&_pre]:rounded-none [&_pre]:border-0 [&_pre]:bg-transparent">
        {activeItem?.content}
      </div>
    </div>
  )
}

// Convenience for MDX: <CodeGroup><CodeTab label="cURL">...</CodeTab></CodeGroup>
// We keep it minimal — a Tabs wrapper specialized for code.
export function CodeGroup({ children }: { children: ReactNode }) {
  return <div className="my-6">{children}</div>
}
