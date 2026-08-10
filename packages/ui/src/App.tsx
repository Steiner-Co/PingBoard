import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/auth'
import { AdminLayout } from '@/layouts/AdminLayout'
import { ChannelsPage } from '@/pages/ChannelsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DomainsPage } from '@/pages/DomainsPage'
import { IncidentsPage } from '@/pages/IncidentsPage'
import { LoginPage } from '@/pages/LoginPage'
import { MaintenancePage } from '@/pages/MaintenancePage'
import { MonitorDetailPage } from '@/pages/MonitorDetailPage'
import { MonitorEditPage } from '@/pages/MonitorEditPage'
import { MonitorWizardPage } from '@/pages/MonitorWizardPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SetupPage } from '@/pages/SetupPage'
import { StatusPageEditorPage } from '@/pages/StatusPageEditorPage'
import { StatusPagesPage } from '@/pages/StatusPagesPage'
import { queryClient } from '@/lib/query-client'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}

// The auth bootstrap takes ~50–200ms. A spinner-shaped placeholder reads
// less like a broken deploy than a flash of the wrong page.
function BootSplash() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <img src="/logomark.png" alt="" className="size-6 rounded-md motion-safe:animate-pulse" />
        <span className="text-sm">PingBoard</span>
      </div>
    </div>
  )
}

function LoginRoute() {
  const { loading, user, setupComplete } = useAuth()
  if (loading) return <BootSplash />
  if (setupComplete === false) return <Navigate to="/setup" replace />
  return user ? <Navigate to="/admin" replace /> : <LoginPage />
}

function SetupRoute() {
  const { loading, setupComplete } = useAuth()
  if (loading) return <BootSplash />
  // Setup flow takes precedence over everything until it has completed.
  return setupComplete === false ? <SetupPage /> : <Navigate to="/admin" replace />
}

function AdminRoute() {
  const { loading, user, setupComplete } = useAuth()
  if (loading) return <BootSplash />
  if (setupComplete === false) return <Navigate to="/setup" replace />
  return user ? <AdminLayout /> : <Navigate to="/login" replace />
}

function IndexRedirect() {
  const { loading, user, setupComplete } = useAuth()
  if (loading) return <BootSplash />
  if (setupComplete === false) return <Navigate to="/setup" replace />
  return <Navigate to={user ? '/admin' : '/login'} replace />
}

// A data router (not <BrowserRouter>) so useBlocker works — the dirty-form
// guards (contexts/unsaved-changes.tsx) rely on it to catch browser
// Back/Forward, which a plain router lets sail through.
const router = createBrowserRouter([
  { path: '/login', element: <LoginRoute /> },
  { path: '/setup', element: <SetupRoute /> },
  {
    path: '/admin',
    element: <AdminRoute />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'domains', element: <DomainsPage /> },
      { path: 'monitors/new', element: <MonitorWizardPage /> },
      { path: 'monitors/:id', element: <MonitorDetailPage /> },
      { path: 'monitors/:id/edit', element: <MonitorEditPage /> },
      { path: 'channels', element: <ChannelsPage /> },
      { path: 'incidents', element: <IncidentsPage /> },
      { path: 'maintenance', element: <MaintenancePage /> },
      { path: 'pages', element: <StatusPagesPage /> },
      { path: 'pages/:id/edit', element: <StatusPageEditorPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '/', element: <IndexRedirect /> },
  { path: '*', element: <IndexRedirect /> },
])
