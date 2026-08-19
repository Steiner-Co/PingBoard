import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Typography wrapper for MDX content. `prose` comes from
 * @tailwindcss/typography (registered in globals.css); the modifiers map it
 * onto the existing design tokens and keep dark mode (`.dark` class) working.
 */
export function Prose({ children, className, variant = 'default' }: { children: ReactNode; className?: string; variant?: 'default' | 'docs' }) {
  const isDocs = variant === 'docs'
  return (
    <div
      className={cn(
        'prose max-w-none dark:prose-invert',
        isDocs
          ? [
              // Docs: tighter, Fumadocs-like rhythm
              'prose-headings:scroll-mt-20 prose-headings:font-semibold prose-headings:tracking-[-0.4px]',
              'prose-h2:mt-10 prose-h2:text-[20px] prose-h2:leading-[1.25] prose-h2:tracking-[-0.4px]',
              'prose-h3:mt-8 prose-h3:text-[15px] prose-h3:leading-[1.35] prose-h3:tracking-[-0.3px]',
              'prose-p:text-[14px] prose-p:leading-[1.7] prose-p:text-foreground/80',
              'prose-li:text-[14px] prose-li:leading-[1.6] prose-li:text-foreground/80',
              'prose-strong:font-semibold prose-strong:text-foreground',
              'prose-a:font-medium prose-a:text-foreground prose-a:decoration-foreground/20 prose-a:underline-offset-4 hover:prose-a:decoration-foreground/40',
              'prose-code:before:content-none prose-code:after:content-none prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[12.5px] prose-code:font-medium prose-code:text-foreground',
              'prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:bg-muted',
              'prose-table:text-[13px] prose-th:text-left prose-th:font-semibold prose-th:text-foreground prose-td:text-foreground/80',
              'prose-hr:my-8 prose-hr:border-border prose-img:rounded-xl',
            ]
          : [
              'prose-headings:scroll-mt-24 prose-headings:font-medium prose-headings:tracking-[-0.35px]',
              'prose-a:font-medium prose-a:text-foreground prose-a:decoration-primary/50 prose-a:underline-offset-4 hover:prose-a:decoration-primary',
              'prose-strong:text-foreground',
              'prose-code:before:content-none prose-code:after:content-none prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-normal',
              'prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:bg-muted',
              'prose-hr:border-border prose-img:rounded-xl',
            ],
        className,
      )}
    >
      {children}
    </div>
  )
}
