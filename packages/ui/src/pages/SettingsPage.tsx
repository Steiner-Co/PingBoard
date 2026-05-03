import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ALLOWED_RETENTION_DAYS } from '@pingboard/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth'

interface SmtpView {
  host: string | null
  port: number | null
  user: string | null
  from: string | null
  secure: boolean | null
  passwordSet: boolean
}

interface SettingsResponse {
  retentionDays: number
  smtp: SmtpView
}

const PASSWORD_SENTINEL = '__set__'

export function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="px-4 lg:px-6 flex flex-col gap-6 max-w-3xl">
      <p className="text-muted-foreground">Instance-wide preferences.</p>
      <AccountCard email={user?.email ?? ''} />
      <RetentionCard />
      <SmtpCard />
    </div>
  )
}

// ─────────────────────────── Account ───────────────────────────

function AccountCard({ email }: { email: string }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const change = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      api.post('/api/admin/account/password', payload),
    onSuccess: () => {
      setCurrent('')
      setNext('')
      setConfirm('')
      setSuccess(true)
      setError(null)
    },
    onError: (err) => {
      setSuccess(false)
      setError(err instanceof Error ? err.message : 'Failed')
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (next.length < 8) return setError('Password must be at least 8 characters')
    if (next !== confirm) return setError('New passwords do not match')
    change.mutate({ currentPassword: current, newPassword: next })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>You're signed in as the admin.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm mb-6">
          <span className="text-muted-foreground">Email:</span>{' '}
          <span className="font-mono">{email}</span>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && (
            <p className="text-sm text-success">Password updated.</p>
          )}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={change.isPending || !current || !next || !confirm}
            >
              {change.isPending ? 'Updating…' : 'Change password'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Forgot it? Run{' '}
              <code className="px-1 py-0.5 bg-muted rounded text-foreground">
                docker exec pingboard pingboard reset-password {email}
              </code>{' '}
              from the host.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────── Retention ───────────────────────────

function RetentionCard() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<SettingsResponse>('/api/admin/settings'),
  })

  const update = useMutation({
    mutationFn: (retentionDays: number) =>
      api.put<SettingsResponse>('/api/admin/settings', { retentionDays }),
    onSuccess: (data) => queryClient.setQueryData(['settings'], data),
  })

  const days = query.data?.retentionDays
  return (
    <Card>
      <CardHeader>
        <CardTitle>Retention</CardTitle>
        <CardDescription>
          Heartbeats older than this are aggregated into daily stats; raw rows
          are deleted. Aggregated history is kept forever.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Label htmlFor="retention-days" className="shrink-0">
            Keep raw heartbeats for
          </Label>
          <Select
            value={days != null ? String(days) : undefined}
            onValueChange={(v) => update.mutate(Number(v))}
            disabled={query.isLoading || update.isPending}
          >
            <SelectTrigger id="retention-days" className="w-[180px]">
              <SelectValue placeholder="Loading…" />
            </SelectTrigger>
            <SelectContent>
              {ALLOWED_RETENTION_DAYS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {update.isPending && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────── SMTP defaults ───────────────────────────

function SmtpCard() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<SettingsResponse>('/api/admin/settings'),
  })

  const [form, setForm] = useState({
    host: '',
    port: '',
    user: '',
    pass: '',
    from: '',
    secure: false,
  })
  const [touched, setTouched] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hydrate form from server values on first load.
  useEffect(() => {
    if (!query.data) return
    setForm({
      host: query.data.smtp.host ?? '',
      port: query.data.smtp.port != null ? String(query.data.smtp.port) : '',
      user: query.data.smtp.user ?? '',
      // Never receive the password from server; show placeholder if set.
      pass: query.data.smtp.passwordSet ? PASSWORD_SENTINEL : '',
      from: query.data.smtp.from ?? '',
      secure: query.data.smtp.secure ?? false,
    })
    setTouched(false)
  }, [query.data])

  const update = useMutation({
    mutationFn: (smtp: Record<string, unknown>) =>
      api.put<SettingsResponse>('/api/admin/settings', { smtp }),
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data)
      setSuccess(true)
      setError(null)
      setTouched(false)
    },
    onError: (err) => {
      setSuccess(false)
      setError(err instanceof Error ? err.message : 'Failed')
    },
  })

  const set = <K extends keyof typeof form>(key: K) =>
    (value: (typeof form)[K]) => {
      setForm((f) => ({ ...f, [key]: value }))
      setTouched(true)
      setSuccess(false)
    }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    update.mutate({
      host: form.host,
      port: form.port ? Number(form.port) : null,
      user: form.user,
      // Empty string clears; sentinel means "leave as-is".
      pass: form.pass === PASSWORD_SENTINEL ? PASSWORD_SENTINEL : form.pass,
      from: form.from,
      secure: form.secure,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email defaults (SMTP)</CardTitle>
        <CardDescription>
          Used when an email channel doesn't specify its own SMTP credentials.
          Leaving a field blank clears it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">Host</Label>
              <Input
                id="smtp-host"
                value={form.host}
                onChange={(e) => set('host')(e.target.value)}
                placeholder="smtp.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                type="number"
                value={form.port}
                onChange={(e) => set('port')(e.target.value)}
                placeholder="587"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-user">Username</Label>
              <Input
                id="smtp-user"
                value={form.user}
                onChange={(e) => set('user')(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-pass">Password</Label>
              <Input
                id="smtp-pass"
                type="password"
                value={form.pass === PASSWORD_SENTINEL ? '••••••••' : form.pass}
                onChange={(e) => set('pass')(e.target.value)}
                onFocus={() => {
                  if (form.pass === PASSWORD_SENTINEL) set('pass')('')
                }}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="smtp-from">From address</Label>
              <Input
                id="smtp-from"
                value={form.from}
                onChange={(e) => set('from')(e.target.value)}
                placeholder="alerts@your.org"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.secure}
              onChange={(e) => set('secure')(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Use TLS (auto-enabled for port 465)
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && (
            <p className="text-sm text-success">SMTP defaults saved.</p>
          )}
          <div>
            <Button type="submit" disabled={!touched || update.isPending}>
              {update.isPending ? 'Saving…' : 'Save defaults'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
