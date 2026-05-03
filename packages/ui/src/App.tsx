import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/auth'
import { AdminLayout } from '@/layouts/AdminLayout'
import { ChannelsPage } from '@/pages/ChannelsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { IncidentsPage } from '@/pages/IncidentsPage'
import { LoginPage } from '@/pages/LoginPage'
import { MonitorDetailPage } from '@/pages/MonitorDetailPage'
import { MonitorEditPage } from '@/pages/MonitorEditPage'
import { MonitorWizardPage } from '@/pages/MonitorWizardPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SetupPage } from '@/pages/SetupPage'
import { StatusPagesPage } from '@/pages/StatusPagesPage'
import { queryClient } from '@/lib/query-client'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function Router() {
  const { loading, user, setupComplete } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  // Setup flow takes precedence
  if (setupComplete === false) {
    if (location.pathname !== '/setup') return <Navigate to="/setup" replace />
    return (
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/admin" replace /> : <LoginPage />} />
      <Route path="/setup" element={<Navigate to="/admin" replace />} />
      <Route
        path="/admin"
        element={user ? <AdminLayout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<DashboardPage />} />
        <Route path="monitors/new" element={<MonitorWizardPage />} />
        <Route path="monitors/:id" element={<MonitorDetailPage />} />
        <Route path="monitors/:id/edit" element={<MonitorEditPage />} />
        <Route path="channels" element={<ChannelsPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="pages" element={<StatusPagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/" element={<Navigate to={user ? '/admin' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? '/admin' : '/login'} replace />} />
    </Routes>
  )
}
