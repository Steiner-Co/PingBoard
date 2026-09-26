import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/icon'
import { Warning } from "@phosphor-icons/react/dist/icons/Warning"
import { WarningCircle } from "@phosphor-icons/react/dist/icons/WarningCircle"
import { CaretDown } from "@phosphor-icons/react/dist/icons/CaretDown"
import { CaretRight } from "@phosphor-icons/react/dist/icons/CaretRight"
import { CalendarBlank } from "@phosphor-icons/react/dist/icons/CalendarBlank"
import { SealCheck } from "@phosphor-icons/react/dist/icons/SealCheck"
import { Globe } from "@phosphor-icons/react/dist/icons/Globe"
import { PlusCircle } from "@phosphor-icons/react/dist/icons/PlusCircle"
import { MagnifyingGlass } from "@phosphor-icons/react/dist/icons/MagnifyingGlass"
import { ArrowClockwise } from "@phosphor-icons/react/dist/icons/ArrowClockwise"
import { Pause } from "@phosphor-icons/react/dist/icons/Pause"
import { Play } from "@phosphor-icons/react/dist/icons/Play"
import { Trash } from "@phosphor-icons/react/dist/icons/Trash"
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Panel } from '@/components/panel'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import { QueryError } from '@/components/QueryError'
import { useConfirm } from '@/components/confirm-provider'
import { cn, formatRelative } from '@/lib/utils'
import { api } from '@/lib/api'
import { useSSE } from '@/lib/sse'
import { useNow } from '@/hooks/use-now'
import type { DomainWithFacts, NotificationChannel } from '@/types'

const DAY_MS = 86_400_000

function daysUntil(iso: string | null, now: number): number | null {
  if (!iso) return null
  return Math.floor((new Date(iso).getTime() - now) / DAY_MS)
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// User-entered fallback values live in the monitor config, used only when
// RDAP/WHOIS can't determine them itself.
function manualField(d: DomainWithFacts, key: string): string | undefined {
  const v = (d.config as Record<string, unknown> | undefined)?.[key]
  return typeof v === 'string' && v ? v : undefined
}

// Friendly DNS-provider name from the first nameserver, so the portfolio reads
// "Cloudflare" not "elliott.ns.cloudflare.com". Falls back to the base domain.
function nsProvider(ns: string[]): string | null {
  const h = ns[0]
  if (!h) return null
  const map: [RegExp, string][] = [
    [/cloudflare/, 'Cloudflare'],
    [/awsdns/, 'AWS Route 53'],
    [/nsone\.net/, 'NS1'],
    [/domaincontrol\.com/, 'GoDaddy'],
    [/googledomains|ns-cloud|google\.com/, 'Google'],
    [/azure-dns/, 'Azure DNS'],
    [/digitalocean/, 'DigitalOcean'],
    [/name-services|worldnic/, 'Network Solutions'],
    [/dnsimple/, 'DNSimple'],
    [/vercel-dns/, 'Vercel'],
    [/nsone|netlify/, 'Netlify'],
    [/registrar-servers/, 'Namecheap'],
  ]
  for (const [re, name] of map) if (re.test(h)) return name
  return h.split('.').slice(-2).join('.')
}

// A domain expiry inside the warning window, or an SSL cert about to lapse,
// is the whole reason this screen exists — colour it so it reads at a glance.
function ExpiryValue({
  iso,
  now,
  critical,
  warn,
  className,
}: {
  iso: string | null
  now: number
  critical: number
  warn: number
  className?: string
}) {
  const days = daysUntil(iso, now)
  if (days === null) {
    return <span className={cn('text-muted-foreground', className)}>—</span>
  }
  const tone =
    days < 0 || days <= critical
      ? 'text-destructive'
      : days <= warn
        ? 'text-warning'
        : 'text-foreground'
  const label =
    days < 0
      ? `Expired ${Math.abs(days)}d ago`
      : days === 0
        ? 'Today'
        : `${days} ${days === 1 ? 'day' : 'days'}`
  return (
    <span
      className={cn('tabular-nums font-medium', tone, className)}
      title={fmtDate(iso)}
    >
      {label}
    </span>
  )
}

export function DomainsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.get<{ domains: DomainWithFacts[] }>('/api/admin/domains'),
  })

  // Domain checks are heartbeats too — refresh the portfolio when one lands so
  // the expiry status and "checked" times stay live.
  useSSE('/api/admin/sse', {
    heartbeat: () => void queryClient.invalidateQueries({ queryKey: ['domains'] }),
    'incident.opened': () =>
      void queryClient.invalidateQueries({ queryKey: ['domains'] }),
    'incident.resolved': () =>
      void queryClient.invalidateQueries({ queryKey: ['domains'] }),
  })

  const now = useNow()
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<DomainWithFacts | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Channel names for the inline routing row — domains manage their own
  // alert wiring now instead of deep-linking to a monitor detail page.
  const channelsQuery = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<{ channels: NotificationChannel[] }>('/api/admin/channels'),
  })
  const channelById = useMemo(
    () => new Map((channelsQuery.data?.channels ?? []).map((c) => [c.id, c])),
    [channelsQuery.data],
  )

  const domains = query.data?.domains ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return domains
    return domains.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.target.toLowerCase().includes(q) ||
        (d.facts?.registrar ?? '').toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [domains, search])

  const summary = useMemo(() => {
    let expiringSoon = 0
    let sslSoon = 0
    let notAlerting = 0
    for (const d of domains) {
      const de = daysUntil(d.facts?.expiryAt ?? null, now)
      if (de !== null && de <= 30) expiringSoon++
      const se = daysUntil(d.facts?.sslExpiryAt ?? null, now)
      if (se !== null && se <= 14) sslSoon++
      if (d.channelIds.length === 0) notAlerting++
    }
    return { total: domains.length, expiringSoon, sslSoon, notAlerting }
  }, [domains, now])

  // Time-critical domains, soonest first — the reason this screen exists,
  // lifted out of the list so nothing about to lapse needs hunting for.
  const attention = useMemo(() => {
    return domains
      .map((d) => {
        const de = daysUntil(d.facts?.expiryAt ?? null, now)
        const se = daysUntil(d.facts?.sslExpiryAt ?? null, now)
        return {
          d,
          de: de !== null && de <= 30 ? de : null,
          se: se !== null && se <= 14 ? se : null,
        }
      })
      .filter((x) => x.de !== null || x.se !== null)
      .sort(
        (a, b) =>
          Math.min(a.de ?? Infinity, a.se ?? Infinity) -
          Math.min(b.de ?? Infinity, b.se ?? Infinity),
      )
  }, [domains, now])

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Attention rows jump to the domain in the list below — they used to link
  // to a monitor detail page, which no longer serves domains.
  const focusDomain = (id: string) => {
    setExpanded((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
    requestAnimationFrame(() => {
      document
        .getElementById(`domain-${id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Domains</h1>
        <p className="text-sm text-muted-foreground">
          Track expiry, registrar, nameservers and SSL certificates across the
          whole portfolio
        </p>
      </div>
      <Button onClick={() => setAddOpen(true)} className="gap-2 self-start sm:self-auto">
        <Icon icon={PlusCircle} className="size-4" />
        Add domain
      </Button>
    </div>
  )

  const dialogs = (
    <>
      <AddDomainDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <EditDetailsDialog domain={editing} onClose={() => setEditing(null)} />
    </>
  )

  if (query.isPending) {
    return (
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        {header}
        <DomainsSkeleton />
        {dialogs}
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        {header}
        <QueryError subject="domains" onRetry={() => void query.refetch()} />
        {dialogs}
      </div>
    )
  }

  if (domains.length === 0) {
    return (
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        {header}
        <EmptyState
          icon={Globe}
          title="No domains tracked yet"
          description="Add a domain and PingBoard keeps an eye on its expiry, registrar, nameservers and SSL certificate — and warns you before anything lapses. One place for the whole portfolio."
          action={
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Icon icon={PlusCircle} className="size-4" />
              Add your first domain
            </Button>
          }
        />
        {dialogs}
      </div>
    )
  }

  const refreshing = query.isFetching

  return (
    <div className="px-4 lg:px-6 flex flex-col gap-6">
      {header}

      <Panel className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x divide-border/60">
        <StatCell
          label="Domains"
          value={String(summary.total)}
          sub="Tracked in this instance"
          className="border-b border-border/60 lg:border-b-0 border-r lg:border-r-0"
        />
        <StatCell
          label="Expiring ≤ 30d"
          value={String(summary.expiringSoon)}
          sub="Renew before they lapse"
          tone={summary.expiringSoon > 0 ? 'warn' : 'success'}
          className="border-b border-border/60 lg:border-b-0"
        />
        <StatCell
          label="SSL ≤ 14d"
          value={String(summary.sslSoon)}
          sub="Certificates near expiry"
          tone={summary.sslSoon > 0 ? 'warn' : 'success'}
          className="border-r border-border/60 lg:border-r-0"
        />
        <StatCell
          label="Not alerting"
          value={String(summary.notAlerting)}
          sub={summary.notAlerting > 0 ? 'No channel would be paged' : 'All routed'}
          tone={summary.notAlerting > 0 ? 'warn' : 'success'}
        />
      </Panel>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Icon
            icon={MagnifyingGlass}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by domain, registrar, or tag…"
            className="pl-7"
            aria-label="Search domains"
          />
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            onClick={() => void query.refetch()}
            disabled={refreshing}
            className="gap-2"
          >
            <Icon
              icon={ArrowClockwise}
              className={cn('size-4', refreshing && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </div>

      {attention.length > 0 && (
        <Panel className="border-warning/40">
          <header className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
            <h2 className="flex items-center gap-2 text-sm font-medium text-warning">
              <Icon icon={Warning} className="size-3.5 shrink-0" />
              Expiring soon
            </h2>
            <span className="font-mono text-[11px] tabular-nums text-warning">
              {attention.length}
            </span>
          </header>
          <p className="border-b border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
            Renew before they lapse — the soonest expiry is listed first.
          </p>
          <ul className="divide-y divide-border/60">
            {attention.map(({ d, de, se }) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => focusDomain(d.id)}
                  className="group flex w-full items-center gap-3 px-4 py-2.5 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {d.name}
                  </span>
                  {de !== null && (
                    <span className="flex shrink-0 items-baseline gap-1.5">
                      <span className="text-[11px] text-muted-foreground">
                        Domain
                      </span>
                      <ExpiryValue iso={d.facts?.expiryAt ?? null} now={now} critical={7} warn={30} className="text-xs" />
                    </span>
                  )}
                  {se !== null && (
                    <span className="flex shrink-0 items-baseline gap-1.5">
                      <span className="text-[11px] text-muted-foreground">
                        SSL
                      </span>
                      <ExpiryValue iso={d.facts?.sslExpiryAt ?? null} now={now} critical={14} warn={30} className="text-xs" />
                    </span>
                  )}
                  <Icon
                    icon={CaretRight}
                    className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel>
        <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
          <h2 className="text-sm font-medium">Domains</h2>
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {filtered.length} shown
          </span>
        </header>
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Icon icon={MagnifyingGlass} className="size-5 opacity-50" />
            No domains match this filter.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((d) => (
              <DomainRow
                key={d.id}
                domain={d}
                now={now}
                open={expanded.has(d.id)}
                onToggle={() => toggle(d.id)}
                onEdit={() => setEditing(d)}
                channelById={channelById}
              />
            ))}
          </ul>
        )}
      </Panel>

      {dialogs}
    </div>
  )
}

function DomainRow({
  domain: d,
  now,
  open,
  onToggle,
  onEdit,
  channelById,
}: {
  domain: DomainWithFacts
  now: number
  open: boolean
  onToggle: () => void
  onEdit: () => void
  channelById: Map<string, NotificationChannel>
}) {
  const f = d.facts
  const status = d.paused
    ? 'paused'
    : d.latest
      ? d.latest.status
      : 'unknown'
  const provider = f ? nsProvider(f.nameservers) : null
  const isManual = manualField(d, 'manualExpiryAt') !== undefined

  return (
    <li id={`domain-${d.id}`} className="scroll-mt-24">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-4 sm:px-5 text-left outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        <Icon
          icon={open ? CaretDown : CaretRight}
          className="size-4 shrink-0 text-muted-foreground"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{d.name}</span>
            {d.channelIds.length === 0 && (
              <Badge variant="warning" className="gap-1">
                <Icon icon={WarningCircle} className="size-3.5" />
                Not alerting
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="truncate">{f?.registrar ?? 'Registrar unknown'}</span>
            {provider && (
              <>
                <span aria-hidden>·</span>
                <span>{provider}</span>
              </>
            )}
            {d.latest && (
              <>
                <span aria-hidden>·</span>
                <span>Checked {formatRelative(d.latest.checkedAt)}</span>
              </>
            )}
          </div>
          {/* Mobile: headline metrics are hidden below sm, so restate them
              inline — otherwise the point of the page is invisible on phones. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs sm:hidden">
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-[11px] text-muted-foreground">
                Domain{isManual ? ' · manual' : ''}
              </span>
              <ExpiryValue iso={f?.expiryAt ?? null} now={now} critical={7} warn={30} className="text-xs" />
            </span>
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-[11px] text-muted-foreground">
                SSL
              </span>
              <ExpiryValue iso={f?.sslExpiryAt ?? null} now={now} critical={14} warn={30} className="text-xs" />
            </span>
          </div>
        </div>

        {/* Headline metrics: domain expiry, then SSL. */}
        <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
          <span className="text-[11px] text-muted-foreground">
            Domain {isManual && '· manual'}
          </span>
          <ExpiryValue iso={f?.expiryAt ?? null} now={now} critical={7} warn={30} className="text-sm" />
        </div>
        <div className="hidden w-24 shrink-0 flex-col items-end gap-0.5 md:flex">
          <span className="text-[11px] text-muted-foreground">
            SSL
          </span>
          <ExpiryValue iso={f?.sslExpiryAt ?? null} now={now} critical={14} warn={30} className="text-sm" />
        </div>
        <div className="shrink-0">
          <StatusBadge status={status} />
        </div>
      </button>

      {open && <DomainDetail domain={d} onEdit={onEdit} channelById={channelById} />}
    </li>
  )
}

// A date fact that can be filled in by hand when auto-detection can't get it:
// shows the value + a "manual" tag + an edit link, or a "set" button if empty.
function EditableFact({
  value,
  manual,
  onEdit,
  setLabel,
}: {
  value: string | null
  manual: boolean
  onEdit: () => void
  setLabel: string
}) {
  if (!value) {
    return (
      <Button size="sm" variant="outline" onClick={onEdit} className="h-7 gap-1.5">
        <Icon icon={CalendarBlank} className="size-3.5" />
        {setLabel}
      </Button>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {fmtDate(value)}
      {manual && (
        <Badge variant="secondary" className="text-[10px]">
          manual
        </Badge>
      )}
      <button
        type="button"
        onClick={onEdit}
        className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        edit
      </button>
    </span>
  )
}

function DomainDetail({
  domain: d,
  onEdit,
  channelById,
}: {
  domain: DomainWithFacts
  onEdit: () => void
  channelById: Map<string, NotificationChannel>
}) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const f = d.facts

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['domains'] })
    void queryClient.invalidateQueries({ queryKey: ['monitors'] })
  }

  const togglePause = useMutation({
    mutationFn: (paused: boolean) =>
      api.patch(`/api/admin/monitors/${d.id}`, { paused }),
    onSuccess: (_data, paused) => {
      invalidate()
      toast.success(paused ? 'Domain checks paused' : 'Domain checks resumed')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to update'),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/admin/monitors/${d.id}`),
    onSuccess: () => {
      invalidate()
      toast.success(`Removed "${d.name}"`)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to delete'),
  })

  const attached = d.channelIds
    .map((id) => channelById.get(id))
    .filter((c) => c != null)

  const manage = (
    <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3 border-t border-border/60 pt-4">
      <Button
        size="sm"
        variant="outline"
        onClick={() => togglePause.mutate(!d.paused)}
        disabled={togglePause.isPending}
        className="gap-1.5"
      >
        <Icon icon={d.paused ? Play : Pause} className="size-3.5" />
        {d.paused ? 'Resume' : 'Pause'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onEdit}
        className="gap-1.5"
      >
        <Icon icon={CalendarBlank} className="size-3.5" />
        Edit dates
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Remove ${d.name}`}
        onClick={async () => {
          const ok = await confirm({
            title: `Remove "${d.name}"?`,
            description:
              'Expiry tracking stops and collected facts are removed. This cannot be undone.',
            confirmLabel: 'Remove domain',
            destructive: true,
          })
          if (ok) remove.mutate()
        }}
        disabled={remove.isPending}
        className="gap-1.5 text-muted-foreground"
      >
        <Icon icon={Trash} className="size-3.5" />
        Remove
      </Button>
      <span className="ml-auto text-xs text-muted-foreground">
        Checks hourly · expiry drives alerts
      </span>
    </div>
  )

  const channelsField = (
    <Field label="Alert channels" className="sm:col-span-2 lg:col-span-3">
      {attached.length === 0 ? (
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="text-warning">No channels attached</span> — expiry
            warnings go nowhere.{' '}
            <Link to="/admin/channels" className="underline underline-offset-4 hover:text-foreground">
              Add one
            </Link>
          </span>
          <DomainChannelsEditor domain={d} triggerLabel="Attach" />
        </span>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {attached.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px]"
            >
              <span
                aria-hidden
                className={cn(
                  'size-1.5 rounded-full',
                  c.enabled ? 'bg-success' : 'bg-muted-foreground/50',
                )}
              />
              <span className="max-w-[12rem] truncate">{c.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {c.type}
              </span>
            </span>
          ))}
          <DomainChannelsEditor domain={d} />
        </div>
      )}
    </Field>
  )

  const renewalField = (
    <EditableFact
      value={f?.expiryAt ?? null}
      manual={manualField(d, 'manualExpiryAt') !== undefined}
      onEdit={onEdit}
      setLabel="Set renewal date"
    />
  )

  if (!f) {
    return (
      <div className="border-t border-border/60 bg-muted/20 px-4 py-4 pl-11 sm:px-5 sm:pl-12 text-sm text-muted-foreground">
        <p>No data collected yet — details appear after the first check runs.</p>
        <div className="mt-2">{renewalField}</div>
        {d.latest?.message && (
          <span className="mt-2 block font-mono text-xs">{d.latest.message}</span>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => togglePause.mutate(!d.paused)}
            disabled={togglePause.isPending}
            className="gap-1.5"
          >
            <Icon icon={d.paused ? Play : Pause} className="size-3.5" />
            {d.paused ? 'Resume' : 'Pause'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-x-8 gap-y-4 border-t border-border/60 bg-muted/20 px-4 py-4 pl-11 sm:grid-cols-2 sm:px-5 sm:pl-12 lg:grid-cols-3">
      <Field label="Registered">
        <EditableFact
          value={f.registeredAt}
          manual={manualField(d, 'manualRegisteredAt') !== undefined}
          onEdit={onEdit}
          setLabel="Set date"
        />
      </Field>
      <Field label="Expires">{renewalField}</Field>
      <Field label="SSL issuer">
        {f.sslIssuer ? (
          <span className="inline-flex items-center gap-1.5">
            <Icon icon={SealCheck} className="size-3.5 text-muted-foreground" />
            {f.sslIssuer}
          </span>
        ) : (
          '—'
        )}
      </Field>

      <Field label="Nameservers" className="sm:col-span-2 lg:col-span-1">
        {f.nameservers.length ? (
          <ul className="space-y-0.5 font-mono text-xs">
            {f.nameservers.map((ns) => (
              <li key={ns} className="truncate">{ns}</li>
            ))}
          </ul>
        ) : (
          '—'
        )}
      </Field>

      <Field label="DNS records">
        <div className="space-y-1 font-mono text-xs">
          {f.dns?.a?.length ? (
            <div><span className="text-muted-foreground">A </span>{f.dns.a.join(', ')}</div>
          ) : null}
          {f.dns?.mx?.length ? (
            <div className="truncate"><span className="text-muted-foreground">MX </span>{f.dns.mx.join(', ')}</div>
          ) : null}
          {!f.dns?.a?.length && !f.dns?.mx?.length ? '—' : null}
        </div>
      </Field>

      <Field label="Lock status">
        {f.statuses.length ? (
          <div className="flex flex-wrap gap-1">
            {f.statuses.map((s) => (
              <Badge key={s} variant="secondary" className="font-mono text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
        ) : (
          '—'
        )}
      </Field>

      {channelsField}
      {manage}
    </div>
  )
}

function DomainChannelsEditor({ domain: d, triggerLabel = 'edit' }: { domain: DomainWithFacts; triggerLabel?: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(d.channelIds)
  const channels = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<{ channels: NotificationChannel[] }>('/api/admin/channels'),
    enabled: open,
  })

  useEffect(() => {
    if (open) setDraft(d.channelIds)
  }, [open, d.channelIds])

  const save = useMutation({
    mutationFn: (channelIds: string[]) =>
      api.patch(`/api/admin/monitors/${d.id}`, { channelIds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['domains'] })
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
      toast.success('Alert channels updated')
      setOpen(false)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to save'),
  })

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        {triggerLabel}
      </button>
    )
  }

  const chans = channels.data?.channels ?? []

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="inline-flex max-w-full flex-wrap gap-1.5 rounded-md border border-border/70 p-1.5">
        {chans.length === 0 ? (
          <span className="px-1 text-xs text-muted-foreground">
            No channels yet.{' '}
            <Link to="/admin/channels" className="underline underline-offset-4">
              Add one
            </Link>
          </span>
        ) : (
          chans.map((c) => (
            <label
              key={c.id}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-xs hover:bg-accent/40"
            >
              <Checkbox
                checked={draft.includes(c.id)}
                onCheckedChange={(v) =>
                  setDraft((prev) =>
                    v ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                  )
                }
              />
              <span className="max-w-[10rem] truncate">{c.name}</span>
            </label>
          ))
        )}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-7"
        disabled={save.isPending}
        onClick={() => save.mutate(draft)}
      >
        {save.isPending ? 'Saving…' : 'Save'}
      </Button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Cancel
      </button>
    </span>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  )
}

// Mirrors the channels/incidents stat cell. Same visual contract — mono
// micro-label, tabular value, tone ramp — kept identical on purpose.
function StatCell({
  label,
  value,
  sub,
  tone = 'default',
  className,
}: {
  label: string
  value: string
  sub: string
  tone?: 'default' | 'success' | 'warn' | 'muted'
  className?: string
}) {
  const valueTone =
    tone === 'success'
      ? 'text-success-text'
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
      </div>
      {/* Two lines at narrow widths: at 390px a single clamped line cuts these
          sentences mid-thought. Matches the channels band from sm up. */}
      <div className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-1">{sub}</div>
    </div>
  )
}

function AddDomainDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [domain, setDomain] = useState('')
  const [renewalDate, setRenewalDate] = useState<Date | undefined>(undefined)
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const domainRef = useRef<HTMLInputElement>(null)

  const channels = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<{ channels: NotificationChannel[] }>('/api/admin/channels'),
    enabled: open,
  })

  const reset = () => {
    setDomain('')
    setRenewalDate(undefined)
    setSelected([])
    setError(null)
  }

  const create = useMutation({
    mutationFn: (payload: object) => api.post('/api/admin/monitors', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['domains'] })
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
      toast.success('Domain added — first check runs shortly')
      reset()
      onClose()
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to add domain')
      domainRef.current?.focus()
    },
  })

  const normalized = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')

  const handleSubmit = () => {
    if (!normalized) {
      setError('Enter a domain, e.g. example.com')
      return
    }
    setError(null)
    create.mutate({
      name: normalized,
      type: 'domain',
      target: normalized,
      intervalSeconds: 3600, // hourly — gentle on WHOIS, plenty for expiry
      timeoutSeconds: 15, // RDAP/WHOIS + DNS + SSL round-trips
      retryCount: 2, // registry lookups are flaky
      config: renewalDate ? { manualExpiryAt: format(renewalDate, 'yyyy-MM-dd') } : {},
      tags: [],
      channelIds: selected,
    })
  }

  const chans = channels.data?.channels ?? []

  return (
    <Dialog open={open} onOpenChange={(v) => !v && (reset(), onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add domain</DialogTitle>
          <DialogDescription>
            PingBoard watches its expiry, registrar, nameservers and SSL cert.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="domain-name">Domain</Label>
            <Input
              ref={domainRef}
              id="domain-name"
              name="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'add-domain-error' : undefined}
            />
            {normalized && normalized !== domain.trim().toLowerCase() && (
              <p className="text-xs text-muted-foreground">
                Will track <span className="font-mono">{normalized}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain-renewal">
              Renewal date{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <DatePicker
              id="domain-renewal"
              value={renewalDate}
              onChange={setRenewalDate}
            />
            <p className="text-xs text-muted-foreground">
              We auto-detect this for most domains. Set it for TLDs we can't look
              up (.io, .me, .co…) or private domains.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Alert channels</Label>
            {chans.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No channels yet.{' '}
                <Link to="/admin/channels" className="underline underline-offset-4">
                  Add one
                </Link>{' '}
                to be warned before it expires.
              </p>
            ) : (
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-border/70 p-2">
                {chans.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-sm px-1.5 py-1 text-sm hover:bg-accent/40"
                  >
                    <Checkbox
                      checked={selected.includes(c.id)}
                      onCheckedChange={(v) =>
                        setSelected((prev) =>
                          v ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                        )
                      }
                    />
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {c.type}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p
              id="add-domain-error"
              role="alert"
              aria-live="polite"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => (reset(), onClose())}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Adding…' : 'Add domain'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditDetailsDialog({
  domain,
  onClose,
}: {
  domain: DomainWithFacts | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [expiry, setExpiry] = useState<Date | undefined>(undefined)
  const [registered, setRegistered] = useState<Date | undefined>(undefined)
  const [registrar, setRegistrar] = useState('')
  const [error, setError] = useState<string | null>(null)

  const hasManual =
    domain !== null &&
    (manualField(domain, 'manualExpiryAt') !== undefined ||
      manualField(domain, 'manualRegisteredAt') !== undefined ||
      manualField(domain, 'manualRegistrar') !== undefined)

  // Re-seed fields whenever the dialog targets a different domain.
  useEffect(() => {
    if (!domain) return
    const ymdToDate = (s: string | undefined): Date | undefined => {
      if (!s) return undefined
      const d = new Date(s)
      return Number.isNaN(d.getTime()) ? undefined : d
    }
    setExpiry(ymdToDate(manualField(domain, 'manualExpiryAt')))
    setRegistered(ymdToDate(manualField(domain, 'manualRegisteredAt')))
    setRegistrar(manualField(domain, 'manualRegistrar') ?? '')
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain?.id])

  const save = useMutation({
    mutationFn: (payload: object) =>
      api.patch(`/api/admin/monitors/${domain!.id}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['domains'] })
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
      toast.success('Details saved — re-checking now')
      onClose()
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : 'Failed to save'),
  })

  const submit = (clear = false) => {
    if (!domain) return
    const config = { ...(domain.config ?? {}) } as Record<string, unknown>
    const setOrDrop = (key: string, val: string) => {
      if (val) config[key] = val
      else delete config[key]
    }
    const ymd = (d: Date | undefined) =>
      d ? format(d, 'yyyy-MM-dd') : ''
    if (clear) {
      delete config.manualExpiryAt
      delete config.manualRegisteredAt
      delete config.manualRegistrar
    } else {
      setOrDrop('manualExpiryAt', ymd(expiry))
      setOrDrop('manualRegisteredAt', ymd(registered))
      setOrDrop('manualRegistrar', registrar.trim())
    }
    save.mutate({ config })
  }

  return (
    <Dialog open={domain !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Domain details</DialogTitle>
          <DialogDescription>
            {domain?.name} — fill in what we can't auto-detect. Detected values
            always take precedence over these.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-expiry">Expires on</Label>
              <DatePicker
                id="edit-expiry"
                value={expiry}
                onChange={setExpiry}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-registered">Registered on</Label>
              <DatePicker
                id="edit-registered"
                value={registered}
                onChange={setRegistered}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-registrar">Registrar</Label>
            <Input
              id="edit-registrar"
              name="registrar"
              value={registrar}
              onChange={(e) => setRegistrar(e.target.value)}
              placeholder="e.g. Namecheap"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The renewal date drives expiry alerts. Registered date and registrar
            are informational.
          </p>
          {error && (
            <p
              id="edit-domain-error"
              role="alert"
              aria-live="polite"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <DialogFooter className="sm:justify-between">
            {hasManual ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => submit(true)}
                disabled={save.isPending}
                className="text-muted-foreground"
              >
                Clear all
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DomainsSkeleton() {
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-full sm:max-w-xs" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Panel className="divide-y divide-border/60">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4 sm:px-5">
            <Skeleton className="size-4" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </Panel>
    </>
  )
}
