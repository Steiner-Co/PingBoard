import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError } from '@/lib/api'
import type { User } from '@/types'

interface AuthState {
  loading: boolean
  user: User | null
  setupComplete: boolean | null
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  setup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      const status = await api.get<{ setupComplete: boolean }>(
        '/api/auth/setup-status',
      )
      setSetupComplete(status.setupComplete)
      if (status.setupComplete) {
        try {
          const data = await api.get<{ user: User }>('/api/admin/me')
          setUser(data.user)
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) setUser(null)
          else throw err
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const login = async (email: string, password: string) => {
    await api.post('/api/auth/login', { email, password })
    await refresh()
  }
  const setup = async (email: string, password: string) => {
    await api.post('/api/auth/setup', { email, password })
    await refresh()
  }
  const logout = async () => {
    await api.post('/api/auth/logout')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ loading, user, setupComplete, refresh, login, setup, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
