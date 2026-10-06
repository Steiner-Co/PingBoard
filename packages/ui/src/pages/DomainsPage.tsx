import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { format } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/icon'
import { Warning } from "@phosphor-icons/react/dist/icons/Warning"
import { CaretRight } from "@phosphor-icons/react/dist/icons/CaretRight"
import { CalendarBlank } from "@phosphor-icons/react/dist/icons/CalendarBlank"
import { SealCheck } from "@phosphor-icons/react/dist/icons/SealCheck"
import { Globe } from "@phosphor-icons/react/dist/icons/Globe"
import { PlusCircle } from "@phosphor-icons/react/dist/icons/PlusCircle"
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
import { EmptyState } from '@/components/EmptyState'
import { QueryError } from '@/components/QueryError'
import { ScreenHeader } from '@/components/screen'
import { useConfirm } from '@/components/confirm-provider'
import { usePrimaryAction } from '@/contexts/primary-action'
import { cn, formatRelative } from '@/lib/utils'
import { api } from '@/lib/api'
import { useSSE } from '@/lib/sse'
import { useNow } from '@/hooks/use-now'
import type { DomainWithFacts, NotificationChannel } from '@/types'

const DAY_MS = 86_400_000

type DomainStatus = 'up' | 'down' | 'disabled' | 'pending'

// Check-state bucket shared with the Monitors table: anything that isn't
// cleanly up or down reads as disabled there.
function checkStatus(d: DomainWithFacts): DomainStatus {
  if (d.paused) return 'disabled'
  if (!d.latest) return 'pending'
  if (d.latest.status === 'up') return 'up'
  if (d.latest.status === 'down') return 'down'
  return 'disabled'
}

// Card-level urgency: expired first, then anything due within its warning
// window. Calm domains keep their API order (stable sort).
function urgencyKey(d: DomainWithFacts, now: number): number {
  const de = daysUntil(d.facts?.expiryAt ?? null, now)
  const se = daysUntil(d.facts?.sslExpiryAt ?? null, now)
  return Math.min(
    de !== null && de <= 30 ? de : Infinity,
    se !== null && se <= 14 ? se : Infinity,
  )
}

function urgencyTone(d: DomainWithFacts, now: number): 'expired' | 'soon' | null {
  const de = daysUntil(d.facts?.expiryAt ?? null, now)
  if (de !== null && de < 0) return 'expired'
  const se = daysUntil(d.facts?.sslExpiryAt ?? null, now)
  if ((de !== null && de <= 30) || (se !== null && se <= 14)) return 'soon'
  return null
}

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
  const { setAction: setPrimaryAction } = usePrimaryAction()
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<DomainWithFacts | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // The shell's lime action belongs to this screen while mounted.
  useEffect(() => {
    setPrimaryAction({ label: 'Add domain', onClick: () => setAddOpen(true) })
    return () => setPrimaryAction(null)
  }, [setPrimaryAction])

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

  // Urgent renewals first; calm domains keep their API order.
  const ordered = useMemo(
    () => [...domains].sort((a, b) => urgencyKey(a, now) - urgencyKey(b, now)),
    [domains, now],
  )

  // Resolved against live data so pause/remove inside the modal never
  // render a stale copy — deleting the domain closes the modal.
  const selected = selectedId
    ? (domains.find((d) => d.id === selectedId) ?? null)
    : null

  const header = (
    <ScreenHeader
      title="Domains"
      description="Track expiry, registrar, nameservers and SSL certificates across the whole portfolio"
    />
  )

  const dialogs = (
    <>
      <AddDomainDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <EditDetailsDialog domain={editing} onClose={() => setEditing(null)} />
    </>
  )

  if (query.isPending) {
    return (
      <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
        {header}
        <DomainsSkeleton />
        {dialogs}
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
        {header}
        <QueryError subject="domains" onRetry={() => void query.refetch()} />
        {dialogs}
      </div>
    )
  }

  if (domains.length === 0) {
    return (
      <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
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
    <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
      {header}

      <div>
        <ul className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ordered.map((d) => (
            <DomainRow
              key={d.id}
              domain={d}
              now={now}
              onOpen={() => setSelectedId(d.id)}
            />
          ))}
        </ul>
      </div>

      <DomainDetailDialog
        domain={selected}
        now={now}
        onClose={() => setSelectedId(null)}
        onEdit={() => selected && setEditing(selected)}
        channelById={channelById}
      />
      {dialogs}
    </div>
  )
}

function DomainRow({
  domain: d,
  now,
  onOpen,
}: {
  domain: DomainWithFacts
  now: number
  onOpen: () => void
}) {
  const f = d.facts
  const status = checkStatus(d)
  const provider = f ? nsProvider(f.nameservers) : null
  const isManual = manualField(d, 'manualExpiryAt') !== undefined
  const de = daysUntil(f?.expiryAt ?? null, now)
  const heroCaption =
    de === null ? 'Domain expiry' : de < 0 ? 'Overdue' : 'Until renewal'
  const tone = urgencyTone(d, now)

  return (
    <li>
      <div className={cn(
        'overflow-hidden rounded-2xl border bg-card transition-colors',
        tone === 'expired' ? 'border-destructive/40' : tone === 'soon' ? 'border-warning/40' : 'border-border',
      )}>
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          className="flex w-full flex-col gap-1.5 p-5 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30"
        >
          <div className="flex w-full items-center gap-2">
            <span
              aria-hidden
              className={cn(
                'size-2 shrink-0 rounded-full',
                status === 'up' && 'bg-success',
                status === 'down' && 'bg-destructive',
                (status === 'disabled' || status === 'pending') && 'bg-muted-foreground/50',
              )}
            />
            <span className="truncate text-[15px] font-semibold tracking-tight">{d.name}</span>
            {d.channelIds.length === 0 && (
              <Badge variant="warning" className="gap-1 shrink-0">
                <Icon icon={Warning} className="size-3.5" />
                Not alerting
              </Badge>
            )}
            <Icon
              icon={CaretRight}
              className="ml-auto size-4 shrink-0 text-muted-foreground"
            />
          </div>
          <div className="truncate text-[13px] text-muted-foreground">
            {f?.registrar ?? 'Registrar unknown'}
            {provider ? ` · ${provider}` : ''}
          </div>
          <div className="mt-2 text-[30px] font-semibold leading-none tracking-tight tabular-nums">
            <ExpiryValue iso={f?.expiryAt ?? null} now={now} critical={7} warn={30} />
          </div>
          <div className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {heroCaption}
            {isManual ? ' · manual' : ''}
          </div>
          <div className="mt-2 flex w-full items-center justify-between gap-3 border-t border-border/60 pt-3">
            <span className="inline-flex items-baseline gap-1.5 text-[13px]">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                SSL
              </span>
              <ExpiryValue iso={f?.sslExpiryAt ?? null} now={now} critical={14} warn={30} className="font-semibold" />
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {d.latest ? `Checked ${formatRelative(d.latest.checkedAt)}` : 'Not checked yet'}
            </span>
          </div>
        </button>
      </div>
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
    <span className="inline-flex flex-nowrap items-center gap-2 whitespace-nowrap">
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
  now,
  onEdit,
  channelById,
}: {
  domain: DomainWithFacts
  now: number
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
    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
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
    <>
      {attached.length === 0 ? (
        <div className="space-y-2.5">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-warning">No channels attached</span>
            {' '}— expiry warnings go nowhere.
          </p>
          <DomainChannelsEditor domain={d} triggerLabel="Attach channels" prominent />
        </div>
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
    </>
  )

  const renewalField = (
    <EditableFact
      value={f?.expiryAt ?? null}
      manual={manualField(d, 'manualExpiryAt') !== undefined}
      onEdit={onEdit}
      setLabel="Set renewal date"
    />
  )

  // Hero strip — the two countdowns that answer the modal at a glance.
  const de = daysUntil(f?.expiryAt ?? null, now)
  const se = daysUntil(f?.sslExpiryAt ?? null, now)
  const hero = (
    <div className="grid gap-4 rounded-2xl bg-muted/60 p-5 sm:grid-cols-2">
      <div>
        <div className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Domain
        </div>
        <div className="mt-1 text-[28px] font-semibold leading-none tracking-tight tabular-nums">
          <ExpiryValue iso={f?.expiryAt ?? null} now={now} critical={7} warn={30} />
        </div>
        <div className="mt-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {de === null ? 'expiry unknown' : de < 0 ? 'overdue' : 'until renewal'}
          {manualField(d, 'manualExpiryAt') !== undefined ? ' · manual' : ''}
        </div>
      </div>
      <div className="border-t border-border/60 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
        <div className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          SSL
        </div>
        <div className="mt-1 text-[28px] font-semibold leading-none tracking-tight tabular-nums">
          <ExpiryValue iso={f?.sslExpiryAt ?? null} now={now} critical={14} warn={30} />
        </div>
        <div className="mt-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {se === null ? 'no certificate' : se < 0 ? 'expired' : 'until renewal'}
        </div>
      </div>
    </div>
  )

  if (!f) {
    return (
      <div className="space-y-4">
        <Rise step={1}>{hero}</Rise>
        <p className="text-sm text-muted-foreground">
          No data collected yet — details appear after the first check runs.
        </p>
        <div>{renewalField}</div>
        {d.latest?.message && (
          <span className="block font-mono text-xs">{d.latest.message}</span>
        )}
        <div className="flex flex-wrap items-center gap-2">
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
    <div className="space-y-6">
      <Rise step={1}>{hero}</Rise>

      <div className="grid items-start gap-6 sm:grid-cols-2">
        <div className="min-w-0">
          <Rise step={2}>
          <section>
            <h3 className="mb-1 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Registration
            </h3>
            <dl className="divide-y divide-border/60 border-y border-border/60">
              <FactRow label="Registered">
                <EditableFact
                  value={f.registeredAt}
                  manual={manualField(d, 'manualRegisteredAt') !== undefined}
                  onEdit={onEdit}
                  setLabel="Set date"
                />
              </FactRow>
              <FactRow label="Expires">{renewalField}</FactRow>
              <FactRow label="Registrar">{f.registrar ?? '—'}</FactRow>
            </dl>
          </section>
          </Rise>
        </div>

        <Rise step={3}>
        <section className="min-w-0">
          <h3 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Alerts
          </h3>
          {channelsField}
        </section>
        </Rise>
      </div>

      <Rise step={4}>
      <section className="min-w-0">
        <h3 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          DNS & security
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <span className="shrink-0 text-[13px] text-muted-foreground">SSL issuer</span>
            {f.sslIssuer ? (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium">
                <Icon icon={SealCheck} className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{f.sslIssuer}</span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="text-[13px] text-muted-foreground">Nameservers</div>
            {f.nameservers.length ? (
              <ul className="grid gap-x-6 gap-y-0.5 font-mono text-xs sm:grid-cols-2">
                {f.nameservers.map((ns) => (
                  <li key={ns} className="truncate">{ns}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">—</div>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="text-[13px] text-muted-foreground">DNS records</div>
            <div className="space-y-1 font-mono text-xs">
              {f.dns?.a?.length ? (
                <div><span className="text-muted-foreground">A </span>{f.dns.a.join(', ')}</div>
              ) : null}
              {f.dns?.mx?.length ? (
                <div><span className="text-muted-foreground">MX </span>{f.dns.mx.join(', ')}</div>
              ) : null}
              {!f.dns?.a?.length && !f.dns?.mx?.length ? '—' : null}
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="text-[13px] text-muted-foreground">Lock status</div>
            {f.statuses.length ? (
              <div className="flex flex-wrap gap-1">
                {f.statuses.map((s) => (
                  <Badge key={s} variant="secondary" className="font-mono text-[10px]">
                    {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">—</div>
            )}
          </div>
        </div>
      </section>
      </Rise>

      <Rise step={5}>{manage}</Rise>
    </div>
  )
}

function FactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium">{children}</dd>
    </div>
  )
}

// Entrance choreography for the detail modal: hero lands first, groups
// cascade after it. Motion-driven (not CSS) so delays are exact.
function Rise({
  step = 0,
  className,
  children,
}: {
  step?: number
  className?: string
  children: ReactNode
}) {
  const reduceMotion = useReducedMotion() ?? false
  if (reduceMotion) return <div className={className}>{children}</div>
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1], delay: step * 0.04 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function DomainDetailDialog({
  domain,
  now,
  onClose,
  onEdit,
  channelById,
}: {
  domain: DomainWithFacts | null
  now: number
  onClose: () => void
  onEdit: () => void
  channelById: Map<string, NotificationChannel>
}) {
  const provider = domain?.facts ? nsProvider(domain.facts.nameservers) : null
  return (
    <Dialog open={domain !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
        {domain && (
          <>
            <Rise step={0}>
            <DialogHeader>
              <DialogTitle>{domain.name}</DialogTitle>
              <DialogDescription>
                {domain.facts?.registrar ?? 'Registrar unknown'}
                {provider ? ` · ${provider}` : ''}
              </DialogDescription>
            </DialogHeader>
            </Rise>
            <DomainDetail domain={domain} now={now} onEdit={onEdit} channelById={channelById} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DomainChannelsEditor({ domain: d, triggerLabel = 'edit', prominent = false }: { domain: DomainWithFacts; triggerLabel?: string; prominent?: boolean }) {
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
    if (prominent) {
      return (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
          {triggerLabel}
        </Button>
      )
    }
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
            <Button
              type="submit"
              disabled={create.isPending}
              className="border-transparent bg-[var(--lime)] font-semibold text-[var(--lime-ink)] hover:bg-[var(--lime-hover)]"
            >
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
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-[52px] w-80 rounded-full" />
        <div className="ml-auto flex items-center gap-2.5">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-10 w-[153px] rounded-full" />
        </div>
      </div>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-[18px] w-40" />
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-[30px] w-32" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </>
  )
}
