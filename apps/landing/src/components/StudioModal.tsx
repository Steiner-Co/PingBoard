import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/**
 * Studio attribution modal — opened from the Steiner&Co footer logo.
 * Same overlay conventions as the docs search palette: dimmed blurred
 * backdrop, Escape/overlay/X to dismiss, initial focus on the close button.
 */
export function StudioModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop — fades in gently, blinks out fast */}
          <motion.div
            className="absolute inset-0 bg-background/60 backdrop-blur-2xl"
            onClick={onClose}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } }}
            exit={{ opacity: 0, transition: { duration: 0.12, ease: 'easeOut' } }}
          />

          {/* Panel — rises and settles in, drops away quicker */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="About Steiner and Company"
            className="relative flex min-h-[480px] w-full max-w-[400px] flex-col gap-6 rounded-[24px] border border-border bg-card p-6"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
            }}
            exit={{
              opacity: 0,
              y: 8,
              scale: 0.98,
              transition: { duration: 0.15, ease: 'easeOut' },
            }}
          >
            <div className="flex items-center justify-between">
              <img
                src="/steiner-co-fulllogo.svg"
                alt="Steiner&Co."
                className="brand-logo h-[26px] w-auto"
              />
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-full text-foreground outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-95"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden>
                  <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <p className="text-[19px] font-medium leading-[1.35] tracking-[-0.4px] text-balance text-foreground">
                <span className="font-bold text-[#4d7c0f] dark:text-[#bef264]">PingBoard</span> is crafted
                by Steiner&Co, a solo-run product studio building tools that help make our day to day
                life more fun.
              </p>
              <p className="text-[13px] text-muted-foreground">
                Steiner&Co by, <span className="font-semibold text-foreground">arunava</span>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
