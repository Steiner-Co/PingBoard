import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  LinkSquare02Icon,
  LockPasswordIcon,
  PlusSignIcon,
  Delete02Icon,
} from '@hugeicons/core-free-icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import type { Monitor, StatusPage } from '@/types'

export function StatusPagesPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [passwordTarget, setPasswordTarget] = useState<StatusPage | null>(null)

  const pages = useQuery({
    queryKey: ['pages'],
    queryFn: () => api.get<{ pages: StatusPage[] }>('/api/admin/pages'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/pages/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pages'] }),
  })

  const updatePassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string | null }) =>
      api.patch(`/api/admin/pages/${id}`, { password }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pages'] })
      setPasswordTarget(null)
    },
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

      <Card>
        <CardHeader>
          <CardTitle>Pages</CardTitle>
          <CardDescription>{pages.data?.pages.length ?? 0} pages</CardDescription>
        </CardHeader>
        <CardContent>
          {pages.data && pages.data.pages.length > 0 ? (
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
                {pages.data.pages.map((p) => (
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            …
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
                              onSelect={() => {
                                if (
                                  confirm(
                                    `Remove password protection from "${p.title}"? Anyone with the URL will be able to view it.`,
                                  )
                                ) {
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
                            onSelect={() => {
                              if (confirm(`Delete status page "${p.title}"?`)) {
                                deleteMutation.mutate(p.id)
                              }
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
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No status pages yet. Create one to share live status with users.
            </p>
          )}
        </CardContent>
      </Card>

      <PageDialog open={open} onClose={() => setOpen(false)} />
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
    setSelected([])
    setError(null)
  }

  const create = useMutation({
    mutationFn: (payload: object) => api.post('/api/admin/pages', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pages'] })
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
      theme: 'auto',
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
