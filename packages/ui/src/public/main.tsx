import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { PublicStatusPage } from './PublicStatusPage'
import { queryClient } from '@/lib/query-client'
import '../globals.css'

const slug = window.location.pathname.replace(/^\//, '').split('/')[0] ?? ''

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <PublicStatusPage slug={slug} />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
