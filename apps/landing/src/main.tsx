import { ViteReactSSG } from 'vite-react-ssg'
import { routes } from './routes'
import './globals.css'

// vite-react-ssg entry: prerenders every route in `includedRoutes`
// (see vite.config.ts) to static HTML at build time, hydrates on the client.
export const createRoot = ViteReactSSG({ routes })
