import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ALLOWED_RETENTION_DAYS } from '@pingboard/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useConfirm } from '@/components/confirm-provider'
import { Panel } from '@/components/panel'
import { QueryError } from '@/components/QueryError'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth'
import { useNow } from '@/hooks/use-now'
import { formatDateTime, formatDuration, formatRelative } from '@/lib/utils'

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
    <div className="px-4 lg:px-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-6">
        <p className="text-muted-foreground">Instance-wide preferences.</p>
        <AccountCard email={user?.email ?? ''} />
        <RetentionCard />
        <ApiTokensCard />
        <SmtpCard />
      </div>
      <aside className="flex min-w-0 flex-col gap-4">
        <InstanceCard />
      </aside>
    </div>
  )
}

interface InstanceInfo {
  version: string
  mode: 'selfhost' | 'cloud'
  dataDir: string
  dbBytes: number | null
  startedAt: string
  heartbeats: number
  oldestHeartbeat: string | null
  monitors: number
  channels: number
  statusPages: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

/**
 * "How big is this getting?" is the question a self-hoster has next to the
 * retention setting, and nothing else in the UI answers it.
 */
function InstanceCard() {
  const query = useQuery({
    queryKey: ['instance'],
    queryFn: () => api.get<InstanceInfo>('/api/admin/instance'),
    staleTime: 30_000,
  })
  useNow()
  const info = query.data

  const rows: [string, string][] = info
    ? [
        ['Version', info.version],
        ['Edition', info.mode === 'selfhost' ? 'Self-hosted · unlimited' : 'Cloud'],
        ['Data dir', info.dataDir],
        ['Database', info.dbBytes == null ? '—' : formatBytes(info.dbBytes)],
        ['Heartbeats', info.heartbeats.toLocaleString()],
        [
          'History from',
          info.oldestHeartbeat ? formatDateTime(info.oldestHeartbeat) : '—',
        ],
        ['Monitors', String(info.monitors)],
        ['Channels', String(info.channels)],
        ['Status pages', String(info.statusPages)],
        ['Uptime', formatDuration(Date.now() - new Date(info.startedAt).getTime())],
      ]
    : []

  return (
    <Panel>
      <header className="border-b border-border/60 px-4 py-2.5">
        <h2 className="text-sm font-medium">Instance</h2>
      </header>
      {query.isError ? (
        <p className="px-4 py-5 text-xs text-muted-foreground">
          Couldn't load instance details.
        </p>
      ) : !info ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : (
        <dl className="divide-y divide-border/60">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-3 px-4 py-2"
            >
              <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {label}
              </dt>
              <dd className="truncate text-xs tabular-nums" title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
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
    <Panel>
      <header className="space-y-0.5 border-b border-border/60 px-4 py-2.5">
        <h2 className="text-sm font-medium">Account</h2>
        <p className="text-xs text-muted-foreground">
          You're signed in as the admin.
        </p>
      </header>
      <div className="px-4 py-4">
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
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {success && (
            <p className="text-sm text-success-text">Password updated.</p>
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
      </div>
    </Panel>
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
    <Panel>
      <header className="space-y-0.5 border-b border-border/60 px-4 py-2.5">
        <h2 className="text-sm font-medium">Retention</h2>
        <p className="text-xs text-muted-foreground">
          Heartbeats older than this are aggregated into daily stats; raw rows
          are deleted. Aggregated history is kept forever.
        </p>
      </header>
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Label htmlFor="retention-days" className="shrink-0">
            Keep raw heartbeats for
          </Label>
          <Select
            value={days != null ? String(days) : undefined}
            onValueChange={(v) => void change(Number(v))}
            disabled={query.isLoading || query.isError || update.isPending}
          >
            <SelectTrigger id="retention-days" className="w-[180px]">
              <SelectValue placeholder={query.isError ? 'Unavailable' : 'Loading…'} />
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
        {query.isError && (
          <p className="mt-3 text-xs text-muted-foreground">
            Couldn't load the current retention.{' '}
            <button
              type="button"
              onClick={() => query.refetch()}
              className="text-foreground underline underline-offset-4"
            >
              Try again
            </button>
          </p>
        )}
      </div>
    </Panel>
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

  if (query.isError) {
    return (
      <Panel>
        <header className="border-b border-border/60 px-4 py-2.5">
          <h2 className="text-sm font-medium">Email defaults (SMTP)</h2>
        </header>
        <div className="px-4 py-4">
          <QueryError subject="SMTP settings" onRetry={() => query.refetch()} />
        </div>
      </Panel>
    )
  }

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
    <Panel>
      <header className="space-y-0.5 border-b border-border/60 px-4 py-2.5">
        <h2 className="text-sm font-medium">Email defaults (SMTP)</h2>
        <p className="text-xs text-muted-foreground">
          Used when an email channel doesn't specify its own SMTP credentials.
          Leaving a field blank clears it.
        </p>
      </header>
      <div className="px-4 py-4">
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
            <Checkbox
              checked={form.secure}
              onCheckedChange={(checked) => set('secure')(checked === true)}
            />
            Use TLS (auto-enabled for port 465)
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {success && (
            <p className="text-sm text-success-text">SMTP defaults saved.</p>
          )}
          <div>
            <Button type="submit" disabled={!touched || update.isPending}>
              {update.isPending ? 'Saving…' : 'Save defaults'}
            </Button>
          </div>
        </form>
      </div>
    </Panel>
  )
}

// ─────────────────────────── API tokens ───────────────────────────

interface ApiToken {
  id: string
  name: string
  prefix: string
  lastUsedAt: string | null
  createdAt: string
}

function ApiTokensCard() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Held only until the user dismisses it — the server can't show it again.
  const [freshSecret, setFreshSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  useNow()

  const query = useQuery({
    queryKey: ['api-tokens'],
    queryFn: () => api.get<{ tokens: ApiToken[] }>('/api/admin/tokens'),
  })

  const create = useMutation({
    mutationFn: (tokenName: string) =>
      api.post<{ token: ApiToken; secret: string }>('/api/admin/tokens', {
        name: tokenName,
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['api-tokens'] })
      setFreshSecret(data.secret)
      setCopied(false)
      setName('')
      setError(null)
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : 'Failed to create token'),
  })

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/tokens/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['api-tokens'] })
      toast.success('Token revoked')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to revoke'),
  })

  const tokens = query.data?.tokens ?? []

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Give the token a name so you can recognise it later')
    create.mutate(name.trim())
  }

  return (
    <Panel>
      <header className="space-y-0.5 border-b border-border/60 px-4 py-2.5">
        <h2 className="text-sm font-medium">API tokens</h2>
        <p className="text-xs text-muted-foreground">
          Authenticate scripts and integrations with{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-foreground">
            Authorization: Bearer &lt;token&gt;
          </code>
          . A token has the same access as this admin account.
        </p>
      </header>
      <div className="space-y-4 px-4 py-4">
        {freshSecret && (
          <div className="space-y-2 border border-success/40 bg-success/5 p-3" role="status">
            <p className="text-xs font-medium text-success-text">
              Copy this now — it can't be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 font-mono text-xs">
                {freshSecret}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(freshSecret)
                    .then(() => setCopied(true))
                    .catch(() => toast.error('Copy failed — select the token manually'))
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setFreshSecret(null)}
              >
                Done
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="token-name">New token name</Label>
            <Input
              id="token-name"
              value={name}
              placeholder="deploy bot, uptime script…"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'token-error' : undefined}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
            />
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create token'}
          </Button>
        </form>
        <p id="token-error" role="alert" className="min-h-4 text-xs text-destructive">
          {error}
        </p>

        {query.isError ? (
          <p className="text-xs text-destructive">
            Couldn't load tokens.{' '}
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="underline underline-offset-4"
            >
              Retry
            </button>
          </p>
        ) : tokens.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No tokens yet. The API is reachable from the browser session only.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 border-t border-border/60">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {t.prefix}… · {t.lastUsedAt
                      ? `last used ${formatRelative(t.lastUsedAt)}`
                      : 'never used'}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={revoke.isPending}
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Revoke "${t.name}"?`,
                      description:
                        'Anything using this token stops working immediately. This cannot be undone.',
                      confirmLabel: 'Revoke token',
                      destructive: true,
                    })
                    if (ok) revoke.mutate(t.id)
                  }}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
