import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { Checkbox } from '@/components/ui/checkbox'
import { Check } from "@phosphor-icons/react/dist/icons/Check"
import { Copy } from "@phosphor-icons/react/dist/icons/Copy"
import { PencilSimple } from "@phosphor-icons/react/dist/icons/PencilSimple"
import { ArrowUpRight } from "@phosphor-icons/react/dist/icons/ArrowUpRight"
import { LockKey } from "@phosphor-icons/react/dist/icons/LockKey"
import { DotsThreeOutlineVertical } from "@phosphor-icons/react/dist/icons/DotsThreeOutlineVertical"
import { PlusCircle } from "@phosphor-icons/react/dist/icons/PlusCircle"
import { Warning } from "@phosphor-icons/react/dist/icons/Warning"
import { Trash } from "@phosphor-icons/react/dist/icons/Trash"
import { Globe } from "@phosphor-icons/react/dist/icons/Globe"
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
import { ScreenHeader } from '@/components/screen'
import { usePrimaryAction } from '@/contexts/primary-action'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Monitor, MonitorWithLatest, StatusPage } from '@/types'

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
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const { setAction: setPrimaryAction } = usePrimaryAction()
  useEffect(() => {
    setPrimaryAction({ label: 'Create page', onClick: () => setOpen(true) })
    return () => setPrimaryAction(null)
  }, [setPrimaryAction])

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/pages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      toast.success('Status page deleted')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to delete'),
  })

  const header = (
    <ScreenHeader
      title="Status pages"
      description="Public dashboards you can share with users"
    />
  )

  const dialogs = <PageDialog open={open} onClose={() => setOpen(false)} />

  if (pages.isError) {
    return (
      <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
        {header}
        <QueryError subject="status pages" onRetry={() => void pages.refetch()} />
        {dialogs}
      </div>
    )
  }

  if (pages.isLoading) {
    return (
      <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
        {header}
        <PagesSkeleton />
        {dialogs}
      </div>
    )
  }

  if (pageList.length === 0) {
    return (
      <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
        {header}
        <EmptyState
          icon={Globe}
          title="No status pages yet"
          description="Create a public page to share live status with users, customers, or stakeholders. Each page can list a custom subset of your monitors."
          action={
            <Button onClick={() => setOpen(true)}>
              <Icon icon={PlusCircle} className="h-4 w-4" />
              Create your first page
            </Button>
          }
        />
        {dialogs}
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6 pb-10 flex flex-col gap-6">
      {header}

      {coverageReady && unpublished.length > 0 && (
        <CoverageBanner
          unpublished={unpublished}
          pages={pageList}
          onAddToPage={(page, monitorId) =>
            navigate(`/admin/pages/${page.id}/edit?add=${monitorId}`)
          }
        />
      )}

      <Panel className="overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th scope="col" className="px-6 py-4 text-left text-base font-medium">
                  Page
                </th>
                <th scope="col" className="w-[12%] px-6 py-4 text-left text-base font-medium">
                  Monitors
                </th>
                <th scope="col" className="w-[24%] px-6 py-4 text-left text-base font-medium">
                  Health
                </th>
                <th scope="col" className="w-12 px-2 py-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageList.map((p) => (
                <PageRow
                  key={p.id}
                  page={p}
                  health={healthByPageId.get(p.id) ?? null}
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
            </tbody>
          </table>
        </div>
      </Panel>

      {dialogs}
    </div>
  )
}

function PagesSkeleton() {
  return (
    <Panel className="overflow-hidden rounded-2xl">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border/60 p-6 last:border-b-0"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-64 max-w-full" />
          </div>
          <Skeleton className="h-5 w-10" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </Panel>
  )
}

function PageRow({
  page,
  health,
  onDelete,
}: {
  page: StatusPage
  health: PageHealth | null
  onDelete: () => void
}) {
  const count = page.monitorCount ?? 0

  return (
    <tr className="relative border-b border-border transition-colors last:border-b-0 hover:bg-muted/40">
      <td className="px-6 py-5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Link
            to={`/admin/pages/${page.id}/edit`}
            className="inline-block max-w-full truncate text-lg font-medium tracking-tight outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {page.title}
          </Link>
          {page.passwordSet && (
            // Above the row's stretched title link.
            <Badge variant="warning" className="relative z-10 gap-1">
              <Icon icon={LockKey} className="h-3.5 w-3.5" />
              Password
            </Badge>
          )}
        </div>
        <div className="mt-1.5">
          <PublicUrl slug={page.slug} />
        </div>
      </td>
      <td className="px-6 py-5">
        <span
          className={cn(
            'text-lg font-medium tabular-nums',
            count === 0 && 'text-warning',
          )}
        >
          {count}
        </span>
      </td>
      <td className="px-6 py-5">
        {health && count > 0 ? (
          <span className="inline-flex items-center gap-2 text-sm tabular-nums text-muted-foreground">
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
            {health.up} up
            {health.down > 0 && (
              <span className="text-destructive">· {health.down} down</span>
            )}
          </span>
        ) : (
          <span className="text-lg text-muted-foreground">—</span>
        )}
      </td>
      <td className="w-12 px-2 py-5 text-right">
        <RowActions page={page} onDelete={onDelete} />
      </td>
    </tr>
  )
}

function RowActions({
  page,
  onDelete,
}: {
  page: StatusPage
  onDelete: () => void
}) {
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${page.title}`}
          // Above the row's stretched title link.
          className="relative z-10 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-[color,background-color] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 data-[state=open]:bg-muted"
        >
          <Icon icon={DotsThreeOutlineVertical} className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onSelect={() => window.open(`/${page.slug}`, '_blank', 'noopener')}
        >
          <Icon icon={ArrowUpRight} className="size-3.5" />
          View public page
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => navigate(`/admin/pages/${page.id}/edit`)}
        >
          <Icon icon={PencilSimple} className="size-3.5" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Icon icon={Trash} className="size-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// The public URL is the whole point of a status page, so it's shown in full
// and copies on click. `z-10` lifts it above the row's stretched title link.
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
      className="group relative z-10 inline-flex max-w-full items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-2 py-1 font-mono text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="truncate text-muted-foreground">{origin}</span>
      <span className="-ml-2 truncate font-medium text-foreground">/{slug}</span>
      <Icon
        icon={copied ? Check : Copy}
        weight={copied ? 'bold' : undefined}
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
    <Panel className="overflow-hidden rounded-2xl border-warning/40">
      <header className="flex items-baseline justify-between gap-3 border-b border-border bg-muted px-4 py-3.5">
        <h2 className="flex items-center gap-2 text-base font-medium">
          <Icon icon={Warning} className="size-4 shrink-0 text-warning" />
          Hidden monitors
        </h2>
        <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground whitespace-nowrap tabular-nums">
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
                  <Icon icon={PlusCircle} className="h-3.5 w-3.5" />
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

function PageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [password, setPassword] = useState('')
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
      password: password.trim() || null,
      monitors: selected.map((id, i) => ({ monitorId: id, sortOrder: i })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && (reset(), onClose())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create status page</DialogTitle>
          <DialogDescription>
            Public, shareable, and updates live. After creating, open Edit to add
            a logo and custom CSS.
          </DialogDescription>
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
