import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { Checkbox } from '@/components/ui/checkbox'
import ArrowDown from '@solar-icons/react/csr/arrows/ArrowDown'
import ArrowUp from '@solar-icons/react/csr/arrows/ArrowUp'
import CheckCircle from '@solar-icons/react/csr/ui/CheckCircle'
import Copy from '@solar-icons/react/csr/ui/Copy'
import Pen from '@solar-icons/react/csr/messages/Pen'
import SquareArrowRightUp from '@solar-icons/react/csr/arrows/SquareArrowRightUp'
import LockPassword from '@solar-icons/react/csr/security/LockPassword'
import MenuDots from '@solar-icons/react/csr/ui/MenuDots'
import AddSquare from '@solar-icons/react/csr/ui/AddSquare'
import DangerTriangle from '@solar-icons/react/csr/ui/DangerTriangle'
import TrashBinTrash from '@solar-icons/react/csr/ui/TrashBinTrash'
import Global from '@solar-icons/react/csr/map/Global'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import type { Monitor, MonitorWithLatest, StatusPage, Theme } from '@/types'

// Sort: selected monitors in their explicit `order` first, then unselected
// monitors after. Lets the user see the live ordering while still being able
// to pick from the full pool.
function orderedMonitorList(
  monitors: Monitor[],
  order: string[],
): Monitor[] {
  const ordered: Monitor[] = []
  for (const id of order) {
    const m = monitors.find((x) => x.id === id)
    if (m) ordered.push(m)
  }
  for (const m of monitors) {
    if (!order.includes(m.id)) ordered.push(m)
  }
  return ordered
}

interface LinkedMonitor {
  statusPageId: string
  monitorId: string
  groupName: string | null
  sortOrder: number
}

interface PageDetail {
  page: StatusPage
  monitors: LinkedMonitor[]
}

interface PageHealth {
  up: number
  down: number
  /** Paused, pending, or degraded — nothing to alert on, not fully green. */
  other: number
}

export function StatusPagesPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [passwordTarget, setPasswordTarget] = useState<StatusPage | null>(null)
  const [editTarget, setEditTarget] = useState<StatusPage | null>(null)
  // When the user fixes a coverage gap we open the edit dialog with that
  // monitor already ticked, so "Add to page" is one click instead of a hunt.
  const [presetMonitorId, setPresetMonitorId] = useState<string | null>(null)

  const pages = useQuery({
    queryKey: ['pages'],
    queryFn: () => api.get<{ pages: StatusPage[] }>('/api/admin/pages'),
  })

  // Typed with `latest` so each page row can show live aggregate health.
  const monitors = useQuery({
    queryKey: ['monitors'],
    queryFn: () => api.get<{ monitors: MonitorWithLatest[] }>('/api/admin/monitors'),
  })

  const pageList = pages.data?.pages ?? []

  // Per-page monitor links. `/api/admin/pages` only carries a count, so the
  // union of published monitors — the thing that reveals a coverage gap —
  // has to come from the detail endpoint. Same query key the edit dialog
  // uses, so these double as a warm cache for it.
  const details = useQueries({
    queries: pageList.map((p) => ({
      queryKey: ['page', p.id],
      queryFn: () => api.get<PageDetail>(`/api/admin/pages/${p.id}`),
    })),
  })

  const publishedIds = new Set<string>()
  for (const d of details) {
    for (const m of d.data?.monitors ?? []) publishedIds.add(m.monitorId)
  }
  const coverageReady =
    details.length === pageList.length && details.every((d) => d.data != null)

  const allMonitors = monitors.data?.monitors ?? []
  const statusById = new Map(allMonitors.map((m) => [m.id, m]))
  // Aggregate live health per page — the answer to "is the page my users see
  // green right now?" without opening each page.
  const healthByPageId = new Map<string, PageHealth>()
  pageList.forEach((p, i) => {
    const linked = details[i]?.data?.monitors
    if (!linked) return
    const health: PageHealth = { up: 0, down: 0, other: 0 }
    for (const l of linked) {
      const m = statusById.get(l.monitorId)
      if (!m || m.paused || !m.latest) health.other++
      else if (m.latest.status === 'up') health.up++
      else if (m.latest.status === 'down') health.down++
      else health.other++
    }
    healthByPageId.set(p.id, health)
  })
  const unpublished = coverageReady
    ? allMonitors
        .filter((m) => !publishedIds.has(m.id))
        // Live monitors first — a paused monitor missing from a page is a
        // much smaller deal than a running one nobody can see.
        .sort((a, b) => Number(a.paused) - Number(b.paused))
    : []

  const protectedCount = pageList.filter((p) => p.passwordSet).length

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/pages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      toast.success('Status page deleted')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to delete'),
  })

  const updatePassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string | null }) =>
      api.patch(`/api/admin/pages/${id}`, { password }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['pages'] })
      toast.success(vars.password ? 'Password updated' : 'Password protection removed')
      setPasswordTarget(null)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to update password'),
  })

  const closeEdit = () => {
    setEditTarget(null)
    setPresetMonitorId(null)
  }

  return (
    <div className="px-4 lg:px-6 flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Status pages</h1>
          <p className="text-sm text-muted-foreground">
            Public dashboards you can share with users
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 self-start sm:self-auto">
          <Icon icon={AddSquare} className="h-4 w-4" />
          Create page
        </Button>
      </div>

      {pages.isError ? (
        <QueryError subject="status pages" onRetry={() => void pages.refetch()} />
      ) : pages.isLoading ? (
        <PagesSkeleton />
      ) : pageList.length === 0 ? (
        <EmptyState
          icon={Global}
          title="No status pages yet"
          description="Create a public page to share live status with users, customers, or stakeholders. Each page can list a custom subset of your monitors."
          action={
            <Button onClick={() => setOpen(true)}>
              <Icon icon={AddSquare} className="h-4 w-4" />
              Create your first page
            </Button>
          }
        />
      ) : (
        <>
          <Panel className="grid grid-cols-2 lg:divide-x divide-border/60">
            <StatCell
              label="Status pages"
              value={String(pageList.length)}
              sub={
                protectedCount === 0
                  ? 'All publicly reachable'
                  : `${pageList.length - protectedCount} public · ${protectedCount} protected`
              }
              className="border-r border-border/60 lg:border-r-0"
            />
            <StatCell
              label="Monitors published"
              value={coverageReady ? String(publishedIds.size) : '—'}
              valueSuffix={coverageReady ? `/ ${allMonitors.length}` : undefined}
              sub="Listed on at least one page"
            />
          </Panel>

          {coverageReady && unpublished.length > 0 && (
            <CoverageBanner
              unpublished={unpublished}
              pages={pageList}
              onAddToPage={(page, monitorId) => {
                setPresetMonitorId(monitorId)
                setEditTarget(page)
              }}
            />
          )}

          <Panel>
            <header className="flex items-baseline justify-between gap-4 border-b border-border/60 px-4 py-2.5">
              <h2 className="text-sm font-medium">Pages</h2>
              <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground tabular-nums">
                {pageList.length} total
              </span>
            </header>
            <div className="divide-y divide-border/60">
              {pageList.map((p) => (
                <PageRow
                  key={p.id}
                  page={p}
                  health={healthByPageId.get(p.id) ?? null}
                  onEdit={() => {
                    setPresetMonitorId(null)
                    setEditTarget(p)
                  }}
                  onSetPassword={() => setPasswordTarget(p)}
                  onRemovePassword={async () => {
                    const ok = await confirm({
                      title: `Remove password from "${p.title}"?`,
                      description:
                        'Anyone with the URL will be able to view this status page.',
                      confirmLabel: 'Remove password',
                      destructive: true,
                    })
                    if (ok) updatePassword.mutate({ id: p.id, password: null })
                  }}
                  onDelete={async () => {
                    const ok = await confirm({
                      title: `Delete "${p.title}"?`,
                      description:
                        'The page at this slug will become unreachable. Linked monitors stay intact.',
                      confirmLabel: 'Delete page',
                      destructive: true,
                    })
                    if (ok) deleteMutation.mutate(p.id)
                  }}
                />
              ))}
            </div>
          </Panel>

        </>
      )}

      <PageDialog open={open} onClose={() => setOpen(false)} />
      <EditPageDialog
        page={editTarget}
        presetMonitorId={presetMonitorId}
        onClose={closeEdit}
      />
      <PasswordDialog
        page={passwordTarget}
        onClose={() => setPasswordTarget(null)}
        onSubmit={(password) =>
          passwordTarget &&
          updatePassword.mutate({ id: passwordTarget.id, password })
        }
        pending={updatePassword.isPending}
      />
    </div>
  )
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
        <span
          className={cn(
            'text-2xl font-semibold tracking-tight tabular-nums',
            valueTone,
          )}
        >
          {value}
        </span>
        {valueSuffix && (
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {valueSuffix}
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground line-clamp-1">{sub}</div>
    </div>
  )
}

function PagesSkeleton() {
  return (
    <>
      <Panel className="grid grid-cols-2 lg:divide-x divide-border/60">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-2.5 p-4 sm:p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </Panel>
      <Panel>
        <div className="divide-y divide-border/60">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}

function PageRow({
  page,
  health,
  onEdit,
  onSetPassword,
  onRemovePassword,
  onDelete,
}: {
  page: StatusPage
  health: PageHealth | null
  onEdit: () => void
  onSetPassword: () => void
  onRemovePassword: () => void
  onDelete: () => void
}) {
  const count = page.monitorCount ?? 0

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium truncate">{page.title}</span>
          {page.passwordSet && (
            <Badge variant="warning" className="gap-1">
              <Icon
                icon={LockPassword}
                className="h-3.5 w-3.5"
              />
              Password
            </Badge>
          )}
        </div>

        <PublicUrl slug={page.slug} />

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className={cn('tabular-nums', count === 0 && 'text-warning')}>
            {count === 0 ? 'No monitors' : `${count} ${count === 1 ? 'monitor' : 'monitors'}`}
          </span>
          <span aria-hidden>·</span>
          <span>Theme {page.theme}</span>
          <span aria-hidden>·</span>
          <span>{page.passwordSet ? 'Protected' : 'Public'}</span>
        </div>

        {health && count > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span
              aria-hidden
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                health.down > 0
                  ? 'bg-destructive'
                  : health.up > 0 && health.other === 0
                    ? 'bg-success'
                    : health.up > 0
                      ? 'bg-warning'
                      : 'bg-muted-foreground/50',
              )}
            />
            <span className="tabular-nums text-muted-foreground">
              {health.up} up
              {health.down > 0 && (
                <span className="text-destructive"> · {health.down} down</span>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" variant="outline" asChild>
          <a href={`/${page.slug}`} target="_blank" rel="noreferrer">
            <Icon icon={SquareArrowRightUp} className="h-3.5 w-3.5" />
            View
          </a>
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Icon icon={Pen} className="h-3.5 w-3.5" />
          Edit
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`More actions for ${page.title}`}
            >
              <Icon
                icon={MenuDots}
                className="h-3.5 w-3.5"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onSetPassword}>
              <Icon icon={LockPassword} className="h-3.5 w-3.5" />
              {page.passwordSet ? 'Change password' : 'Set password'}
            </DropdownMenuItem>
            {page.passwordSet && (
              <DropdownMenuItem onSelect={onRemovePassword}>
                Remove password
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Icon icon={TrashBinTrash} className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// The public URL is the whole point of a status page, so it's shown in full
// and copies on click rather than hiding behind a "View" button.
function PublicUrl({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const url = `${origin}/${slug}`

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      aria-label={`Copy public URL for /${slug}`}
      className="group inline-flex max-w-full items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-2 py-1 font-mono text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="truncate text-muted-foreground">{origin}</span>
      <span className="-ml-2 truncate font-medium text-foreground">/{slug}</span>
      <Icon
        icon={copied ? CheckCircle : Copy}
        className={cn(
          'h-3.5 w-3.5 shrink-0 transition-colors',
          copied ? 'text-success-text' : 'text-muted-foreground/70',
        )}
      />
      <span className="sr-only">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

function CoverageBanner({
  unpublished,
  pages,
  onAddToPage,
}: {
  unpublished: Monitor[]
  pages: StatusPage[]
  onAddToPage: (page: StatusPage, monitorId: string) => void
}) {
  return (
    <Panel className="border-warning/40">
      <header className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-medium text-warning">
          <Icon icon={DangerTriangle} className="size-3.5 shrink-0" />
          Hidden monitors
        </h2>
        <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-warning tabular-nums">
          {unpublished.length} not on any page
        </span>
      </header>
      <p className="border-b border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
        Customers can&apos;t see {unpublished.length === 1 ? 'its' : 'their'}{' '}
        status. Add {unpublished.length === 1 ? 'it' : 'them'} to a page:
      </p>
      <ul className="divide-y divide-border/60">
        {unpublished.map((m) => (
          <li key={m.id} className="flex items-center gap-2.5 px-4 py-2.5">
            <Link
              to={`/admin/monitors/${m.id}`}
              className="min-w-0 flex-1 truncate text-xs font-medium hover:underline underline-offset-4"
            >
              {m.name}
            </Link>
            {m.paused && <Badge variant="secondary">Paused</Badge>}
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {m.type}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="shrink-0">
                  <Icon icon={AddSquare} className="h-3.5 w-3.5" />
                  Add to page
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Add to status page</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {pages.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onSelect={() => onAddToPage(p, m.id)}
                  >
                    {p.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function PasswordDialog({
  page,
  onClose,
  onSubmit,
  pending,
}: {
  page: StatusPage | null
  onClose: () => void
  onSubmit: (password: string) => void
  pending: boolean
}) {
  const [password, setPassword] = useState('')
  const open = !!page

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setPassword('')
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {page?.passwordSet ? 'Change password' : 'Set password'}
          </DialogTitle>
          <DialogDescription>
            Visitors will need this password to view{' '}
            <span className="font-mono">/{page?.slug}</span>. Cookies are issued
            for 30 days.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (password.trim()) onSubmit(password.trim())
          }}
          className="space-y-2"
        >
          <Label htmlFor="page-password">New password</Label>
          <Input
            id="page-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!password.trim() || pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [password, setPassword] = useState('')
  const [theme, setTheme] = useState<Theme>('auto')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const slugRef = useRef<HTMLInputElement>(null)

  const monitors = useQuery({
    queryKey: ['monitors'],
    queryFn: () => api.get<{ monitors: Monitor[] }>('/api/admin/monitors'),
  })

  const reset = () => {
    setSlug('')
    setTitle('')
    setDescription('')
    setPassword('')
    setTheme('auto')
    setSelected([])
    setError(null)
  }

  const create = useMutation({
    mutationFn: (payload: object) => api.post('/api/admin/pages', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pages'] })
      toast.success('Status page created')
      reset()
      onClose()
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed')
      slugRef.current?.focus()
    },
  })

  const handleSubmit = () => {
    create.mutate({
      slug: slug.trim().toLowerCase(),
      title: title.trim() || slug,
      description: description.trim() || null,
      theme,
      password: password.trim() || null,
      monitors: selected.map((id, i) => ({ monitorId: id, sortOrder: i })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && (reset(), onClose())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create status page</DialogTitle>
          <DialogDescription>Public, shareable, and updates live.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="page-slug">Slug</Label>
              <Input
                ref={slugRef}
                id="page-slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="main"
                aria-invalid={!!error || undefined}
                aria-describedby={error ? 'page-dialog-error' : undefined}
              />
              <p className="text-xs text-muted-foreground">Public URL: /{slug || 'slug'}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-title">Title</Label>
              <Input
                id="page-title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Service Status"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-desc">Description</Label>
            <Input
              id="page-desc"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="page-password">Password (optional)</Label>
              <Input
                id="page-password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank for a public page"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-theme">Theme</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
                <SelectTrigger id="page-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (follow visitor)</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Monitors to show</Label>
            <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
              {(monitors.data?.monitors ?? []).map((m) => {
                const checked = selected.includes(m.id)
                return (
                  <label key={m.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        setSelected((prev) =>
                          prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id],
                        )
                      }
                    />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{m.name}</div>
                      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.type}</div>
                    </div>
                  </label>
                )
              })}
              {(!monitors.data?.monitors || monitors.data.monitors.length === 0) && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Add some monitors first.
                </div>
              )}
            </div>
          </div>
          {error && (
            <p id="page-dialog-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!slug.trim() || create.isPending}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditPageDialog({
  page,
  presetMonitorId,
  onClose,
}: {
  page: StatusPage | null
  presetMonitorId?: string | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const open = !!page

  const detail = useQuery({
    queryKey: ['page', page?.id],
    queryFn: () => api.get<PageDetail>(`/api/admin/pages/${page!.id}`),
    enabled: open,
  })

  const monitors = useQuery({
    queryKey: ['monitors'],
    queryFn: () => api.get<{ monitors: Monitor[] }>('/api/admin/monitors'),
    enabled: open,
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [theme, setTheme] = useState<Theme>('auto')
  // monitorId → groupName ('' = no group)
  const [selected, setSelected] = useState<Map<string, string>>(new Map())
  const [order, setOrder] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Hydrate when the detail query lands. `presetMonitorId` is in the deps so
  // that opening via "Add to page" re-hydrates from cache with that monitor
  // already ticked; once open, unticking it sticks because neither dep changes.
  useEffect(() => {
    if (!detail.data) return
    setTitle(detail.data.page.title)
    setDescription(detail.data.page.description ?? '')
    setTheme(detail.data.page.theme)
    const sorted = [...detail.data.monitors].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    )
    const nextOrder = sorted.map((m) => m.monitorId)
    const nextSelected = new Map(
      sorted.map((m) => [m.monitorId, m.groupName ?? '']),
    )
    if (presetMonitorId && !nextSelected.has(presetMonitorId)) {
      nextOrder.push(presetMonitorId)
      nextSelected.set(presetMonitorId, '')
    }
    setOrder(nextOrder)
    setSelected(nextSelected)
    setError(null)
  }, [detail.data, presetMonitorId])

  const save = useMutation({
    mutationFn: (payload: object) =>
      api.patch(`/api/admin/pages/${page!.id}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pages'] })
      void queryClient.invalidateQueries({ queryKey: ['page', page!.id] })
      toast.success('Status page updated')
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed'),
  })

  const handleSubmit = () => {
    if (!detail.data) return // never submit a form that never hydrated
    setError(null)
    save.mutate({
      title: title.trim() || page!.slug,
      description: description.trim() || null,
      theme,
      monitors: order.map((monitorId, i) => ({
        monitorId,
        groupName: selected.get(monitorId)?.trim() || null,
        sortOrder: i,
      })),
    })
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.set(id, '')
      }
      return next
    })
    setOrder((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const setGroup = (id: string, value: string) => {
    setSelected((prev) => {
      const next = new Map(prev)
      next.set(id, value)
      return next
    })
  }

  const moveOrder = (id: string, delta: -1 | 1) => {
    setOrder((prev) => {
      const idx = prev.indexOf(id)
      const target = idx + delta
      if (idx === -1 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target]!, next[idx]!]
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit status page</DialogTitle>
          <DialogDescription>
            The slug (<span className="font-mono">/{page?.slug}</span>) cannot
            be changed without breaking incoming links.
          </DialogDescription>
        </DialogHeader>
        {detail.isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : detail.isError ? (
          // Without this branch the form renders blank and a submit would
          // PATCH an empty monitor list over the real page.
          <QueryError
            subject="page details"
            onRetry={() => void detail.refetch()}
          />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-theme">Theme</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
                <SelectTrigger id="edit-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (follow visitor)</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monitors</Label>
              <div className="border rounded-md max-h-72 overflow-y-auto divide-y">
                {/* Selected monitors first, in display order — so the up/down
                    buttons make visual sense. Unselected appear below. */}
                {orderedMonitorList(monitors.data?.monitors ?? [], order).map(
                  (m) => {
                    const checked = selected.has(m.id)
                    return (
                      <div key={m.id} className="p-3 flex items-center gap-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(m.id)}
                        />
                        <div className="flex-1 min-w-0 text-sm">
                          <div className="font-medium truncate">{m.name}</div>
                          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                            {m.type}
                          </div>
                        </div>
                        {checked && (
                          <>
                            <div className="flex items-center gap-0.5">
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Move up"
                                disabled={
                                  // Disable if this item is the first selected
                                  order.indexOf(m.id) <= 0
                                }
                                onClick={() => moveOrder(m.id, -1)}
                              >
                                <Icon
                                  icon={ArrowUp}
                                  className="h-3.5 w-3.5"
                                />
                              </Button>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Move down"
                                disabled={
                                  order.indexOf(m.id) === order.length - 1 ||
                                  order.indexOf(m.id) === -1
                                }
                                onClick={() => moveOrder(m.id, 1)}
                              >
                                <Icon
                                  icon={ArrowDown}
                                  className="h-3.5 w-3.5"
                                />
                              </Button>
                            </div>
                            <Input
                              value={selected.get(m.id) ?? ''}
                              onChange={(e) => setGroup(m.id, e.target.value)}
                              placeholder="Group"
                              className="w-32 text-xs"
                            />
                          </>
                        )}
                      </div>
                    )
                  },
                )}
                {(!monitors.data?.monitors || monitors.data.monitors.length === 0) && (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No monitors to add.
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Use the arrows to reorder. Group names cluster monitors on the
                public page (e.g. "API", "Web", "Database").
              </p>
            </div>
            {error && (
              <p
                id="page-dialog-error"
                role="alert"
                aria-live="polite"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending || detail.isLoading}>
                {save.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
