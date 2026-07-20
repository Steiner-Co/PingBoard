import { Link, useNavigate, type LinkProps } from 'react-router-dom'

import { useUnsavedChanges } from '@/contexts/unsaved-changes'

/**
 * A `<Link>` that asks the active form for permission before navigating.
 * Modifier-clicks fall through untouched — they open a new tab, so nothing
 * is lost.
 */
export function GuardedLink({ to, onClick, ...props }: LinkProps) {
  const { confirmLeave } = useUnsavedChanges()
  const navigate = useNavigate()

  return (
    <Link
      to={to}
      onClick={(e) => {
        onClick?.(e)
        if (
          e.defaultPrevented ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          e.button !== 0
        ) {
          return
        }
        e.preventDefault()
        void confirmLeave().then((ok) => {
          if (ok) navigate(to)
        })
      }}
      {...props}
    />
  )
}
