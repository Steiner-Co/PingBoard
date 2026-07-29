import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { MotionConfig } from 'motion/react'

/** Scroll to top on route change (client-side only; no-op during prerender). */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** Root route element: providers wrap every page, landing included. */
export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <ScrollToTop />
        <Outlet />
      </ThemeProvider>
    </MotionConfig>
  )
}
