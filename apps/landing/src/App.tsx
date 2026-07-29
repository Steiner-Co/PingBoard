import { useEffect, useRef } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'

/**
 * Route transition: a true crossfade. The outgoing page is popped out of
 * layout (`popLayout`) and fades over the incoming one, so there's no hard
 * cut and no `mode="wait"` latency. Exit is faster than enter (asymmetric
 * timing — snappy where the system responds, softer where the new content
 * settles). Opacity-only: movement during a crossfade reads as wobble,
 * especially while the two pages have different card widths.
 *
 * `initial={false}` skips the enter animation on first render — the
 * prerendered HTML already paints complete, animating it would flash.
 * Reduced motion: the transition is opacity-only, so it plays (gently)
 * for everyone.
 */

/** Scroll target after a cross-route navigation: the hash element if the
 *  URL has one (e.g. /#features), otherwise the top. Runs on exit complete
 *  so the outgoing page never visibly jumps mid-fade. */
function scrollToLocationTarget() {
  const hash = window.location.hash
  if (hash) {
    document.getElementById(hash.slice(1))?.scrollIntoView()
  } else {
    window.scrollTo(0, 0)
  }
}

/** Same-page hash changes (e.g. clicking "Product" while already on `/`)
 *  don't re-key the route, so `onExitComplete` never fires — scroll here. */
function SamePageHashScroll() {
  const location = useLocation()
  const prevPath = useRef(location.pathname)
  useEffect(() => {
    const samePage = prevPath.current === location.pathname
    prevPath.current = location.pathname
    if (samePage && location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView()
    }
  }, [location])
  return null
}

function PageTransition() {
  const { pathname } = useLocation()
  // useOutlet() (not <Outlet/>) so AnimatePresence can keep the outgoing
  // page's element alive while it exits.
  const outlet = useOutlet()

  return (
    <>
      <SamePageHashScroll />
      <AnimatePresence
        mode="popLayout"
        initial={false}
        onExitComplete={scrollToLocationTarget}
      >
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] } }}
          exit={{ opacity: 0, transition: { duration: 0.15, ease: 'easeOut' } }}
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

/** Root route element: providers wrap every page, landing included. */
export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <PageTransition />
      </ThemeProvider>
    </MotionConfig>
  )
}
