import { useEffect, useRef, type ReactNode } from 'react'
import { AuthCardDeck } from '@/components/auth-card-deck'

/**
 * Shared shell for the two auth surfaces (sign-in and first-run setup): the
 * form sits in a left column with an interactive preview deck on the right at
 * `lg`. Extracted so the two pages can't drift apart, and so the first thing a
 * self-hoster sees looks like the product rather than a form.
 *
 * Only the dither field is decorative (`aria-hidden`); the deck is a real,
 * keyboard-reachable control, so the panel itself is not hidden from AT.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-app lg:h-app lg:grid-cols-2 lg:overflow-hidden">
      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto p-6 md:p-10">
        <div className="flex items-center gap-2 self-start font-medium">
          <img src="/logomark.png" alt="" className="size-6 rounded-md" />
          <span className="text-sm font-semibold tracking-tight">PingBoard</span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <BrandPanel />
    </div>
  )
}

/**
 * Ordered (Bayer) dither field. A smooth plasma is thresholded per cell against
 * a 4x4 Bayer matrix, so every pixel is the same size and only its on/off state
 * carries the gradient — which is what makes a dither read as a dither rather
 * than a dot-screen. Drawn once to a canvas (no per-cell DOM), then redrawn on
 * resize and theme flip. Tinted from `primary-text`, so both themes stay legible.
 */
const BAYER_4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
]

const CELL = 8
const SQUARE = 5
const FRAME_MS = 1000 / 24

/**
 * Plasma: dust at the form edge, solid bleeding off the outer edge. `t` (in
 * seconds) drifts the wobble so the dithered boundary breathes, while the
 * density ramp itself never moves — the field stays the same shape.
 */
function fieldAt(x: number, y: number, t: number): number {
  const v =
    -0.12 +
    1.3 * x +
    0.16 * Math.sin(y * 7.5 + t * 0.5) +
    0.1 * Math.sin(y * 15 - x * 5 + t * 0.8) +
    0.07 * Math.cos(x * 11 + y * 3 + t * 0.6)
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function DitherField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    let cols = 0
    let rows = 0
    let dpr = 1
    let raf = 0
    let last = 0

    const measure = () => {
      const { width, height } = host.getBoundingClientRect()
      if (width < 1 || height < 1) return false
      cols = Math.ceil(width / CELL)
      rows = Math.ceil(height / CELL)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = cols * CELL * dpr
      canvas.height = rows * CELL * dpr
      canvas.style.width = `${cols * CELL}px`
      canvas.style.height = `${rows * CELL}px`
      return true
    }

    const paint = (seconds: number) => {
      const ctx = canvas.getContext('2d')
      if (!ctx || cols < 1 || rows < 1) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cols * CELL, rows * CELL)
      ctx.fillStyle = getComputedStyle(host).color
      // One path, one fill — thousands of fillRect calls per frame don't hold
      // the target frame rate on a large panel.
      ctx.beginPath()
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const field = fieldAt(col / cols, row / rows, seconds)
          const threshold = ((BAYER_4[(row % 4) * 4 + (col % 4)] ?? 0) + 0.5) / 16
          if (field > threshold) ctx.rect(col * CELL, row * CELL, SQUARE, SQUARE)
        }
      }
      ctx.fill()
    }

    const prefersReduced = () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (now - last < FRAME_MS) return
      last = now
      paint(now / 1000)
    }

    // Re-measure and (re)start: called on mount, on resize, and when the
    // reduced-motion preference flips.
    const sync = () => {
      cancelAnimationFrame(raf)
      if (!measure()) return
      if (prefersReduced()) paint(0)
      else raf = requestAnimationFrame(frame)
    }

    sync()

    const resize = new ResizeObserver(sync)
    resize.observe(host)
    // `.dark` toggles on <html>; re-resolve the token colour when it flips.
    const theme = new MutationObserver(() => {
      paint(prefersReduced() ? 0 : performance.now() / 1000)
    })
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    })
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    motion.addEventListener('change', sync)

    return () => {
      cancelAnimationFrame(raf)
      resize.disconnect()
      theme.disconnect()
      motion.removeEventListener('change', sync)
    }
  }, [])

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 text-primary-text opacity-30"
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden border-l bg-muted/30 lg:block">
      <DitherField />

      <div className="relative flex h-full flex-col items-center justify-center gap-8 p-10">
        <AuthCardDeck />

        <p className="max-w-xs text-center text-xs/relaxed text-balance text-foreground">
          Self-hosted uptime monitoring with built-in status pages. One
          container, one volume, one port.
        </p>
      </div>
    </div>
  )
}
