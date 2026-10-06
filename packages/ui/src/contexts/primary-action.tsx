import { createContext, useContext, type ReactNode } from 'react'

/**
 * The shell's lime action adapts to the current screen — "Add monitor" on
 * most pages, "Add domain" on Domains, "Save changes" on the status page
 * editor. Pages register their action on mount and clear it on unmount; the
 * shell falls back to Add monitor.
 */
export interface PrimaryAction {
  label: string
  to?: string
  onClick?: () => void
  /** Greyed out but visible — e.g. Save with no unsaved changes. */
  disabled?: boolean
  /** Replaces the default PlusCircle; null renders no icon at all. */
  icon?: ReactNode | null
}

interface PrimaryActionState {
  action: PrimaryAction | null
  setAction: (action: PrimaryAction | null) => void
}

export const PrimaryActionContext =
  createContext<PrimaryActionState | null>(null)

export function usePrimaryAction(): PrimaryActionState {
  const ctx = useContext(PrimaryActionContext)
  if (!ctx) {
    throw new Error('usePrimaryAction must be used inside AdminLayout')
  }
  return ctx
}
