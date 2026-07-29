import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Typography wrapper for MDX content. `prose` comes from
 * @tailwindcss/typography (registered in globals.css); the modifiers map it
 * onto the existing design tokens and keep dark mode (`.dark` class) working.
 */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'prose max-w-none dark:prose-invert',
        'prose-headings:scroll-mt-24 prose-headings:font-medium prose-headings:tracking-[-0.35px]',
        'prose-a:font-medium prose-a:text-foreground prose-a:decoration-primary/50 prose-a:underline-offset-4 hover:prose-a:decoration-primary',
        'prose-strong:text-foreground',
        'prose-code:before:content-none prose-code:after:content-none prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-normal',
        'prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:bg-muted',
        'prose-hr:border-border prose-img:rounded-xl',
        className,
      )}
    >
      {children}
    </div>
  )
}
