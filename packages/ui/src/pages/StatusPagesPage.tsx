import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Edit02Icon,
  GlobeIcon,
  LinkSquare02Icon,
  LockPasswordIcon,
  MoreVerticalCircle01Icon,
  PlusSignIcon,
  Delete02Icon,
} from '@hugeicons/core-free-icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { QueryError } from '@/components/QueryError'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import type { Monitor, StatusPage, Theme } from '@/types'

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

export function StatusPagesPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [passwordTarget, setPasswordTarget] = useState<StatusPage | null>(null)
  const [editTarget, setEditTarget] = useState<StatusPage | null>(null)

  const pages = useQuery({
    queryKey: ['pages'],
    queryFn: () => api.get<{ pages: StatusPage[] }>('/api/admin/pages'),
  })

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

  return (
    <div className="px-4 lg:px-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground">Public dashboards you can share with users.</p>
        <Button onClick={() => setOpen(true)}>
          <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4" />
          Create page
        </Button>
      </div>

      {pages.isError ? (
        <QueryError subject="status pages" onRetry={() => void pages.refetch()} />
      ) : !pages.isLoading && (pages.data?.pages.length ?? 0) === 0 ? (
        <EmptyState
          icon={GlobeIcon}
          title="No status pages yet"
          description="Create a public page to share live status with users, customers, or stakeholders. Each page can list a custom subset of your monitors."
          action={
            <Button onClick={() => setOpen(true)}>
              <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4" />
              Create your first page
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pages</CardTitle>
            <CardDescription>
              {pages.data?.pages.length ?? 0} {(pages.data?.pages.length ?? 0) === 1 ? 'page' : 'pages'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Theme</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pages.data?.pages ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {p.title}
                        {p.passwordSet && (
                          <Badge variant="secondary" className="gap-1">
                            <HugeiconsIcon
                              icon={LockPasswordIcon}
                              className="h-3 w-3"
                              strokeWidth={2}
                            />
                            Password
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">/{p.slug}</TableCell>
                    <TableCell className="capitalize text-muted-foreground text-sm">
                      {p.theme}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/${p.slug}`} target="_blank" rel="noreferrer">
                          <HugeiconsIcon icon={LinkSquare02Icon} className="h-3 w-3" />
                          View
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditTarget(p)}
                      >
                        <HugeiconsIcon icon={Edit02Icon} className="h-3 w-3" />
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`More actions for ${p.title}`}
                          >
                            <HugeiconsIcon
                              icon={MoreVerticalCircle01Icon}
                              className="h-3.5 w-3.5"
                              strokeWidth={2}
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setPasswordTarget(p)}>
                            <HugeiconsIcon
                              icon={LockPasswordIcon}
                              className="h-3.5 w-3.5"
                            />
                            {p.passwordSet ? 'Change password' : 'Set password'}
                          </DropdownMenuItem>
                          {p.passwordSet && (
                            <DropdownMenuItem
                              onSelect={async () => {
                                const ok = await confirm({
                                  title: `Remove password from "${p.title}"?`,
                                  description:
                                    'Anyone with the URL will be able to view this status page.',
                                  confirmLabel: 'Remove password',
                                  destructive: true,
                                })
                                if (ok) {
                                  updatePassword.mutate({ id: p.id, password: null })
                                }
                              }}
                            >
                              Remove password
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={async () => {
                              const ok = await confirm({
                                title: `Delete "${p.title}"?`,
                                description:
                                  'The page at this slug will become unreachable. Linked monitors stay intact.',
                                confirmLabel: 'Delete page',
                                destructive: true,
                              })
                              if (ok) deleteMutation.mutate(p.id)
                            }}
                          >
                            <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <PageDialog open={open} onClose={() => setOpen(false)} />
      <EditPageDialog page={editTarget} onClose={() => setEditTarget(null)} />
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
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed'),
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="page-slug">Slug</Label>
              <Input id="page-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="main" />
              <p className="text-xs text-muted-foreground">Public URL: /{slug || 'slug'}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-title">Title</Label>
              <Input id="page-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Service Status" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-desc">Description</Label>
            <Input id="page-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="page-password">Password (optional)</Label>
              <Input
                id="page-password"
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
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelected((prev) =>
                          prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id],
                        )
                      }
                      className="h-4 w-4"
                    />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground uppercase">{m.type}</div>
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
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!slug.trim() || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditPageDialog({
  page,
  onClose,
}: {
  page: StatusPage | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const open = !!page

  const detail = useQuery({
    queryKey: ['page', page?.id],
    queryFn: () =>
      api.get<{ page: StatusPage; monitors: LinkedMonitor[] }>(
        `/api/admin/pages/${page!.id}`,
      ),
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

  // Hydrate when the detail query lands.
  useEffect(() => {
    if (!detail.data) return
    setTitle(detail.data.page.title)
    setDescription(detail.data.page.description ?? '')
    setTheme(detail.data.page.theme)
    const sorted = [...detail.data.monitors].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    )
    setOrder(sorted.map((m) => m.monitorId))
    setSelected(new Map(sorted.map((m) => [m.monitorId, m.groupName ?? ''])))
    setError(null)
  }, [detail.data])

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
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
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
                  (m, idx, list) => {
                    const checked = selected.has(m.id)
                    return (
                      <div key={m.id} className="p-3 flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(m.id)}
                          className="h-4 w-4"
                        />
                        <div className="flex-1 min-w-0 text-sm">
                          <div className="font-medium truncate">{m.name}</div>
                          <div className="text-xs text-muted-foreground uppercase">
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
                                <HugeiconsIcon
                                  icon={ArrowUp01Icon}
                                  className="h-3 w-3"
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
                                <HugeiconsIcon
                                  icon={ArrowDown01Icon}
                                  className="h-3 w-3"
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
                        {!checked && idx > 0 && list[idx - 1] && (
                          // Visual separator between selected and unselected
                          // groups handled by the divide-y above; nothing to
                          // render here.
                          null
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
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={save.isPending || detail.isLoading}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
