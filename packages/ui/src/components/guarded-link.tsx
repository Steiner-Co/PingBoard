import { forwardRef } from 'react'
import { Link, useNavigate, type LinkProps } from 'react-router-dom'

import { useUnsavedChanges } from '@/contexts/unsaved-changes'

/**
 * A `<Link>` that asks the active form for permission before navigating.
 * Modifier-clicks fall through untouched — they open a new tab, so nothing
 * is lost.
 *
 * forwardRef is required: the sidebar renders this through Radix `asChild`
 * slots, which pass a ref down and warn (and lose tooltip positioning) if the
 * component swallows it.
 */
export const GuardedLink = forwardRef<HTMLAnchorElement, LinkProps>(
  function GuardedLink(
    { to, onClick, replace, state, relative, preventScrollReset, ...props },
    ref,
  ) {
  const { confirmLeave } = useUnsavedChanges()
  const navigate = useNavigate()

  return (
    <Link
      ref={ref}
      to={to}
      replace={replace}
      state={state}
      relative={relative}
      preventScrollReset={preventScrollReset}
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
          // Re-navigating by hand means Link's own options would be dropped
          // unless they're forwarded explicitly.
          if (ok) navigate(to, { replace, state, relative, preventScrollReset })
        })
      }}
      {...props}
    />
  )
  },
)
