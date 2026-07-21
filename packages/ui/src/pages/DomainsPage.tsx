import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Certificate01Icon,
  Globe02Icon,
  PlusSignCircleIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Panel } from '@/components/panel'
import { StatusBadge } from '@/components/StatusBadge'
import { QueryError } from '@/components/QueryError'
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

  if (query.isPending) return <DomainsSkeleton />
  if (query.isError) {
    return (
      <div className="px-4 lg:px-6">
        <QueryError subject="domains" onRetry={() => void query.refetch()} />
      </div>
    )
  }
  if (domains.length === 0) {
    return (
      <>
        <EmptyDomains onAdd={() => setAddOpen(true)} />
        <AddDomainDialog open={addOpen} onClose={() => setAddOpen(false)} />
      </>
    )
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <>
      <div className="px-4 lg:px-6">
        <Panel className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x divide-border/60">
          <Stat label="Domains" value={summary.total} sub="Tracked in this instance" />
          <Stat
            label="Expiring ≤ 30d"
            value={summary.expiringSoon}
            sub="Renew before they lapse"
            tone={summary.expiringSoon > 0 ? 'warn' : 'muted'}
          />
          <Stat
            label="SSL ≤ 14d"
            value={summary.sslSoon}
            sub="Certificates near expiry"
            tone={summary.sslSoon > 0 ? 'warn' : 'muted'}
          />
          <Stat
            label="Not alerting"
            value={summary.notAlerting}
            sub={summary.notAlerting > 0 ? 'No channel would be paged' : 'All routed'}
            tone={summary.notAlerting > 0 ? 'warn' : 'muted'}
          />
        </Panel>
      </div>

      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <HugeiconsIcon
              icon={Search01Icon}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
              strokeWidth={2}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by domain, registrar, or tag…"
              className="pl-7"
              aria-label="Search domains"
            />
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2 self-start sm:self-auto">
            <HugeiconsIcon icon={PlusSignCircleIcon} className="h-4 w-4" />
            Add domain
          </Button>
        </div>

        <Panel>
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No domains match “{search}”.
            </p>
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
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <AddDomainDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <EditDetailsDialog domain={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function DomainRow({
  domain: d,
  now,
  open,
  onToggle,
  onEdit,
}: {
  domain: DomainWithFacts
  now: number
  open: boolean
  onToggle: () => void
  onEdit: () => void
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
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40"
      >
        <HugeiconsIcon
          icon={open ? ArrowDown01Icon : ArrowRight01Icon}
          className="h-4 w-4 shrink-0 text-muted-foreground"
          strokeWidth={2}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{d.name}</span>
            {d.channelIds.length === 0 && (
              <Badge variant="warning" className="gap-1">
                <HugeiconsIcon icon={AlertCircleIcon} className="h-3 w-3" strokeWidth={2} />
                Not alerting
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
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
        </div>

        {/* Headline metrics: domain expiry, then SSL. */}
        <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Domain {isManual && '· manual'}
          </span>
          <ExpiryValue iso={f?.expiryAt ?? null} now={now} critical={7} warn={30} className="text-sm" />
        </div>
        <div className="hidden w-24 shrink-0 flex-col items-end gap-0.5 md:flex">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            SSL
          </span>
          <ExpiryValue iso={f?.sslExpiryAt ?? null} now={now} critical={14} warn={30} className="text-sm" />
        </div>
        <div className="shrink-0">
          <StatusBadge status={status} />
        </div>
      </button>

      {open && <DomainDetail domain={d} onEdit={onEdit} />}
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
        <HugeiconsIcon icon={Calendar03Icon} className="h-3.5 w-3.5" strokeWidth={2} />
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
}: {
  domain: DomainWithFacts
  onEdit: () => void
}) {
  const f = d.facts

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
      <div className="border-t border-border/60 bg-muted/20 px-4 py-4 pl-11 text-sm text-muted-foreground">
        <p>No data collected yet — details appear after the first check runs.</p>
        <div className="mt-2">{renewalField}</div>
        {d.latest?.message && (
          <span className="mt-2 block font-mono text-xs">{d.latest.message}</span>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-x-8 gap-y-4 border-t border-border/60 bg-muted/20 px-4 py-4 pl-11 sm:grid-cols-2 lg:grid-cols-3">
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
            <HugeiconsIcon icon={Certificate01Icon} className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
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

      <div className="flex items-end sm:col-span-2 lg:col-span-3">
        <Link
          to={`/admin/monitors/${d.id}`}
          className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Open check settings (interval, channels, pause) →
        </Link>
      </div>
    </div>
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
      <div className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: number
  sub: string
  tone?: 'default' | 'warn' | 'muted'
}) {
  const valueTone =
    tone === 'warn'
      ? 'text-warning'
      : tone === 'muted'
        ? 'text-foreground'
        : 'text-foreground'
  return (
    <div className="flex flex-col gap-2.5 p-4 sm:p-5">
      <div className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn('text-3xl font-semibold tracking-tight tabular-nums', valueTone)}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground line-clamp-1">{sub}</div>
    </div>
  )
}

function AddDomainDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [domain, setDomain] = useState('')
  const [renewalDate, setRenewalDate] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const channels = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<{ channels: NotificationChannel[] }>('/api/admin/channels'),
    enabled: open,
  })

  const reset = () => {
    setDomain('')
    setRenewalDate('')
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
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add domain'),
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
      config: renewalDate ? { manualExpiryAt: renewalDate } : {},
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain-name">Domain</Label>
            <Input
              id="domain-name"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="example.com"
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
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
            <Input
              id="domain-renewal"
              type="date"
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.target.value)}
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
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-none border border-border/70 p-2">
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
                    <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {c.type}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => (reset(), onClose())}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? 'Adding…' : 'Add domain'}
          </Button>
        </DialogFooter>
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
  const [expiry, setExpiry] = useState('')
  const [registered, setRegistered] = useState('')
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
    setExpiry((manualField(domain, 'manualExpiryAt') ?? '').slice(0, 10))
    setRegistered((manualField(domain, 'manualRegisteredAt') ?? '').slice(0, 10))
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
    if (clear) {
      delete config.manualExpiryAt
      delete config.manualRegisteredAt
      delete config.manualRegistrar
    } else {
      setOrDrop('manualExpiryAt', expiry)
      setOrDrop('manualRegisteredAt', registered)
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-expiry">Expires on</Label>
              <Input
                id="edit-expiry"
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-registered">Registered on</Label>
              <Input
                id="edit-registered"
                type="date"
                value={registered}
                onChange={(e) => setRegistered(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-registrar">Registrar</Label>
            <Input
              id="edit-registrar"
              value={registrar}
              onChange={(e) => setRegistrar(e.target.value)}
              placeholder="e.g. Namecheap"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The renewal date drives expiry alerts. Registered date and registrar
            are informational.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="sm:justify-between">
          {hasManual ? (
            <Button
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
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => submit()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EmptyDomains({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="px-4 lg:px-6">
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 rounded-none border border-dashed bg-card/50 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <HugeiconsIcon icon={Globe02Icon} className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">No domains tracked yet</h2>
          <p className="text-sm text-muted-foreground">
            Add a domain and PingBoard keeps an eye on its expiry, registrar,
            nameservers and SSL certificate — and warns you before anything
            lapses. One place for the whole portfolio.
          </p>
        </div>
        <Button onClick={onAdd} className="gap-2">
          <HugeiconsIcon icon={PlusSignCircleIcon} className="h-4 w-4" />
          Add your first domain
        </Button>
      </div>
    </div>
  )
}

function DomainsSkeleton() {
  return (
    <>
      <div className="px-4 lg:px-6">
        <Panel className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x divide-border/60">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2.5 p-4 sm:p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </Panel>
      </div>
      <div className="px-4 lg:px-6">
        <Panel className="divide-y divide-border/60">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="h-4 w-4" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </Panel>
      </div>
    </>
  )
}
