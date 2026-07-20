import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
import { useConfirm } from '@/components/confirm-provider'
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

// Sentinel the server understands as "no change to the persisted password".
// We never display it; the UI just hides the field and shows a "Change" button.
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
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data)
      toast.success(`Retention set to ${data.retentionDays} days`)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to update retention'),
  })

  const days = query.data?.retentionDays
  const confirm = useConfirm()

  // Lowering retention deletes raw heartbeats on the next sweep, so a
  // mis-click in a dropdown would silently destroy history. Growing the
  // window is safe and stays instant.
  const change = async (next: number) => {
    if (days != null && next < days) {
      const ok = await confirm({
        title: `Keep only ${next} days of raw heartbeats?`,
        description: `Raw heartbeats older than ${next} days will be aggregated into daily stats and then deleted. Daily uptime history is preserved, but per-check detail before that cutoff is gone for good.`,
        confirmLabel: 'Reduce retention',
        destructive: true,
      })
      if (!ok) return
    }
    update.mutate(next)
  }

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
            onValueChange={(v) => void change(Number(v))}
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
  // Tracks whether the password input is currently exposed. When SMTP already
  // has a saved password we hide the field by default to avoid an awkward
  // "•••••" placeholder; the user clicks "Change password" to reveal a fresh
  // empty input. We only send the password field when the input is exposed
  // and non-empty — otherwise we send the sentinel ("leave as-is").
  const [revealPassword, setRevealPassword] = useState(false)
  const confirm = useConfirm()
  const hadPassword = query.data?.smtp.passwordSet ?? false
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
      pass: '',
      from: query.data.smtp.from ?? '',
      secure: query.data.smtp.secure ?? false,
    })
    // If no password is set yet, expose the field by default.
    setRevealPassword(!query.data.smtp.passwordSet)
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

  const payloadWith = (pass: string) => ({
    host: form.host,
    port: form.port ? Number(form.port) : null,
    user: form.user,
    pass,
    from: form.from,
    secure: form.secure,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    // Password handling:
    //   1. Field hidden → leave the stored password untouched (sentinel).
    //   2. Field revealed but left empty while one is stored → also untouched.
    //      Saving an unrelated field must never wipe credentials as a side
    //      effect; removing is an explicit, confirmed action below.
    //   3. Field revealed with a value → update to it.
    const keepStored = !revealPassword || (hadPassword && form.pass === '')
    update.mutate(payloadWith(keepStored ? PASSWORD_SENTINEL : form.pass))
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
              {revealPassword ? (
                <div className="space-y-1.5">
                  <Input
                    id="smtp-pass"
                    type="password"
                    value={form.pass}
                    onChange={(e) => set('pass')(e.target.value)}
                    autoComplete="new-password"
                    autoFocus={query.data?.smtp.passwordSet}
                  />
                  {hadPassword && (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setRevealPassword(false)
                          setForm((f) => ({ ...f, pass: '' }))
                          setTouched(true)
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-3"
                      >
                        Cancel password change
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Remove the saved SMTP password?',
                            description:
                              'Email channels that fall back to these defaults will fail to authenticate until you set a new password.',
                            confirmLabel: 'Remove password',
                            destructive: true,
                          })
                          if (!ok) return
                          setForm((f) => ({ ...f, pass: '' }))
                          update.mutate(payloadWith(''))
                        }}
                        className="text-xs text-destructive underline underline-offset-3 hover:text-destructive/80"
                      >
                        Remove saved password
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    value="•••••••• (saved)"
                    readOnly
                    className="font-mono text-xs"
                    aria-label="Password is set"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRevealPassword(true)
                      setTouched(true)
                    }}
                  >
                    Change
                  </Button>
                </div>
              )}
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
