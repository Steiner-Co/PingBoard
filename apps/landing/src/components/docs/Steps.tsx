import type { ReactNode } from 'react'

export function Steps({ children }: { children: ReactNode }) {
  return <div className="my-6 flex flex-col gap-4 [&>div]:relative [&>div]:pl-10">{children}</div>
}

export function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute left-0 top-0 flex size-7 items-center justify-center rounded-full border border-border bg-card text-[12px] font-semibold text-foreground shadow-sm">
        {/* auto-numbered via CSS counter */}
        <span className="step-number" />
      </div>
      <p className="pt-1 text-[13.5px] font-semibold tracking-[-0.2px] text-foreground">{title}</p>
      <div className="mt-1 text-[13.5px] leading-[1.6] text-foreground/75 [&_a]:text-foreground [&_a]:underline [&_a]:decoration-foreground/20 [&_a]:underline-offset-2 hover:[&_a]:decoration-foreground/40 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12.5px]">
        {children}
      </div>
    </div>
  )
}
