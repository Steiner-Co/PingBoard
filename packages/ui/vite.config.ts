import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

// Mirror packages/shared/src/constants.ts — kept inline because vite.config
// is loaded by Node before workspace TS resolution.
const RESERVED_SLUGS = new Set(['admin', 'api', 'auth', 'login', 'setup', '_health', 'static', 'assets', 'favicon.ico'])

// Match the backend's path-aware shell selection (apps/pingboard/src/server.ts)
// so /<slug> serves public.html in dev too — otherwise React Router's catch-all
// in the admin SPA bounces to /admin.
function publicShellRouter(): Plugin {
  return {
    name: 'pingboard-public-shell-router',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        const slugMatch = url.match(/^\/([a-z0-9-]+)\/?$/)
        if (slugMatch?.[1] && !RESERVED_SLUGS.has(slugMatch[1])) {
          req.url = '/public.html'
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), publicShellRouter()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        admin: resolve(__dirname, 'index.html'),
        public: resolve(__dirname, 'public.html'),
      },
    },
  },
})
