import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import CheckCircle from '@solar-icons/react/csr/ui/CheckCircle'
import ArrowLeft from '@solar-icons/react/csr/arrows/ArrowLeft'
import ArrowRight from '@solar-icons/react/csr/arrows/ArrowRight'
import CloseSquare from '@solar-icons/react/csr/ui/CloseSquare'
import TestTube from '@solar-icons/react/csr/medicine/TestTube'
import DangerCircle from '@solar-icons/react/csr/ui/DangerCircle'
import { ALLOWED_INTERVALS_SECONDS } from '@pingboard/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QueryError } from '@/components/QueryError'
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
import { useUnsavedGuard } from '@/contexts/unsaved-changes'
import { api } from '@/lib/api'
import { cn, formatIntervalLabel } from '@/lib/utils'
import type { MonitorType, NotificationChannel } from '@/types'

const STEPS = ['Target', 'Schedule', 'Notify'] as const
const STEP_TITLES = ['What to check?', 'How often?', 'Where to alert?'] as const
const DEFAULT_INTERVAL_SECONDS = 60

interface TestResult {
  status: 'up' | 'down' | 'degraded'
  responseTimeMs: number | null
  statusCode: number | null
  message: string | null
}

export function MonitorWizardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [step, setStep] = useState(0)
  const [target, setTarget] = useState('')
  const [typeOverride, setTypeOverride] = useState<MonitorType | 'auto'>('auto')
  const [name, setName] = useState('')
  const [intervalSeconds, setIntervalSeconds] = useState(DEFAULT_INTERVAL_SECONDS)
  const [tags, setTags] = useState<string[]>([])
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  // Which field blocked the last Continue/Create attempt, so the message can
  // sit next to the input instead of at the bottom of the card.
  const [invalid, setInvalid] = useState<{ field: 'target' | 'name'; message: string } | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const autoDetected = useMemo(() => detectType(target), [target])
  const effectiveType: MonitorType | null =
    typeOverride === 'auto' ? autoDetected.type : typeOverride

  const effectiveTarget =
    typeOverride === 'auto' ? autoDetected.target : target.trim()
  const effectiveConfig =
    typeOverride === 'auto' ? autoDetected.config : configForType(typeOverride, target.trim())

  const channelsQuery = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<{ channels: NotificationChannel[] }>('/api/admin/channels'),
  })

  // Run-once test against the configured target. Doesn't touch the database.
  // Push monitors don't support this since they wait for the world to call us.
  const testMutation = useMutation({
    mutationFn: () =>
      api.post<{ result: TestResult }>('/api/admin/monitors/run', {
        name: name.trim() || defaultName(effectiveTarget) || 'Test',
        type: effectiveType,
        target: effectiveTarget,
        timeoutSeconds: 10,
        config: effectiveConfig,
      }),
    onSuccess: (res) => setTestResult(res.result),
    onError: (err) => {
      setTestResult(null)
      toast.error(err instanceof Error ? err.message : 'Test failed')
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: object) =>
      api.post<{ monitor: { id: string; type: MonitorType } }>(
        '/api/admin/monitors',
        payload,
      ),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
      toast.success(
        res.monitor.type === 'push'
          ? 'Monitor created — copy your push URL below'
          : 'Monitor created — first check will run within a few seconds',
      )
      // Push monitors need their generated URL shown to the user immediately.
      if (res.monitor.type === 'push') {
        navigate(`/admin/monitors/${res.monitor.id}`)
      } else {
        navigate('/admin')
      }
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create'),
  })

  // Anything the user typed or picked is worth confirming before we throw it
  // away — the wizard has no draft persistence.
  const isDirty =
    !createMutation.isSuccess &&
    Boolean(
      target.trim() ||
        name.trim() ||
        tags.length > 0 ||
        selectedChannels.length > 0 ||
        typeOverride !== 'auto' ||
        intervalSeconds !== DEFAULT_INTERVAL_SECONDS,
    )

  const confirmDiscard = useCallback(
    () =>
      confirm({
        title: 'Discard this monitor?',
        description:
          "You haven't created this monitor yet. Leaving now will lose what you've filled in.",
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        destructive: true,
      }),
    [confirm],
  )

  // Mirrors MonitorEditPage: the guard claims the shell's nav links while
  // dirty, `beforeunload` covers tab close and reload.
  useUnsavedGuard(isDirty, confirmDiscard)
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Steps 0 and 1 autofocus their first input, which pulls focus into the new
  // step on its own. Step 2 has no such control, so send focus to the heading
  // instead of leaving it parked on Continue.
  useEffect(() => {
    if (step === 2) headingRef.current?.focus()
  }, [step])

  // Returns the blocking field for the current step, or null when it's clear.
  const validateStep = (): { field: 'target' | 'name'; message: string } | null => {
    if (step === 0) {
      if (!target.trim()) return { field: 'target', message: 'Enter a URL or host to continue.' }
      if (!effectiveType) {
        return {
          field: 'target',
          message: "That doesn't look like a URL, host, or host:port — pick a type below.",
        }
      }
    }
    if (step === 1 && !name.trim()) {
      return { field: 'name', message: 'Give the monitor a display name.' }
    }
    return null
  }

  // Single submit path for every step: Enter in a field and the footer button
  // both land here, so Enter advances the wizard the way it reads.
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const blocking = validateStep()
    if (blocking) {
      setInvalid(blocking)
      // `Input` isn't forwardRef-wrapped, so a ref never reaches the DOM node —
      // focus through the id the Label already points at.
      document.getElementById(blocking.field)?.focus()
      return
    }
    setInvalid(null)
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      return
    }
    handleCreate()
  }

  const handleCreate = () => {
    if (!effectiveType) {
      setError('Pick a monitor type to continue')
      return
    }
    createMutation.mutate({
      name: name.trim(),
      type: effectiveType,
      target: effectiveTarget,
      intervalSeconds,
      timeoutSeconds: 10,
      retryCount: 1,
      config: effectiveConfig,
      tags,
      channelIds: selectedChannels,
    })
  }

  // Any in-app nav away from the wizard goes through here so a half-filled
  // form can't vanish on a stray click.
  const guardedNavigate = async (to: string) => {
    if (isDirty && !(await confirmDiscard())) return
    navigate(to)
  }

  return (
    <form onSubmit={handleFormSubmit} className="px-4 lg:px-6 max-w-3xl mx-auto w-full flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Add monitor</h1>
        <p className="text-muted-foreground text-sm mt-1">
          A few quick steps and you're tracking uptime.
        </p>
      </header>

      <Stepper current={step} />

      {/* Focus moves into the step's first input, which says nothing about the
          step itself — this carries the position and title to screen readers. */}
      <div aria-live="polite" className="sr-only">
        Step {step + 1} of {STEPS.length}: {STEP_TITLES[step]}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2 ref={headingRef} tabIndex={-1} className="outline-none">
              {STEP_TITLES[step]}
            </h2>
          </CardTitle>
          <CardDescription>
            {step === 0 && 'Paste a URL, host, or host:port. Type is auto-detected, or pick one.'}
            {step === 1 && 'Sensible defaults are pre-filled.'}
            {step === 2 && 'Optional — pick existing channels (or skip).'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="target">{targetLabel(effectiveType)}</Label>
                <Input
                  id="target"
                  placeholder={targetPlaceholder(effectiveType)}
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value)
                    setInvalid(null)
                  }}
                  aria-invalid={invalid?.field === 'target'}
                  aria-describedby={invalid?.field === 'target' ? 'target-error' : undefined}
                  autoFocus
                />
                {invalid?.field === 'target' && (
                  <p id="target-error" role="alert" className="text-xs text-destructive">
                    {invalid.message}
                  </p>
                )}
                {typeOverride === 'auto' && autoDetected.type && (
                  <p className="text-xs text-muted-foreground">
                    Detected: <span className="font-medium uppercase">{autoDetected.type}</span> check on{' '}
                    <span className="font-mono">{autoDetected.target}</span>
                  </p>
                )}
                {typeOverride === 'push' && (
                  <p className="text-xs text-muted-foreground">
                    For push monitors the target is just a label. PingBoard will
                    generate a unique URL for your job to ping.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type-override">Type</Label>
                <Select
                  value={typeOverride}
                  onValueChange={(v) => {
                    setTypeOverride(v as MonitorType | 'auto')
                    setTestResult(null)
                  }}
                >
                  <SelectTrigger id="type-override">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value="http">HTTP(S)</SelectItem>
                    <SelectItem value="tcp">TCP port</SelectItem>
                    <SelectItem value="ping">Ping (ICMP)</SelectItem>
                    <SelectItem value="dns">DNS lookup</SelectItem>
                    <SelectItem value="ssl">SSL certificate expiry</SelectItem>
                    <SelectItem value="domain">Domain (WHOIS) expiry</SelectItem>
                    <SelectItem value="push">Push / heartbeat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {effectiveType && effectiveType !== 'push' && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      Try a one-off check before saving so you know it works.
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => testMutation.mutate()}
                      disabled={!effectiveTarget || testMutation.isPending}
                    >
                      <Icon icon={TestTube} className="h-3 w-3" />
                      {testMutation.isPending ? 'Checking…' : 'Test now'}
                    </Button>
                  </div>
                  {testResult && <TestResultRow result={testResult} />}
                </div>
              )}
            </>
          )}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  placeholder={defaultName(effectiveTarget) ?? 'My monitor'}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setInvalid(null)
                  }}
                  aria-invalid={invalid?.field === 'name'}
                  aria-describedby={invalid?.field === 'name' ? 'name-error' : undefined}
                  autoFocus
                />
                {invalid?.field === 'name' && (
                  <p id="name-error" role="alert" className="text-xs text-destructive">
                    {invalid.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval">Check interval</Label>
                <Select
                  value={String(intervalSeconds)}
                  onValueChange={(v) => setIntervalSeconds(Number(v))}
                >
                  <SelectTrigger id="interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOWED_INTERVALS_SECONDS.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {formatIntervalLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags-input">Tags</Label>
                <TagInput value={tags} onChange={setTags} />
                <p className="text-xs text-muted-foreground">
                  Optional. Lowercase letters, digits, and hyphens. Press Enter or comma to add.
                </p>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              {channelsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading channels…</p>
              ) : channelsQuery.isError ? (
                <QueryError
                  subject="notification channels"
                  onRetry={() => void channelsQuery.refetch()}
                />
              ) : channelsQuery.data?.channels.length === 0 ? (
                <div className="rounded-md border border-dashed bg-muted/30 p-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No notification channels yet. The monitor will still run; you
                    just won't be paged when it goes down.
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/admin/channels" target="_blank" rel="noreferrer">
                      Add a channel
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {channelsQuery.data?.channels.map((c) => {
                    const checked = selectedChannels.includes(c.id)
                    return (
                      <label
                        key={c.id}
                        className={cn(
                          'flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors',
                          checked ? 'bg-accent border-primary' : 'hover:bg-accent/50',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedChannels((prev) =>
                              prev.includes(c.id)
                                ? prev.filter((id) => id !== c.id)
                                : [...prev, c.id],
                            )
                          }
                          className="h-4 w-4"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground uppercase">{c.type}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setInvalid(null)
            if (step === 0) void guardedNavigate('/admin')
            else setStep(step - 1)
          }}
          disabled={createMutation.isPending}
        >
          <Icon icon={ArrowLeft} className="h-4 w-4" />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {/* Stays enabled when fields are missing — clicking it names the
            blocking field instead of leaving the wizard looking stuck. */}
        <Button type="submit" disabled={createMutation.isPending}>
          {step < STEPS.length - 1 ? (
            <>
              Continue
              <Icon icon={ArrowRight} className="h-4 w-4" />
            </>
          ) : (
            <>
              {createMutation.isPending ? 'Creating…' : 'Create monitor'}
              <Icon icon={CheckCircle} className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((label, i) => (
        <li
          key={label}
          aria-current={i === current ? 'step' : undefined}
          className="flex items-center gap-2"
        >
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
              i < current && 'bg-primary text-primary-foreground',
              i === current && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
              i > current && 'bg-muted text-muted-foreground',
            )}
          >
            {i < current ? <Icon icon={CheckCircle} className="h-3 w-3" /> : i + 1}
          </span>
          <span className={cn(i === current ? 'font-medium' : 'text-muted-foreground')}>
            {label}
          </span>
          {i < STEPS.length - 1 && <span className="text-muted-foreground/50">›</span>}
        </li>
      ))}
    </ol>
  )
}

export function TagInput({
  value,
  onChange,
  id = 'tags-input',
}: {
  value: string[]
  onChange: (next: string[]) => void
  id?: string
}) {
  const [draft, setDraft] = useState('')
  // Rejections used to be silent returns, so Enter just looked broken. Stamped
  // with a timestamp so repeating the same bad tag re-triggers the timeout.
  const [rejected, setRejected] = useState<{ message: string; at: number } | null>(null)

  useEffect(() => {
    if (!rejected) return
    const timer = setTimeout(() => setRejected(null), 4000)
    return () => clearTimeout(timer)
  }, [rejected])

  const reject = (message: string) => setRejected({ message, at: Date.now() })

  const commit = (raw: string) => {
    const trimmed = raw.trim().toLowerCase()
    if (!trimmed) return
    if (!/^[a-z0-9][a-z0-9-]*$/.test(trimmed)) {
      reject('Lowercase letters, digits, and hyphens only — no spaces or symbols.')
      return
    }
    if (value.includes(trimmed)) {
      setDraft('')
      return
    }
    if (value.length >= 16) {
      reject('Up to 16 tags.')
      return
    }
    onChange([...value, trimmed])
    setDraft('')
    setRejected(null)
  }

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag))

  return (
    <>
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
          rejected && 'border-destructive ring-2 ring-destructive/20',
        )}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 font-mono text-xs">
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="opacity-60 hover:opacity-100"
              aria-label={`Remove ${tag}`}
            >
              <Icon icon={CloseSquare} className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setRejected(null)
          }}
          // Enter/comma commit a tag and must not reach the surrounding form —
          // in the wizard that would advance the step mid-typing.
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              commit(draft)
            } else if (e.key === 'Backspace' && !draft && value.length > 0) {
              remove(value[value.length - 1]!)
            }
          }}
          onBlur={() => commit(draft)}
          aria-invalid={rejected != null}
          aria-describedby={rejected ? `${id}-error` : undefined}
          placeholder={value.length === 0 ? 'api, prod, payments…' : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
        />
      </div>
      {rejected && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {rejected.message}
        </p>
      )}
    </>
  )
}

function TestResultRow({ result }: { result: TestResult }) {
  const ok = result.status === 'up'
  const icon = ok ? CheckCircle : DangerCircle
  const tone = ok ? 'text-success' : 'text-destructive'
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon icon={icon} className={`h-4 w-4 mt-0.5 ${tone}`} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="font-medium">
          {ok ? 'Check passed' : `Check ${result.status}`}
          {result.responseTimeMs != null && (
            <span className="ml-2 text-xs text-muted-foreground tabular-nums">
              {result.responseTimeMs} ms
              {result.statusCode != null && ` · HTTP ${result.statusCode}`}
            </span>
          )}
        </div>
        {result.message && (
          <div className="text-xs text-muted-foreground break-words">
            {result.message}
          </div>
        )}
      </div>
    </div>
  )
}

function detectType(input: string): {
  type: MonitorType | null
  target: string
  config: Record<string, unknown>
} {
  const trimmed = input.trim()
  if (!trimmed) return { type: null, target: '', config: {} }

  if (/^https?:\/\//i.test(trimmed)) {
    return { type: 'http', target: trimmed, config: {} }
  }

  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4.test(trimmed)) {
    return { type: 'ping', target: trimmed, config: {} }
  }

  const hostPort = trimmed.match(/^([^\s:]+):(\d+)$/)
  if (hostPort) {
    return {
      type: 'tcp',
      target: trimmed,
      config: { port: Number(hostPort[2]) },
    }
  }

  // Bare hostname → assume HTTP with https://
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(trimmed)) {
    return { type: 'http', target: `https://${trimmed}`, config: {} }
  }

  return { type: null, target: trimmed, config: {} }
}

function defaultName(target: string): string | null {
  if (!target) return null
  try {
    const url = new URL(target)
    return url.hostname
  } catch {
    return target.split(':')[0] ?? target
  }
}

function configForType(
  type: MonitorType,
  target: string,
): Record<string, unknown> {
  if (type === 'tcp') {
    const match = target.match(/:(\d+)$/)
    if (match) return { port: Number(match[1]) }
  }
  if (type === 'dns') return { recordType: 'A' }
  return {}
}

function targetLabel(type: MonitorType | null): string {
  switch (type) {
    case 'http':
      return 'URL'
    case 'tcp':
      return 'host:port'
    case 'ping':
      return 'IP or hostname'
    case 'dns':
      return 'Hostname'
    case 'ssl':
      return 'URL or hostname (port optional)'
    case 'domain':
      return 'Domain name'
    case 'push':
      return 'Label (e.g. nightly-backup)'
    default:
      return 'URL or host'
  }
}

function targetPlaceholder(type: MonitorType | null): string {
  switch (type) {
    case 'http':
      return 'https://example.com/health'
    case 'tcp':
      return 'db.example.com:5432'
    case 'ping':
      return '1.1.1.1'
    case 'dns':
      return 'example.com'
    case 'ssl':
      return 'https://example.com'
    case 'domain':
      return 'example.com'
    case 'push':
      return 'nightly-backup'
    default:
      return 'https://example.com or db.example.com:5432'
  }
}
