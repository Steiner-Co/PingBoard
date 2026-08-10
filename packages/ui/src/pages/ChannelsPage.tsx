import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { Checkbox } from '@/components/ui/checkbox'
import { PlusSquare } from "@phosphor-icons/react/dist/icons/PlusSquare"
import { TestTube } from "@phosphor-icons/react/dist/icons/TestTube"
import { Trash } from "@phosphor-icons/react/dist/icons/Trash"
import { PencilSimple } from "@phosphor-icons/react/dist/icons/PencilSimple"
import { Bell } from "@phosphor-icons/react/dist/icons/Bell"
import { Warning } from "@phosphor-icons/react/dist/icons/Warning"
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle"
import { CaretRight } from "@phosphor-icons/react/dist/icons/CaretRight"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { Panel } from '@/components/panel'
import { QueryError } from '@/components/QueryError'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/components/confirm-provider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { cn } from '@/lib/utils'
import type { ChannelType, MonitorWithLatest, NotificationChannel } from '@/types'

/** A monitor that would page nobody, and why. */
interface RoutingGap {
  monitor: MonitorWithLatest
  /** `none` — no channel attached at all. `disabled` — every attached channel is switched off. */
  reason: 'none' | 'disabled'
}

interface Routing {
  /** Monitors attached to each channel id, in list order. */
  byChannel: Map<string, MonitorWithLatest[]>
  enabledChannels: number
  /** Active (non-paused) monitors that reach at least one enabled channel. */
  covered: number
  activeTotal: number
  /** Active monitors with no live delivery path — the failure this page exists to prevent. */
  gaps: RoutingGap[]
  /** Same hole, but on paused monitors: worth listing, not worth alarming about. */
  pausedGaps: MonitorWithLatest[]
}

function computeRouting(
  channels: NotificationChannel[],
  monitors: MonitorWithLatest[],
): Routing {
  const byId = new Map(channels.map((c) => [c.id, c]))
  const byChannel = new Map<string, MonitorWithLatest[]>(channels.map((c) => [c.id, []]))

  let covered = 0
  let activeTotal = 0
  const gaps: RoutingGap[] = []
  const pausedGaps: MonitorWithLatest[] = []

  for (const m of monitors) {
    // Ignore ids pointing at channels that no longer exist — a deleted channel
    // leaves the monitor just as unreachable as an empty list.
    const attached = (m.channelIds ?? []).map((id) => byId.get(id)).filter((c) => c != null)
    for (const c of attached) byChannel.get(c.id)?.push(m)

    // A monitor wired only to switched-off channels is silently unrouted — the
    // same hole as having no channel, and easier to miss.
    const live = attached.some((c) => c.enabled)
    if (m.paused) {
      if (!live) pausedGaps.push(m)
      continue
    }
    activeTotal++
    if (live) covered++
    else gaps.push({ monitor: m, reason: attached.length === 0 ? 'none' : 'disabled' })
  }

  return {
    byChannel,
    enabledChannels: channels.filter((c) => c.enabled).length,
    covered,
    activeTotal,
    gaps,
    pausedGaps,
  }
}

export function ChannelsPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<NotificationChannel | null>(null)

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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Channels</h1>
        <p className="text-sm text-muted-foreground">
          Where alerts go when monitors change state
        </p>
      </div>
      <Button onClick={() => setOpen(true)} className="gap-2 self-start sm:self-auto">
        <Icon icon={PlusSquare} className="h-4 w-4" />
        Add channel
      </Button>
    </div>
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
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        {header}
        <ChannelsSkeleton />
        {dialogs}
      </div>
    )
  }

  if (channels.isError) {
    return (
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        {header}
        <QueryError subject="channels" onRetry={() => void channels.refetch()} />
        {dialogs}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="px-4 lg:px-6 flex flex-col gap-6">
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
            <Button onClick={() => setOpen(true)}>
        <Icon icon={PlusSquare} className="h-4 w-4" />
              Add your first channel
            </Button>
          }
        />
        {dialogs}
      </div>
    )
  }

  const typeSummary = [...new Set(items.map((c) => c.type))].join(' · ')
  const unknownRouting = monitors.isError || monitors.isPending

  return (
    <div className="px-4 lg:px-6 flex flex-col gap-6">
      {header}

      <Panel className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x divide-border/60">
        <StatCell
          label="Channels"
          value={String(items.length)}
          sub={typeSummary}
          className="border-b border-border/60 lg:border-b-0 border-r lg:border-r-0"
        />
        <StatCell
          label="Enabled"
          value={String(routing.enabledChannels)}
          valueSuffix={`/ ${items.length}`}
          tone={routing.enabledChannels === items.length ? 'default' : 'warn'}
          sub={
            routing.enabledChannels === items.length
              ? 'All channels are delivering'
              : `${items.length - routing.enabledChannels} switched off — alerts dropped`
          }
          className="border-b border-border/60 lg:border-b-0"
        />
        <StatCell
          label="Monitors covered"
          value={unknownRouting ? '—' : String(routing.covered)}
          valueSuffix={unknownRouting ? undefined : `/ ${routing.activeTotal}`}
          tone={
            unknownRouting
              ? 'muted'
              : routing.activeTotal > 0 && routing.covered === routing.activeTotal
                ? 'success'
                : 'default'
          }
          sub={
            unknownRouting
              ? 'Waiting on monitors'
              : 'Active checks reaching a live channel'
          }
          className="border-r border-border/60 lg:border-r-0"
        />
        <StatCell
          label="Unrouted"
          value={unknownRouting ? '—' : String(routing.gaps.length)}
          tone={unknownRouting ? 'muted' : routing.gaps.length > 0 ? 'warn' : 'success'}
          sub={
            unknownRouting
              ? 'Waiting on monitors'
              : routing.gaps.length > 0
                ? 'These failures would page nobody'
                : 'Every active check has a way out'
          }
        />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="min-w-0">
          <header className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
            <h2 className="text-sm font-medium">Channels</h2>
            <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground tabular-nums">
              {items.length} configured
            </span>
          </header>
          <ul className="divide-y divide-border/60">
            {items.map((c) => (
              <ChannelRow
                key={c.id}
                channel={c}
                routed={routing.byChannel.get(c.id) ?? []}
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
                  const attached = routing.byChannel.get(c.id)?.length ?? 0
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
        </Panel>

        {/* On narrow screens the alerting hole matters more than the channel
            list, so it leads; on xl it settles into the rail. */}
        <aside className="order-first flex min-w-0 flex-col gap-4 xl:order-last">
          <RoutingGaps
            routing={routing}
            isPending={monitors.isPending}
            isError={monitors.isError}
            onRetry={() => void monitors.refetch()}
          />
        </aside>
      </div>

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

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5">
      {/* Stacked below sm: letting the actions wrap only when the name is long
          made adjacent rows disagree about their own layout. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className={cn(
              'size-1.5 shrink-0 rounded-full',
              channel.enabled ? 'bg-success' : 'bg-muted-foreground/50',
            )}
          />
          <h3 className="truncate text-sm font-medium">{channel.name}</h3>
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {channel.type}
          </span>
          {!channel.enabled && <Badge variant="warning">Disabled</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={onTest} disabled={testPending}>
            <Icon icon={TestTube} className="h-3.5 w-3.5" />
            Test
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Icon icon={PencilSimple} className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Delete ${channel.name}`}
            onClick={onDelete}
          >
            <Icon icon={Trash} className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <dl className="grid gap-x-5 gap-y-2 text-xs sm:grid-cols-[6.5rem_minmax(0,1fr)]">
        {destination && (
          <>
            <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Delivers to
            </dt>
            <dd className="truncate font-mono text-[11px] text-muted-foreground">
              {destination}
            </dd>
          </>
        )}
        <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Routes to
        </dt>
        <dd className="min-w-0">
          {!routingKnown ? (
            <span className="text-muted-foreground">—</span>
          ) : routed.length === 0 ? (
            <span className="text-muted-foreground">
              <span className="text-warning">No monitors attached</span> — configured, but
              nothing will ever fire it.
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 tabular-nums text-muted-foreground">
                {routed.length} monitor{routed.length === 1 ? '' : 's'}
              </span>
              {shown.map((m) => (
                <MonitorChip key={m.id} monitor={m} />
              ))}
              {overflow > 0 && (
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  +{overflow} more
                </span>
              )}
            </div>
          )}
        </dd>
      </dl>
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

function RoutingGaps({
  routing,
  isPending,
  isError,
  onRetry,
}: {
  routing: Routing
  isPending: boolean
  isError: boolean
  onRetry: () => void
}) {
  if (isError) {
    return (
      <Panel>
        <header className="border-b border-border/60 px-4 py-2.5">
          <h2 className="text-sm font-medium">Alert routing</h2>
        </header>
        <p className="px-4 py-5 text-xs text-destructive">
          Couldn't load monitors, so routing coverage is unknown.{' '}
          <button type="button" onClick={onRetry} className="underline underline-offset-4">
            Retry
          </button>
        </p>
      </Panel>
    )
  }

  if (isPending) {
    return (
      <Panel>
        <header className="border-b border-border/60 px-4 py-2.5">
          <h2 className="text-sm font-medium">Alert routing</h2>
        </header>
        <div className="flex flex-col gap-3 px-4 py-4">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-36" />
        </div>
      </Panel>
    )
  }

  const { gaps, pausedGaps, activeTotal } = routing

  if (gaps.length === 0) {
    return (
      <Panel>
        <header className="border-b border-border/60 px-4 py-2.5">
          <h2 className="text-sm font-medium">Alert routing</h2>
        </header>
        <div className="flex items-start gap-2.5 px-4 py-4">
          <Icon
            icon={CheckCircle}
            className="mt-px size-3.5 shrink-0 text-success-text"
          />
          <p className="text-xs text-muted-foreground">
            {activeTotal === 0
              ? 'No active monitors to route yet.'
              : `All ${activeTotal} active monitor${activeTotal === 1 ? '' : 's'} reach at least one enabled channel.`}
          </p>
        </div>
        {pausedGaps.length > 0 && (
          <p className="border-t border-border/60 px-4 py-2.5 text-[11px] text-muted-foreground">
            {pausedGaps.length} paused monitor{pausedGaps.length === 1 ? ' has' : 's have'} no
            channel — harmless until resumed.
          </p>
        )}
      </Panel>
    )
  }

  return (
    <Panel className="border-warning/40">
      <header className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-medium text-warning">
          <Icon icon={Warning} className="size-3.5 shrink-0" />
          Unrouted monitors
        </h2>
        <span className="font-mono text-[11px] tabular-nums text-warning">{gaps.length}</span>
      </header>
      <p className="border-b border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
        Checked on schedule, but a failure notifies nobody. Open one to attach a channel.
      </p>
      <ul className="divide-y divide-border/60">
        {gaps.map(({ monitor, reason }) => (
          <li key={monitor.id}>
            <Link
              to={`/admin/monitors/${monitor.id}/edit`}
              className="group flex items-center gap-2 px-4 py-2.5 outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <StatusDot monitor={monitor} />
              <span className="min-w-0 flex-1 truncate text-xs font-medium">
                {monitor.name}
              </span>
              {reason === 'disabled' ? (
                <Badge variant="warning">Channel off</Badge>
              ) : (
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {monitor.type}
                </span>
              )}
              <Icon
                icon={CaretRight}
                className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              />
            </Link>
          </li>
        ))}
      </ul>
      {pausedGaps.length > 0 && (
        <p className="border-t border-border/60 px-4 py-2.5 text-[11px] text-muted-foreground">
          {pausedGaps.length} paused monitor{pausedGaps.length === 1 ? ' also has' : 's also have'}{' '}
          no channel — harmless until resumed.
        </p>
      )}
    </Panel>
  )
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

function StatCell({
  label,
  value,
  valueSuffix,
  sub,
  tone = 'default',
  className,
}: {
  label: string
  value: string
  valueSuffix?: string
  sub: string
  tone?: 'default' | 'success' | 'destructive' | 'warn' | 'muted'
  className?: string
}) {
  const valueTone =
    tone === 'success'
      ? 'text-success-text'
      : tone === 'destructive'
        ? 'text-destructive'
        : tone === 'warn'
          ? 'text-warning'
          : tone === 'muted'
            ? 'text-muted-foreground'
            : 'text-foreground'

  return (
    <div className={cn('flex flex-col gap-2.5 p-4 sm:p-5', className)}>
      <div className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn('text-2xl font-semibold tracking-tight tabular-nums', valueTone)}>
          {value}
        </span>
        {valueSuffix && (
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {valueSuffix}
          </span>
        )}
      </div>
      {/* Two lines at narrow widths: at 390px a single clamped line cuts these
          sentences mid-thought. Matches the dashboard band from sm up. */}
      <div className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-1">{sub}</div>
    </div>
  )
}

function ChannelsSkeleton() {
  return (
    <>
      <Panel className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x divide-border/60">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2.5 p-4 sm:p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </Panel>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="divide-y divide-border/60">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-3 p-4 sm:px-5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-52" />
            </div>
          ))}
        </Panel>
        <Panel className="flex flex-col gap-3 p-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-36" />
        </Panel>
      </div>
    </>
  )
}

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
      <DialogContent>
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
            <Input
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
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as ChannelType)
                setConfig({})
              }}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="discord">Discord</SelectItem>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="ntfy">ntfy</SelectItem>
                <SelectItem value="email">Email (SMTP)</SelectItem>
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={save.isPending}>
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
        <Input
          id="ch-url"
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
        <Input
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
          <Input
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
          <Input
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
          <Input
            id="ch-to"
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
            <Input id="ch-host" value={config.smtpHost ?? ''} onChange={set('smtpHost')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-port">Port</Label>
            <Input id="ch-port" type="number" value={config.smtpPort ?? ''} onChange={set('smtpPort')} placeholder="587" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="ch-user">User</Label>
            <Input id="ch-user" value={config.smtpUser ?? ''} onChange={set('smtpUser')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-pass">Password</Label>
            <Input id="ch-pass" type="password" value={config.smtpPass ?? ''} onChange={set('smtpPass')} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ch-from">From</Label>
          <Input id="ch-from" value={config.smtpFrom ?? ''} onChange={set('smtpFrom')} placeholder="alerts@your.org" />
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
    if (config.smtpPort?.trim()) value.smtpPort = Number(config.smtpPort)
    if (config.smtpUser?.trim()) value.smtpUser = config.smtpUser.trim()
    if (config.smtpPass?.trim()) value.smtpPass = config.smtpPass
    if (config.smtpFrom?.trim()) value.smtpFrom = config.smtpFrom.trim()
    return { value }
  }
  return { error: 'Unknown type', field: 'ch-name' }
}
