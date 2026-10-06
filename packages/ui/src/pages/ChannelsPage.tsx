import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { Checkbox } from '@/components/ui/checkbox'
import { PlusCircle } from "@phosphor-icons/react/dist/icons/PlusCircle"
import { TestTube } from "@phosphor-icons/react/dist/icons/TestTube"
import { Trash } from "@phosphor-icons/react/dist/icons/Trash"
import { PencilSimple } from "@phosphor-icons/react/dist/icons/PencilSimple"
import { Bell } from "@phosphor-icons/react/dist/icons/Bell"
import { ShareNetwork } from "@phosphor-icons/react/dist/icons/ShareNetwork"
import { DiscordLogo } from "@phosphor-icons/react/dist/icons/DiscordLogo"
import { SlackLogo } from "@phosphor-icons/react/dist/icons/SlackLogo"
import { EnvelopeSimple } from "@phosphor-icons/react/dist/icons/EnvelopeSimple"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { QueryError } from '@/components/QueryError'
import { ScreenHeader } from '@/components/screen'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/components/confirm-provider'
import { usePrimaryAction } from '@/contexts/primary-action'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldInput } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ChannelType, MonitorWithLatest, NotificationChannel } from '@/types'

/**
 * Monitors attached to each channel id, in list order. Monitors carry
 * `channelIds`, so inverting them is the only way to show "who gets paged
 * for what" on each channel row. Per-monitor routing itself is managed from
 * the monitor detail page (and the domain modal), not here.
 */
function computeRouting(
  channels: NotificationChannel[],
  monitors: MonitorWithLatest[],
): Map<string, MonitorWithLatest[]> {
  const byId = new Map(channels.map((c) => [c.id, c]))
  const byChannel = new Map<string, MonitorWithLatest[]>(channels.map((c) => [c.id, []]))

  for (const m of monitors) {
    // Ignore ids pointing at channels that no longer exist — a deleted channel
    // leaves the monitor just as unreachable as an empty list.
    const attached = (m.channelIds ?? []).map((id) => byId.get(id)).filter((c) => c != null)
    for (const c of attached) byChannel.get(c.id)?.push(m)
  }

  return byChannel
}

export function ChannelsPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<NotificationChannel | null>(null)
  const { setAction: setPrimaryAction } = usePrimaryAction()

  // The shell's lime action belongs to this screen while mounted.
  useEffect(() => {
    setPrimaryAction({ label: 'Add channel', onClick: () => setOpen(true) })
    return () => setPrimaryAction(null)
  }, [setPrimaryAction])

  const channels = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<{ channels: NotificationChannel[] }>('/api/admin/channels'),
  })
  // Shares the dashboard's cache key. Monitors carry `channelIds`, so inverting
  // them is the only way to answer "who gets paged for what" on this page.
  const monitors = useQuery({
    queryKey: ['monitors'],
    queryFn: () => api.get<{ monitors: MonitorWithLatest[] }>('/api/admin/monitors'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/channels/${id}`),
    onSuccess: (_data, _id) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      // Deleting a channel can strand monitors, so the routing view has to re-derive.
      queryClient.invalidateQueries({ queryKey: ['monitors'] })
      toast.success('Channel deleted')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to delete channel'),
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/channels/${id}/test`),
  })

  const items = channels.data?.channels ?? []
  const monitorList = monitors.data?.monitors ?? []
  const routing = useMemo(
    () => computeRouting(items, monitorList),
    [items, monitorList],
  )

  const header = (
    <ScreenHeader
      title="Channels"
      description="Where alerts go when monitors change state"
    />
  )

  const dialogs = (
    <>
      <ChannelDialog open={open} onClose={() => setOpen(false)} />
      <ChannelDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        editing={editing}
      />
    </>
  )

  if (channels.isPending) {
    return (
      <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
        {header}
        <ChannelsSkeleton />
        {dialogs}
      </div>
    )
  }

  if (channels.isError) {
    return (
      <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
        {header}
        <QueryError subject="channels" onRetry={() => void channels.refetch()} />
        {dialogs}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
        {header}
        <EmptyState
          icon={Bell}
          title="No notification channels yet"
          description={
            monitorList.length > 0
              ? `Add a channel (webhook, Slack, Discord, ntfy, or email) so PingBoard can tell you when something goes down. Right now all ${monitorList.length} monitors would fail silently.`
              : 'Add a channel (webhook, Slack, Discord, ntfy, or email) so PingBoard can tell you when something goes down.'
          }
          action={
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Icon icon={PlusCircle} className="size-4" />
              Add your first channel
            </Button>
          }
        />
        {dialogs}
      </div>
    )
  }

  const unknownRouting = monitors.isError || monitors.isPending

  return (
    <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
      {header}

      <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card">
        {items.map((c) => (
          <ChannelRow
            key={c.id}
            channel={c}
            routed={routing.get(c.id) ?? []}
            routingKnown={!unknownRouting}
            onEdit={() => setEditing(c)}
            onTest={() => {
              const id = toast.loading(`Sending test via ${c.name}…`)
              testMutation.mutate(c.id, {
                onSuccess: () => toast.success(`Test sent via ${c.name}`, { id }),
                onError: (err) =>
                  toast.error(
                    err instanceof Error ? `Test failed: ${err.message}` : 'Test failed',
                    { id },
                  ),
              })
            }}
            testPending={testMutation.isPending}
            onDelete={async () => {
              const attached = routing.get(c.id)?.length ?? 0
              const ok = await confirm({
                title: `Delete "${c.name}"?`,
                description: attached
                  ? `${attached} monitor${attached === 1 ? '' : 's'} route here. They'll keep running, but stop notifying through this channel.`
                  : 'Monitors linked to this channel will keep working, but stop notifying through it.',
                confirmLabel: 'Delete channel',
                destructive: true,
              })
              if (ok) deleteMutation.mutate(c.id)
            }}
          />
        ))}
      </ul>

      {dialogs}
    </div>
  )
}

function ChannelRow({
  channel,
  routed,
  routingKnown,
  onEdit,
  onTest,
  testPending,
  onDelete,
}: {
  channel: NotificationChannel
  routed: MonitorWithLatest[]
  routingKnown: boolean
  onEdit: () => void
  onTest: () => void
  testPending: boolean
  onDelete: () => void
}) {
  const destination = describeDestination(channel)
  const shown = routed.slice(0, 4)
  const overflow = routed.length - shown.length
  const none = routingKnown && routed.length === 0

  return (
    <li className="flex flex-col gap-2 px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span
          aria-hidden
          className={cn(
            'size-2 shrink-0 rounded-full',
            channel.enabled ? 'bg-success' : 'bg-muted-foreground/50',
          )}
        />
        <h3 className="truncate text-[15px] font-semibold tracking-tight">
          {channel.name}
        </h3>
        {!channel.enabled && (
          <Badge variant="warning" className="shrink-0">
            Disabled
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={onTest}
            disabled={testPending}
          >
            <Icon icon={TestTube} className="size-3.5" />
            Test
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onEdit}>
            <Icon icon={PencilSimple} className="size-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Delete ${channel.name}`}
            onClick={onDelete}
          >
            <Icon icon={Trash} className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-4">
        <span className="truncate font-mono text-[13px] text-muted-foreground">
          {destination ?? 'No destination configured'}
        </span>
        {!routingKnown ? (
          <span className="text-[13px] text-muted-foreground">Checking routes…</span>
        ) : none ? (
          <span className="text-[13px] text-warning">
            Nothing fires this channel
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] tabular-nums text-muted-foreground">
              {routed.length} monitor{routed.length === 1 ? '' : 's'}:
            </span>
            {shown.map((m) => (
              <MonitorChip key={m.id} monitor={m} />
            ))}
            {overflow > 0 && (
              <span className="text-[11px] tabular-nums text-muted-foreground">
                +{overflow} more
              </span>
            )}
          </span>
        )}
      </div>
    </li>
  )
}

function MonitorChip({ monitor }: { monitor: MonitorWithLatest }) {
  return (
    <Link
      to={`/admin/monitors/${monitor.id}`}
      className="inline-flex max-w-[12rem] items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] outline-none transition-[color,background-color,border-color,transform] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.97]"
    >
      <StatusDot monitor={monitor} />
      <span className="truncate">{monitor.name}</span>
    </Link>
  )
}

function StatusDot({ monitor }: { monitor: MonitorWithLatest }) {
  const tone = monitor.paused
    ? 'bg-muted-foreground/40'
    : !monitor.latest
      ? 'bg-muted-foreground/40'
      : monitor.latest.status === 'up'
        ? 'bg-success'
        : monitor.latest.status === 'down'
          ? 'bg-destructive'
          : 'bg-warning'
  return <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', tone)} />
}

/**
 * Where a channel actually delivers. Secrets in webhook URLs are redacted —
 * the point is recognising the endpoint, not reading the token back out.
 */
function describeDestination(channel: NotificationChannel): string | null {
  const cfg = channel.config as Record<string, unknown>
  const str = (k: string) => (typeof cfg[k] === 'string' ? (cfg[k] as string) : '')

  if (channel.type === 'webhook') return redactUrl(str('url')) || null
  if (channel.type === 'discord' || channel.type === 'slack') {
    return redactUrl(str('webhookUrl')) || null
  }
  if (channel.type === 'ntfy') {
    // Older rows store `server`; the dialog writes `serverUrl`.
    const server = str('serverUrl') || str('server')
    const topic = str('topic')
    if (!server && !topic) return null
    return [redactUrl(server), topic].filter(Boolean).join('/')
  }
  if (channel.type === 'email') return str('to') || null
  return null
}

function redactUrl(raw: string): string {
  if (!raw) return ''
  try {
    const url = new URL(raw)
    const segments = url.pathname
      .split('/')
      .filter(Boolean)
      // Long or all-numeric segments are ids and tokens, not readable path.
      .map((s) => (s.length >= 16 || (/^\d+$/.test(s) && s.length >= 12) ? `…${s.slice(-4)}` : s))
    return url.host + (segments.length ? `/${segments.join('/')}` : '')
  } catch {
    return raw
  }
}

function ChannelsSkeleton() {
  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex flex-col gap-2.5 px-4 py-3.5 sm:px-5">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-64" />
        </li>
      ))}
    </ul>
  )
}

const CHANNEL_TYPES: {
  id: ChannelType
  label: string
  icon: typeof ShareNetwork
}[] = [
  { id: 'webhook', label: 'Webhook', icon: ShareNetwork },
  { id: 'discord', label: 'Discord', icon: DiscordLogo },
  { id: 'slack', label: 'Slack', icon: SlackLogo },
  { id: 'ntfy', label: 'ntfy', icon: Bell },
  { id: 'email', label: 'Email', icon: EnvelopeSimple },
]

function ChannelDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing?: NotificationChannel | null
}) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [name, setName] = useState('')
  const [type, setType] = useState<ChannelType>('webhook')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [enabled, setEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Which field blocked the last submit, so the message sits next to the input
  // rather than at the bottom of the dialog.
  const [invalid, setInvalid] = useState<{ field: string; message: string } | null>(null)

  const isEdit = !!editing

  const reset = () => {
    setName('')
    setType('webhook')
    setConfig({})
    setEnabled(true)
    setError(null)
    setInvalid(null)
  }

  // Hydrate from the editing target whenever it changes (and reset when the
  // dialog moves back into create mode).
  useEffect(() => {
    if (editing) {
      setName(editing.name)
      setType(editing.type)
      setConfig(configToFormState(editing.config))
      setEnabled(editing.enabled)
      setError(null)
      setInvalid(null)
    } else {
      reset()
    }
  }, [editing])

  const save = useMutation({
    mutationFn: (payload: object) =>
      editing
        ? api.patch(`/api/admin/channels/${editing.id}`, payload)
        : api.post('/api/admin/channels', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['channels'] })
      toast.success(editing ? 'Channel updated' : 'Channel created')
      reset()
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setInvalid({ field: 'ch-name', message: 'Give the channel a name.' })
      document.getElementById('ch-name')?.focus()
      return
    }
    const cfg = buildConfig(type, config)
    if ('error' in cfg) {
      setInvalid({ field: cfg.field, message: cfg.error })
      document.getElementById(cfg.field)?.focus()
      return
    }
    setInvalid(null)
    save.mutate({ name: name.trim(), type, config: cfg.value, enabled })
  }

  // Anything past the hydration baseline is a draft worth guarding against an
  // accidental Esc/overlay/X close.
  const baselineConfig = editing ? configToFormState(editing.config) : {}
  const isDirty =
    name !== (editing?.name ?? '') ||
    type !== (editing?.type ?? 'webhook') ||
    enabled !== (editing?.enabled ?? true) ||
    JSON.stringify(Object.entries(config).sort()) !==
      JSON.stringify(Object.entries(baselineConfig).sort())

  // Every exit — Esc, overlay, X, and the footer Cancel — goes through here. A
  // dirty form asks first; a confirmed (or pristine) exit clears the draft, so
  // a cancelled create doesn't reappear the next time the dialog opens.
  const cancel = async () => {
    if (isDirty) {
      const ok = await confirm({
        title: 'Discard this channel draft?',
        description: 'The form has unsaved changes that will be lost.',
        confirmLabel: 'Discard',
        destructive: true,
      })
      if (!ok) return
    }
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && void cancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit ${editing!.name}` : 'Add notification channel'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Type cannot be changed after creation; delete and recreate to switch.'
              : 'Channels can be linked to one or more monitors.'}
          </DialogDescription>
        </DialogHeader>
        {/* Wrapping the body means Enter in any field submits, which is what a
            two-field dialog reads like. */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ch-name">Name</Label>
            <FieldInput
              id="ch-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setInvalid(null)
              }}
              aria-invalid={invalid?.field === 'ch-name'}
              aria-describedby={invalid?.field === 'ch-name' ? 'ch-name-error' : undefined}
              placeholder="e.g. On-call Discord"
            />
            {invalid?.field === 'ch-name' && (
              <p id="ch-name-error" role="alert" className="text-xs text-destructive">
                {invalid.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label id="ch-type-label">Type</Label>
            <div
              role="radiogroup"
              aria-labelledby="ch-type-label"
              className="grid grid-cols-3 gap-2 sm:grid-cols-5"
            >
              {CHANNEL_TYPES.map((t) => {
                const active = type === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={isEdit}
                    onClick={() => {
                      setType(t.id)
                      setConfig({})
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium outline-none transition-[color,background-color,border-color,transform] duration-150 ease-out',
                      'focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60',
                      active
                        ? 'border-[var(--lime)] bg-[var(--lime)]/10 text-foreground'
                        : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                    )}
                  >
                    <Icon
                      icon={t.icon}
                      weight={active ? 'fill' : 'regular'}
                      className="size-5"
                    />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
          <ConfigFields
            type={type}
            config={config}
            setConfig={(next) => {
              setConfig(next)
              setInvalid(null)
            }}
            invalid={invalid}
          />
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={enabled}
                onCheckedChange={(checked) => setEnabled(checked === true)}
              />
              Enabled (receives notifications)
            </label>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => void cancel()}>
              Cancel
            </Button>
            {/* Stays enabled with an empty name — submitting names the missing
                field instead of leaving a dead button. */}
            <Button
              type="submit"
              disabled={save.isPending}
              className="border-transparent bg-[var(--lime)] font-semibold text-[var(--lime-ink)] hover:bg-[var(--lime-hover)]"
            >
              {save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create channel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function configToFormState(config: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(config)) {
    if (v == null) continue
    out[k] = typeof v === 'string' ? v : String(v)
  }
  return out
}

function ConfigFields({
  type,
  config,
  setConfig,
  invalid,
}: {
  type: ChannelType
  config: Record<string, string>
  setConfig: (v: Record<string, string>) => void
  invalid: { field: string; message: string } | null
}) {
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setConfig({ ...config, [k]: e.target.value })

  // Marks the field `buildConfig` rejected and renders the reason beside it.
  const flag = (id: string) => ({
    'aria-invalid': invalid?.field === id,
    'aria-describedby': invalid?.field === id ? `${id}-error` : undefined,
  })
  const message = (id: string) =>
    invalid?.field === id ? (
      <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
        {invalid.message}
      </p>
    ) : null

  if (type === 'webhook') {
    return (
      <div className="space-y-2">
        <Label htmlFor="ch-url">Webhook URL</Label>
        <FieldInput
          id="ch-url"
          type="url"
          value={config.url ?? ''}
          onChange={set('url')}
          placeholder="https://…"
          {...flag('ch-url')}
        />
        {message('ch-url')}
      </div>
    )
  }
  if (type === 'discord' || type === 'slack') {
    return (
      <div className="space-y-2">
        <Label htmlFor="ch-webhook">Webhook URL</Label>
        <FieldInput
          id="ch-webhook"
          value={config.webhookUrl ?? ''}
          onChange={set('webhookUrl')}
          placeholder={type === 'discord' ? 'https://discord.com/api/webhooks/…' : 'https://hooks.slack.com/services/…'}
          {...flag('ch-webhook')}
        />
        {message('ch-webhook')}
      </div>
    )
  }
  if (type === 'ntfy') {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="ch-server">Server URL</Label>
          <FieldInput
            id="ch-server"
            value={config.serverUrl ?? ''}
            onChange={set('serverUrl')}
            placeholder="https://ntfy.sh"
            {...flag('ch-server')}
          />
          {message('ch-server')}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ch-topic">Topic</Label>
          <FieldInput
            id="ch-topic"
            value={config.topic ?? ''}
            onChange={set('topic')}
            {...flag('ch-topic')}
          />
          {message('ch-topic')}
        </div>
      </>
    )
  }
  if (type === 'email') {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="ch-to">Send alerts to</Label>
          <FieldInput
            id="ch-to"
            type="email"
            value={config.to ?? ''}
            onChange={set('to')}
            placeholder="you@your.org"
            {...flag('ch-to')}
          />
          {message('ch-to')}
        </div>
        <p className="text-xs text-muted-foreground">
          SMTP fields below are optional — leave blank to use the defaults
          configured in Settings.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="ch-host">SMTP host</Label>
            <FieldInput id="ch-host" value={config.smtpHost ?? ''} onChange={set('smtpHost')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-port">Port</Label>
            <FieldInput id="ch-port" type="number" min={1} max={65535} inputMode="numeric" value={config.smtpPort ?? ''} onChange={set('smtpPort')} placeholder="587" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="ch-user">User</Label>
            <FieldInput id="ch-user" value={config.smtpUser ?? ''} onChange={set('smtpUser')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-pass">Password</Label>
            <FieldInput id="ch-pass" type="password" autoComplete="new-password" value={config.smtpPass ?? ''} onChange={set('smtpPass')} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ch-from">From</Label>
          <FieldInput id="ch-from" value={config.smtpFrom ?? ''} onChange={set('smtpFrom')} placeholder="alerts@your.org" />
        </div>
      </>
    )
  }
  return null
}

// `field` is the DOM id of the offending input so the caller can anchor the
// message to it and move focus there.
function buildConfig(
  type: ChannelType,
  config: Record<string, string>,
): { value: Record<string, unknown> } | { error: string; field: string } {
  if (type === 'webhook') {
    if (!config.url?.trim()) return { error: 'Webhook URL required.', field: 'ch-url' }
    return { value: { url: config.url.trim() } }
  }
  if (type === 'discord' || type === 'slack') {
    if (!config.webhookUrl?.trim()) {
      return { error: 'Webhook URL required.', field: 'ch-webhook' }
    }
    return { value: { webhookUrl: config.webhookUrl.trim() } }
  }
  if (type === 'ntfy') {
    if (!config.serverUrl?.trim()) {
      return { error: 'Server URL required.', field: 'ch-server' }
    }
    if (!config.topic?.trim()) return { error: 'Topic required.', field: 'ch-topic' }
    return { value: { serverUrl: config.serverUrl.trim(), topic: config.topic.trim() } }
  }
  if (type === 'email') {
    if (!config.to?.trim()) {
      return { error: 'Recipient address required.', field: 'ch-to' }
    }
    const value: Record<string, unknown> = { to: config.to.trim() }
    // Only persist SMTP fields the user filled in; the rest fall back to
    // instance-wide defaults at send time.
    if (config.smtpHost?.trim()) value.smtpHost = config.smtpHost.trim()
    if (config.smtpPort?.trim()) {
      const port = Number(config.smtpPort)
      if (!Number.isFinite(port) || port < 1 || port > 65535) {
        return { error: 'Port must be a number between 1 and 65535.', field: 'ch-port' }
      }
      value.smtpPort = port
    }
    if (config.smtpUser?.trim()) value.smtpUser = config.smtpUser.trim()
    if (config.smtpPass?.trim()) value.smtpPass = config.smtpPass
    if (config.smtpFrom?.trim()) value.smtpFrom = config.smtpFrom.trim()
    return { value }
  }
  return { error: 'Unknown type', field: 'ch-name' }
}
