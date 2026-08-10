import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft"
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle"
import { ALLOWED_INTERVALS_SECONDS } from '@pingboard/shared'

import { Panel } from '@/components/panel'
import { QueryError } from '@/components/QueryError'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldInput, FieldTextarea } from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { cn, formatIntervalLabel } from '@/lib/utils'
import type { Heartbeat, Incident, Monitor, NotificationChannel } from '@/types'
import { TagInput } from '@/pages/MonitorWizardPage'
import { useConfirm } from '@/components/confirm-provider'
import { useUnsavedGuard } from '@/contexts/unsaved-changes'

interface DetailResponse {
  monitor: Monitor
  heartbeats: Heartbeat[]
  incidents: Incident[]
  channelIds: string[]
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const
const DNS_RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'] as const

export function MonitorEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const detail = useQuery({
    queryKey: ['monitor', id],
    queryFn: () => api.get<DetailResponse>(`/api/admin/monitors/${id}`),
    enabled: !!id,
  })

  const channelsQuery = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<{ channels: NotificationChannel[] }>('/api/admin/channels'),
  })

  // ─────────── Form state ───────────
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [intervalSeconds, setIntervalSeconds] = useState(60)
  const [timeoutSeconds, setTimeoutSeconds] = useState<number | ''>(10)
  const [retryCount, setRetryCount] = useState<number | ''>(1)
  const [tags, setTags] = useState<string[]>([])
  const [channelIds, setChannelIds] = useState<string[]>([])
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [headersText, setHeadersText] = useState('')
  const [headersError, setHeadersError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Hydrate from server response
  useEffect(() => {
    if (!detail.data) return
    const m = detail.data.monitor
    setName(m.name)
    setTarget(m.target)
    setIntervalSeconds(m.intervalSeconds)
    setTimeoutSeconds(m.timeoutSeconds)
    setRetryCount(m.retryCount)
    setTags(m.tags)
    setChannelIds(detail.data.channelIds)
    setConfig({ ...m.config })
    const headersJson =
      m.type === 'http'
        ? JSON.stringify(
            (m.config as { headers?: Record<string, string> }).headers ?? {},
            null,
            2,
          )
        : ''
    setHeadersText(headersJson)
    setError(null)
    setHeadersError(null)
    setBaseline({
      name: m.name,
      target: m.target,
      intervalSeconds: m.intervalSeconds,
      timeoutSeconds: m.timeoutSeconds,
      retryCount: m.retryCount,
      tags: m.tags.join(','),
      channels: [...detail.data.channelIds].sort().join(','),
      config: JSON.stringify(m.config),
      headersText: headersJson,
    })
  }, [detail.data])

  // Track baseline so we can detect "dirty" state on navigation. Comparing
  // serialised forms is good enough — these objects are small and rarely
  // change shape mid-edit.
  const [baseline, setBaseline] = useState<{
    name: string
    target: string
    intervalSeconds: number
    timeoutSeconds: number
    retryCount: number
    tags: string
    channels: string
    config: string
    headersText: string
  } | null>(null)

  // Flips true on a successful save so isDirty reads clean before the
  // effect below navigates — otherwise the unsaved guard would intercept
  // the post-save navigation and ask to discard what was just saved.
  const [saved, setSaved] = useState(false)

  const isDirty = useMemo(() => {
    if (!baseline || saved) return false
    return (
      baseline.name !== name ||
      baseline.target !== target ||
      baseline.intervalSeconds !== intervalSeconds ||
      baseline.timeoutSeconds !== timeoutSeconds ||
      baseline.retryCount !== retryCount ||
      baseline.tags !== tags.join(',') ||
      baseline.channels !== [...channelIds].sort().join(',') ||
      baseline.config !== JSON.stringify(config) ||
      baseline.headersText !== headersText
    )
  }, [
    baseline,
    saved,
    name,
    target,
    intervalSeconds,
    timeoutSeconds,
    retryCount,
    tags,
    channelIds,
    config,
    headersText,
  ])

  const confirmDiscard = useCallback(
    () =>
      confirm({
        title: 'Discard unsaved changes?',
        description:
          "You have edits that haven't been saved yet. Leaving now will lose them.",
        confirmLabel: 'Discard changes',
        cancelLabel: 'Keep editing',
        destructive: true,
      }),
    [confirm],
  )

  // Two guards, two escape routes: `useUnsavedGuard` intercepts every nav
  // away while dirty (sidebar links, navigate(), browser Back/Forward),
  // `beforeunload` covers tab close and reload.
  useUnsavedGuard(isDirty, confirmDiscard)
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Modern browsers ignore the message and show their own copy.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const save = useMutation({
    mutationFn: (payload: object) => api.patch(`/api/admin/monitors/${id}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['monitor', id] })
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
      toast.success('Monitor saved')
      setSaved(true)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed')
      setErrorField(null)
    },
  })

  // Navigate only after the saved state has rendered (isDirty now false), so
  // the unsaved guard lets this through without asking.
  useEffect(() => {
    if (saved) navigate(`/admin/monitors/${id}`)
  }, [saved, id, navigate])

  const nameRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<HTMLInputElement>(null)
  const retryRef = useRef<HTMLInputElement>(null)
  const headersRef = useRef<HTMLTextAreaElement>(null)
  // Field whose error to announce. `null` means form-level (general) error.
  const [errorField, setErrorField] = useState<
    'name' | 'target' | 'timeout' | 'retry' | 'headers' | null
  >(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setHeadersError(null)
    setErrorField(null)
    if (!name.trim()) {
      setError('Name is required')
      setErrorField('name')
      nameRef.current?.focus()
      return
    }
    if (!target.trim()) {
      setError('Target is required')
      setErrorField('target')
      targetRef.current?.focus()
      return
    }
    if (timeoutSeconds === '') {
      setError('Timeout is required')
      setErrorField('timeout')
      timeoutRef.current?.focus()
      return
    }
    if (retryCount === '') {
      setError('Retries is required')
      setErrorField('retry')
      retryRef.current?.focus()
      return
    }

    const builtConfig = buildConfigPayload(detail.data!.monitor.type, config)
    if ('error' in builtConfig) {
      setError(builtConfig.error)
      // Config-level errors don't map to a single input; let focus land on Save.
      return
    }

    if (detail.data!.monitor.type === 'http') {
      const headers = parseHeaders(headersText)
      if ('error' in headers) {
        setHeadersError(headers.error)
        setErrorField('headers')
        headersRef.current?.focus()
        return
      }
      setHeadersError(null)
      builtConfig.value.headers = headers.value
    }

    save.mutate({
      name: name.trim(),
      target: target.trim(),
      intervalSeconds,
      timeoutSeconds,
      retryCount,
      tags,
      channelIds,
      config: builtConfig.value,
    })
  }

  if (detail.isLoading) {
    return (
      <div className="px-4 lg:px-6 max-w-3xl w-full mx-auto flex flex-col gap-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-72" />
        <Panel className="p-6 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-7" />
            <Skeleton className="h-7" />
            <Skeleton className="h-7" />
          </div>
        </Panel>
      </div>
    )
  }
  if (detail.isError || !detail.data) {
    return (
      <div className="px-4 lg:px-6 max-w-3xl w-full mx-auto">
        <div className="rounded-lg border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Couldn't load this monitor.{' '}
          <button
            type="button"
            onClick={() => detail.refetch()}
            className="text-foreground underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const monitor = detail.data.monitor

  return (
    <form onSubmit={handleSubmit} className="px-4 lg:px-6 max-w-3xl w-full mx-auto flex flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        type="button"
        // The unsaved guard intercepts this navigate and asks first.
        onClick={() => navigate(`/admin/monitors/${id}`)}
        className="self-start -ml-3"
      >
        <Icon icon={ArrowLeft} className="h-4 w-4" />
        Back to monitor
      </Button>

      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Edit {monitor.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Type (<span className="uppercase font-medium">{monitor.type}</span>) cannot
          be changed. Delete and recreate the monitor to switch types.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Identity and scheduling.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <FieldInput
              ref={nameRef}
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={errorField === 'name' || undefined}
              aria-describedby={errorField === 'name' ? 'edit-error' : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-target">Target</Label>
            <FieldInput
              ref={targetRef}
              id="edit-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="font-mono text-xs"
              aria-invalid={errorField === 'target' || undefined}
              aria-describedby={errorField === 'target' ? 'edit-error' : undefined}
            />
            <p className="text-xs text-muted-foreground">
              {monitor.type === 'http' && 'Full URL, including protocol.'}
              {monitor.type === 'tcp' && 'Format: host:port (or set port below and use bare host).'}
              {monitor.type === 'ping' && 'Hostname or IP address.'}
              {monitor.type === 'dns' && 'Hostname to resolve.'}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="edit-interval">Check interval</Label>
              <Select
                value={String(intervalSeconds)}
                onValueChange={(v) => setIntervalSeconds(Number(v))}
              >
                <SelectTrigger id="edit-interval">
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
              <Label htmlFor="edit-timeout">Timeout (seconds)</Label>
              <FieldInput
                ref={timeoutRef}
                id="edit-timeout"
                type="number"
                min={1}
                max={60}
                value={timeoutSeconds}
                onChange={(e) =>
                  setTimeoutSeconds(
                    e.target.value === '' ? '' : Number(e.target.value),
                  )
                }
                aria-invalid={errorField === 'timeout' || undefined}
                aria-describedby={errorField === 'timeout' ? 'edit-error' : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-retry">Retries before down</Label>
              <FieldInput
                ref={retryRef}
                id="edit-retry"
                type="number"
                min={0}
                max={5}
                value={retryCount}
                onChange={(e) =>
                  setRetryCount(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags</Label>
            <TagInput value={tags} onChange={setTags} id="edit-tags" />
          </div>
        </CardContent>
      </Card>

      {monitor.type === 'http' && (
        <HttpConfig
          config={config}
          setConfig={setConfig}
          headersText={headersText}
          setHeadersText={setHeadersText}
          headersError={headersError}
          headersRef={headersRef}
          errorField={errorField}
        />
      )}
      {monitor.type === 'tcp' && <TcpConfig config={config} setConfig={setConfig} />}
      {monitor.type === 'dns' && <DnsConfig config={config} setConfig={setConfig} />}

      <ChannelsCard
        channels={channelsQuery.data?.channels ?? []}
        loading={channelsQuery.isLoading}
        error={channelsQuery.isError}
        onRetry={() => void channelsQuery.refetch()}
        selected={channelIds}
        setSelected={setChannelIds}
      />

      {error && (
        <p
          id="edit-error"
          role="alert"
          aria-live="polite"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          // The unsaved guard intercepts this navigate and asks first.
          onClick={() => navigate(`/admin/monitors/${id}`)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending || !isDirty}>
          {save.isPending ? 'Saving…' : 'Save changes'}
          <Icon icon={CheckCircle} className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}

// ─────────────────────────── HTTP config ───────────────────────────

function HttpConfig({
  config,
  setConfig,
  headersText,
  setHeadersText,
  headersError,
  headersRef,
  errorField,
}: {
  config: Record<string, unknown>
  setConfig: (next: Record<string, unknown>) => void
  headersText: string
  setHeadersText: (next: string) => void
  headersError: string | null
  headersRef: React.RefObject<HTMLTextAreaElement>
  errorField: 'name' | 'target' | 'timeout' | 'retry' | 'headers' | null
}) {
  const set = <K extends string>(key: K, value: unknown) =>
    setConfig({ ...config, [key]: value })
  const c = config as {
    method?: string
    body?: string
    expectedStatusCodes?: number[]
    expectedKeyword?: string
    expectedJsonPath?: { path: string; equals: unknown }
    followRedirects?: boolean
    verifyTls?: boolean
  }
  const codesText = useMemo(
    () => (c.expectedStatusCodes ?? []).join(', '),
    [c.expectedStatusCodes],
  )
  const jsonPath = c.expectedJsonPath?.path ?? ''
  const jsonEquals =
    c.expectedJsonPath?.equals !== undefined
      ? JSON.stringify(c.expectedJsonPath.equals)
      : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle>HTTP options</CardTitle>
        <CardDescription>
          Optional. The check passes when the response matches every assertion below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="http-method">Method</Label>
            <Select
              value={c.method ?? 'GET'}
              onValueChange={(v) => set('method', v)}
            >
              <SelectTrigger id="http-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="http-codes">Expected status codes</Label>
            <FieldInput
              id="http-codes"
              value={codesText}
              onChange={(e) => {
                const parsed = e.target.value
                  .split(',')
                  .map((s) => Number(s.trim()))
                  .filter((n) => Number.isFinite(n) && n > 0)
                set('expectedStatusCodes', parsed.length ? parsed : undefined)
              }}
              placeholder="200, 201, 204"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Leave blank to accept any 2xx.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="http-headers">Request headers (JSON)</Label>
          <FieldTextarea
            ref={headersRef}
            id="http-headers"
            value={headersText}
            onChange={(e) => setHeadersText(e.target.value)}
            placeholder='{"Authorization": "Bearer …"}'
            rows={4}
            aria-invalid={errorField === 'headers' || undefined}
            aria-describedby={errorField === 'headers' ? 'http-headers-error' : undefined}
            className="font-mono text-xs"
          />
          {headersError && (
            <p
              id="http-headers-error"
              role="alert"
              aria-live="polite"
              className="text-xs text-destructive"
            >
              {headersError}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="http-body">Request body</Label>
          <FieldTextarea
            id="http-body"
            value={c.body ?? ''}
            onChange={(e) => set('body', e.target.value || undefined)}
            placeholder="Optional"
            rows={3}
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="http-keyword">Body must contain</Label>
          <FieldInput
            id="http-keyword"
            value={c.expectedKeyword ?? ''}
            onChange={(e) => set('expectedKeyword', e.target.value || undefined)}
            placeholder="e.g. ok"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="http-json-path">JSON path</Label>
            <FieldInput
              id="http-json-path"
              value={jsonPath}
              onChange={(e) => {
                const next = e.target.value
                if (!next) {
                  set('expectedJsonPath', undefined)
                } else {
                  set('expectedJsonPath', {
                    path: next,
                    equals: c.expectedJsonPath?.equals ?? null,
                  })
                }
              }}
              placeholder="status.healthy"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="http-json-equals">Equals (JSON value)</Label>
            <FieldInput
              id="http-json-equals"
              value={jsonEquals}
              onChange={(e) => {
                const raw = e.target.value
                if (!c.expectedJsonPath?.path) return
                let parsed: unknown = raw
                try {
                  parsed = raw ? JSON.parse(raw) : null
                } catch {
                  // Keep as string while user is mid-typing
                  parsed = raw
                }
                set('expectedJsonPath', {
                  path: c.expectedJsonPath!.path,
                  equals: parsed,
                })
              }}
              placeholder='true / "ok" / 200'
              className="font-mono text-xs"
              disabled={!c.expectedJsonPath?.path}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CheckboxField
            id="http-follow"
            checked={c.followRedirects ?? true}
            onChange={(v) => set('followRedirects', v)}
            label="Follow redirects (3xx → next URL)"
          />
          <CheckboxField
            id="http-tls"
            checked={c.verifyTls ?? true}
            onChange={(v) => set('verifyTls', v)}
            label="Verify TLS certificate"
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────── TCP config ───────────────────────────

function TcpConfig({
  config,
  setConfig,
}: {
  config: Record<string, unknown>
  setConfig: (next: Record<string, unknown>) => void
}) {
  const port = (config as { port?: number }).port
  return (
    <Card>
      <CardHeader>
        <CardTitle>TCP options</CardTitle>
        <CardDescription>
          Used when the target is a bare hostname; ignored if the target already
          includes a port.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-w-xs">
          <Label htmlFor="tcp-port">Port</Label>
          <FieldInput
            id="tcp-port"
            type="number"
            min={1}
            max={65535}
            value={port ?? ''}
            onChange={(e) =>
              setConfig({
                ...config,
                port: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────── DNS config ───────────────────────────

function DnsConfig({
  config,
  setConfig,
}: {
  config: Record<string, unknown>
  setConfig: (next: Record<string, unknown>) => void
}) {
  const c = config as {
    recordType?: string
    expectedValue?: string
    resolver?: string
  }
  const set = <K extends string>(key: K, value: unknown) =>
    setConfig({ ...config, [key]: value })

  return (
    <Card>
      <CardHeader>
        <CardTitle>DNS options</CardTitle>
        <CardDescription>
          Resolve a record and (optionally) check a value within the response.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="dns-type">Record type</Label>
            <Select
              value={c.recordType ?? 'A'}
              onValueChange={(v) => set('recordType', v)}
            >
              <SelectTrigger id="dns-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DNS_RECORD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="dns-resolver">Custom resolver</Label>
            <FieldInput
              id="dns-resolver"
              value={c.resolver ?? ''}
              onChange={(e) => set('resolver', e.target.value || undefined)}
              placeholder="e.g. 1.1.1.1"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dns-expected">Expected value</Label>
          <FieldInput
            id="dns-expected"
            value={c.expectedValue ?? ''}
            onChange={(e) => set('expectedValue', e.target.value || undefined)}
            placeholder="Substring to match in any returned record"
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────── Channels ───────────────────────────

function ChannelsCard({
  channels,
  loading,
  error,
  onRetry,
  selected,
  setSelected,
}: {
  channels: NotificationChannel[]
  loading: boolean
  error?: boolean
  onRetry?: () => void
  selected: string[]
  setSelected: (next: string[]) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification channels</CardTitle>
        <CardDescription>
          Channels here are notified on every down → up transition.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <QueryError
            subject="notification channels"
            onRetry={() => onRetry?.()}
          />
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No channels yet. Add some from the Channels page first.
          </p>
        ) : (
          <div className="space-y-2">
            {channels.map((c) => {
              const checked = selected.includes(c.id)
              return (
                <label
                  key={c.id}
                  className={cn(
                    'flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors',
                    checked ? 'bg-accent border-primary' : 'hover:bg-accent/50',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() =>
                      setSelected(
                        checked
                          ? selected.filter((id) => id !== c.id)
                          : [...selected, c.id],
                      )
                    }
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
      </CardContent>
    </Card>
  )
}

function CheckboxField({
  id,
  checked,
  onChange,
  label,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input"
      />
      {label}
    </label>
  )
}

// ─────────────────────────── Helpers ───────────────────────────

function parseHeaders(text: string): { value: Record<string, string> | undefined } | { error: string } {
  if (!text.trim()) return { value: undefined }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { error: 'Headers must be valid JSON' }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: 'Headers must be a JSON object' }
  }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v !== 'string') return { error: `Header "${k}" must be a string` }
    out[k] = v
  }
  return { value: out }
}

function buildConfigPayload(
  type: string,
  config: Record<string, unknown>,
):
  | { value: Record<string, unknown> }
  | { error: string } {
  const out: Record<string, unknown> = {}

  if (type === 'http') {
    const c = config as Record<string, unknown>
    if (c.method) out.method = c.method
    if (c.body) out.body = c.body
    if (Array.isArray(c.expectedStatusCodes) && c.expectedStatusCodes.length > 0) {
      out.expectedStatusCodes = c.expectedStatusCodes
    }
    if (typeof c.expectedKeyword === 'string' && c.expectedKeyword) {
      out.expectedKeyword = c.expectedKeyword
    }
    if (
      c.expectedJsonPath &&
      typeof (c.expectedJsonPath as { path?: unknown }).path === 'string' &&
      (c.expectedJsonPath as { path: string }).path
    ) {
      out.expectedJsonPath = c.expectedJsonPath
    }
    if (typeof c.followRedirects === 'boolean') out.followRedirects = c.followRedirects
    if (typeof c.verifyTls === 'boolean') out.verifyTls = c.verifyTls
    return { value: out }
  }

  if (type === 'tcp') {
    const port = (config as { port?: unknown }).port
    if (port != null) {
      const n = Number(port)
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        return { error: 'TCP port must be an integer 1-65535' }
      }
      out.port = n
    }
    return { value: out }
  }

  if (type === 'dns') {
    const c = config as { recordType?: unknown; expectedValue?: unknown; resolver?: unknown }
    out.recordType = c.recordType ?? 'A'
    if (typeof c.expectedValue === 'string' && c.expectedValue) {
      out.expectedValue = c.expectedValue
    }
    if (typeof c.resolver === 'string' && c.resolver) {
      out.resolver = c.resolver
    }
    return { value: out }
  }

  // ping etc — no config
  return { value: out }
}
