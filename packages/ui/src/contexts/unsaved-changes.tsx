import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'

/** Resolves true when it's OK to navigate away. */
type Guard = () => Promise<boolean>

interface UnsavedChangesValue {
  register: (guard: Guard | null) => void
  confirmLeave: Guard
}

const UnsavedChangesContext = createContext<UnsavedChangesValue | null>(null)

/**
 * Lets a form claim the app's navigation links while it holds unsaved edits.
 *
 * React Router's `useBlocker` would be the obvious tool, but it requires a
 * data router (`createBrowserRouter`) and this app mounts a plain
 * `<BrowserRouter>` — calling it throws. This context covers the realistic
 * loss path (clicking the sidebar mid-edit); `beforeunload` still covers tab
 * close and reload.
 */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<Guard | null>(null)

  const register = useCallback((guard: Guard | null) => {
    guardRef.current = guard
  }, [])

  const confirmLeave = useCallback<Guard>(async () => {
    return guardRef.current ? guardRef.current() : true
  }, [])

  return (
    <UnsavedChangesContext.Provider value={{ register, confirmLeave }}>
      {children}
    </UnsavedChangesContext.Provider>
  )
}

export function useUnsavedChanges(): UnsavedChangesValue {
  const ctx = useContext(UnsavedChangesContext)
  // Outside the admin shell (login, setup, public page) nothing can be dirty,
  // so a no-op keeps those trees from needing the provider.
  return ctx ?? { register: () => {}, confirmLeave: async () => true }
}

/** Registers `guard` while `active`; clears it on unmount. */
export function useUnsavedGuard(active: boolean, guard: Guard): void {
  const { register } = useUnsavedChanges()
  const guardRef = useRef(guard)
  guardRef.current = guard

  useEffect(() => {
    if (!active) return
    register(() => guardRef.current())
    return () => register(null)
  }, [active, register])
}
