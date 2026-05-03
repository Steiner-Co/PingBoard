import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import type { Monitor, StatusPage } from '@/types'

export function StatusPagesPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const pages = useQuery({
    queryKey: ['pages'],
    queryFn: () => api.get<{ pages: StatusPage[] }>('/api/admin/pages'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/pages/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pages'] }),
  })

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Status pages</h1>
          <p className="text-muted-foreground">Public dashboards you can share with users.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Create page
        </Button>
      </header>

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
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="font-mono text-xs">/{p.slug}</TableCell>
                    <TableCell className="capitalize text-muted-foreground text-sm">
                      {p.theme}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/${p.slug}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3 w-3" />
                          View
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete status page "${p.title}"?`)) {
                            deleteMutation.mutate(p.id)
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
    </div>
  )
}

function PageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
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
