import * as React from 'react'
import { Eye } from '@phosphor-icons/react/dist/icons/Eye'
import { EyeSlash } from '@phosphor-icons/react/dist/icons/EyeSlash'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Password field with an inline reveal toggle, shared by sign-in and setup so
 * the two stay identical. Wraps the raw `Input` rather than `FieldInput`:
 * password fields need real autofill semantics (see `ui/field.tsx`).
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input>
>(function PasswordInput({ className, ...props }, ref) {
  const [reveal, setReveal] = React.useState(false)

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={reveal ? 'text' : 'password'}
        className={cn('pr-8', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setReveal((v) => !v)}
        aria-label={reveal ? 'Hide password' : 'Show password'}
        aria-pressed={reveal}
        className="absolute top-1/2 right-0.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-[color,background-color,transform] duration-150 ease-out hover:bg-accent hover:text-foreground active:scale-[0.97]"
      >
        <Icon icon={reveal ? EyeSlash : Eye} className="size-3.5" />
      </button>
    </div>
  )
})
