import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowDown } from "@phosphor-icons/react/dist/icons/ArrowDown"
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft"
import { ArrowUp } from "@phosphor-icons/react/dist/icons/ArrowUp"
import { ArrowSquareUpRight } from "@phosphor-icons/react/dist/icons/ArrowSquareUpRight"
import { Globe } from "@phosphor-icons/react/dist/icons/Globe"
import { UploadSimple } from "@phosphor-icons/react/dist/icons/UploadSimple"
import { Trash } from "@phosphor-icons/react/dist/icons/Trash"
import { Sun } from "@phosphor-icons/react/dist/icons/Sun"
import { Moon } from "@phosphor-icons/react/dist/icons/Moon"
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/panel'
import { QueryError } from '@/components/QueryError'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/components/confirm-provider'
import { useUnsavedGuard } from '@/contexts/unsaved-changes'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ACCENT_PRESETS } from '@/public/accent-presets'
import {
  PublicStatusView,
  type PublicData,
  type PublicMonitor,
} from '@/public/PublicStatusPage'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { MonitorWithLatest, StatusPage, Theme } from '@/types'

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

// Sort: selected monitors in their explicit `order` first, then unselected
// monitors after. Lets the user see the live ordering while still being able
// to pick from the full pool.
function orderedMonitorList(
  monitors: MonitorWithLatest[],
  order: string[],
): MonitorWithLatest[] {
  const ordered: MonitorWithLatest[] = []
  for (const id of order) {
    const m = monitors.find((x) => x.id === id)
    if (m) ordered.push(m)
  }
  for (const m of monitors) {
    if (!order.includes(m.id)) ordered.push(m)
  }
  return ordered
}

/**
 * WordPress-customizer-style editor: controls on the left, the real public
 * page rendered live on the right from draft state. Nothing is saved until
 * "Save changes"; only logo uploads take effect immediately (they're a
 * separate multipart round-trip).
 */
export function StatusPageEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  // Deep link from the coverage banner: /admin/pages/:id/edit?add=<monitorId>
  // opens the editor with that monitor already ticked.
  const addMonitorId = searchParams.get('add')
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const { resolvedTheme } = useTheme()

  const detail = useQuery({
    queryKey: ['page', id],
    queryFn: () => api.get<PageDetail>(`/api/admin/pages/${id}`),
    enabled: !!id,
  })

  const monitors = useQuery({
    queryKey: ['monitors'],
    queryFn: () => api.get<{ monitors: MonitorWithLatest[] }>('/api/admin/monitors'),
  })

  // What visitors would see right now. The editor overlays draft state on top;
  // this supplies the parts the form doesn't control (timelines, incidents,
  // live statuses) and — via the admin route — works for protected pages too.
  const preview = useQuery({
    queryKey: ['page-preview', id],
    queryFn: () => api.get<PublicData>(`/api/admin/pages/${id}/preview`),
    enabled: !!id,
    refetchInterval: 30_000,
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [theme, setTheme] = useState<Theme>('auto')
  const [accent, setAccent] = useState<string | null>(null)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [hideBranding, setHideBranding] = useState(false)
  const [customCss, setCustomCss] = useState('')
  // monitorId → groupName ('' = no group)
  const [selected, setSelected] = useState<Map<string, string>>(new Map())
  const [order, setOrder] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  // Manual light/dark override for the preview frame; null = follow the
  // draft theme setting. Reset whenever the draft theme changes.
  const [peekTheme, setPeekTheme] = useState<'light' | 'dark' | null>(null)
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit')

  // Hydrate when the detail query lands, guarded by dataUpdatedAt so a
  // logo-upload refetch mid-edit doesn't wipe unsaved drafts.
  const lastHydrated = useRef<{ at: number; add: string | null }>({
    at: 0,
    add: null,
  })
  // Serialized draft at last save/hydration — the dirty baseline.
  const snapshot = useRef<string>('')

  const serializeDraft = useCallback(
    () =>
      JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        theme,
        accent,
        websiteUrl: websiteUrl.trim(),
        hideBranding,
        customCss: customCss.trim(),
        monitors: order.map((mid) => [mid, selected.get(mid)?.trim() || '']),
      }),
    [title, description, theme, accent, websiteUrl, hideBranding, customCss, order, selected],
  )

  useEffect(() => {
    if (!detail.data) return
    if (
      lastHydrated.current.at === detail.dataUpdatedAt &&
      lastHydrated.current.add === addMonitorId
    )
      return
    lastHydrated.current = { at: detail.dataUpdatedAt, add: addMonitorId }
    setTitle(detail.data.page.title)
    setDescription(detail.data.page.description ?? '')
    setTheme(detail.data.page.theme)
    setAccent(detail.data.page.accent)
    setWebsiteUrl(detail.data.page.websiteUrl ?? '')
    setHideBranding(detail.data.page.hideBranding)
    setCustomCss(detail.data.page.customCss ?? '')
    const sorted = [...detail.data.monitors].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    )
    const nextOrder = sorted.map((m) => m.monitorId)
    const nextSelected = new Map(
      sorted.map((m) => [m.monitorId, m.groupName ?? '']),
    )
    if (addMonitorId && !nextSelected.has(addMonitorId)) {
      nextOrder.push(addMonitorId)
      nextSelected.set(addMonitorId, '')
    }
    setOrder(nextOrder)
    setSelected(nextSelected)
    setError(null)
    setPeekTheme(null)
    setHydrated(true)
  }, [detail.data, detail.dataUpdatedAt, addMonitorId])

  // Capture the dirty baseline once the freshly-hydrated draft has rendered.
  useEffect(() => {
    if (hydrated && snapshot.current === '') {
      snapshot.current = serializeDraft()
    }
  }, [hydrated, serializeDraft])

  const isDirty = hydrated && snapshot.current !== '' && serializeDraft() !== snapshot.current

  const confirmDiscard = useCallback(
    () =>
      confirm({
        title: 'Discard unsaved changes?',
        description:
          "You have edits that haven't been saved yet. Leaving now will lose them.",
        confirmLabel: 'Discard changes',
        cancelLabel: 'Keep editing',
        destructive: true,
      }),
    [confirm],
  )

  // Same two-guard pattern as the monitor editor: navigation away (links,
  // navigate(), browser Back/Forward) via useUnsavedGuard, tab close/reload
  // via beforeunload.
  useUnsavedGuard(isDirty, confirmDiscard)
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const save = useMutation({
    mutationFn: (payload: object) =>
      api.patch(`/api/admin/pages/${id}`, payload),
    onSuccess: () => {
      snapshot.current = serializeDraft()
      void queryClient.invalidateQueries({ queryKey: ['pages'] })
      void queryClient.invalidateQueries({ queryKey: ['page', id] })
      void queryClient.invalidateQueries({ queryKey: ['page-preview', id] })
      toast.success('Status page updated')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed'),
  })

  const handleSubmit = () => {
    if (!detail.data) return // never submit a form that never hydrated
    if (customCss.length > 10 * 1024) {
      setError('Custom CSS is limited to 10 KB')
      return
    }
    setError(null)
    save.mutate({
      title: title.trim() || detail.data.page.slug,
      description: description.trim() || null,
      theme,
      accent,
      websiteUrl: websiteUrl.trim() || null,
      hideBranding,
      customCss: customCss.trim() || null,
      monitors: order.map((monitorId, i) => ({
        monitorId,
        groupName: selected.get(monitorId)?.trim() || null,
        sortOrder: i,
      })),
    })
  }

  const toggle = (mid: string) => {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(mid)) {
        next.delete(mid)
      } else {
        next.set(mid, '')
      }
      return next
    })
    setOrder((prev) =>
      prev.includes(mid) ? prev.filter((x) => x !== mid) : [...prev, mid],
    )
  }

  const setGroup = (mid: string, value: string) => {
    setSelected((prev) => {
      const next = new Map(prev)
      next.set(mid, value)
      return next
    })
  }

  const moveOrder = (mid: string, delta: -1 | 1) => {
    setOrder((prev) => {
      const idx = prev.indexOf(mid)
      const target = idx + delta
      if (idx === -1 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target]!, next[idx]!]
      return next
    })
  }

  const allMonitors = monitors.data?.monitors ?? []

  // Draft preview: real rows for monitors already on the page (timelines,
  // uptime), synthesized rows for newly ticked ones; draft order/groups and
  // branding overlaid on top.
  const previewData = useMemo<PublicData | null>(() => {
    if (!preview.data || !hydrated) return null
    const saved = preview.data
    const byId = new Map(saved.monitors.map((m) => [m.id, m]))
    const draftMonitors: PublicMonitor[] = order.map((mid) => {
      const group = selected.get(mid)?.trim() || null
      const existing = byId.get(mid)
      if (existing) return { ...existing, group }
      const admin = allMonitors.find((m) => m.id === mid)
      return {
        id: mid,
        name: admin?.name ?? 'Monitor',
        group,
        currentStatus: admin?.latest?.status ?? 'unknown',
        uptimePct: null,
        avgResponseMs: null,
        timeline: [],
      }
    })
    const draftIds = new Set(order)
    return {
      ...saved,
      page: {
        ...saved.page,
        title: title.trim() || saved.page.title,
        description: description.trim() || null,
        theme,
        accent,
        websiteUrl: websiteUrl.trim() || null,
        hideBranding,
        customCss: customCss.trim() || null,
      },
      monitors: draftMonitors,
      incidents: saved.incidents.filter((i) => draftIds.has(i.monitorId)),
      maintenance: (saved.maintenance ?? []).filter((w) =>
        draftIds.has(w.monitorId),
      ),
    }
  }, [
    preview.data,
    hydrated,
    order,
    selected,
    allMonitors,
    title,
    description,
    theme,
    accent,
    websiteUrl,
    hideBranding,
    customCss,
  ])

  const effectiveTheme: 'light' | 'dark' =
    peekTheme ??
    (theme === 'auto' ? (resolvedTheme === 'dark' ? 'dark' : 'light') : theme)

  if (detail.isError) {
    return (
      <div className="px-4 lg:px-6">
        <QueryError
          subject="page details"
          onRetry={() => void detail.refetch()}
        />
      </div>
    )
  }

  const page = detail.data?.page

  const saveButton = (
    <Button
      size="sm"
      onClick={handleSubmit}
      disabled={!isDirty || save.isPending || !hydrated}
    >
      {save.isPending ? 'Saving…' : 'Save changes'}
    </Button>
  )

  return (
    <div className="px-4 lg:px-6 flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
          <Link to="/admin/pages">
            <Icon icon={ArrowLeft} className="h-3.5 w-3.5" />
            Pages
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          {page ? (
            <>
              <h1 className="flex items-center gap-2 truncate text-lg font-semibold tracking-tight">
                <span className="truncate">{page.title}</span>
                {isDirty && (
                  <span
                    title="Unsaved changes"
                    className="size-1.5 shrink-0 rounded-full bg-warning"
                  />
                )}
              </h1>
              <p className="font-mono text-xs text-muted-foreground">
                /{page.slug}
              </p>
            </>
          ) : (
            <Skeleton className="h-6 w-48" />
          )}
        </div>
        {page && (
          <Button size="sm" variant="outline" asChild className="gap-1.5">
            <a href={`/${page.slug}`} target="_blank" rel="noreferrer">
              <Icon icon={ArrowSquareUpRight} className="h-3.5 w-3.5" />
              View
            </a>
          </Button>
        )}
        {saveButton}
      </div>

      {/* Mobile: Edit / Preview tabs. Desktop: side by side. */}
      <div className="flex gap-1 lg:hidden">
        {(['edit', 'preview'] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={mobileTab === t ? 'secondary' : 'ghost'}
            onClick={() => setMobileTab(t)}
            className="capitalize"
          >
            {t}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)] lg:items-start">
        {/* Controls rail */}
        <div
          className={cn(
            mobileTab === 'edit' ? 'flex' : 'hidden',
            'lg:flex flex-col gap-4',
          )}
        >
          {!page ? (
            <EditorSkeleton />
          ) : (
            <>
              <Panel className="flex flex-col gap-4 p-4">
                <div className="space-y-2">
                  <Label htmlFor="editor-title">Title</Label>
                  <Input
                    id="editor-title"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editor-desc">Description</Label>
                  <Input
                    id="editor-desc"
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editor-theme">Theme</Label>
                  <Select
                    value={theme}
                    onValueChange={(v) => {
                      setTheme(v as Theme)
                      setPeekTheme(null)
                    }}
                  >
                    <SelectTrigger id="editor-theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (follow visitor)</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Panel>

              <Panel className="flex flex-col gap-4 p-4">
                <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Appearance
                </p>

                <LogoField page={page} logoPath={page.logoPath} />

                <div className="space-y-2">
                  <Label>Accent</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAccent(null)}
                      aria-pressed={accent === null}
                      title="Default (PingBoard green)"
                      className={cn(
                        'size-6 rounded-full outline-none transition-[box-shadow,transform] duration-150 ease-out active:scale-95',
                        'bg-success',
                        accent === null
                          ? 'ring-2 ring-foreground/60 ring-offset-2 ring-offset-background'
                          : 'opacity-60 hover:opacity-100',
                      )}
                    />
                    {Object.entries(ACCENT_PRESETS).map(([key, p]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAccent(key)}
                        aria-pressed={accent === key}
                        title={p.label}
                        style={{ backgroundColor: p.swatch }}
                        className={cn(
                          'size-6 rounded-full outline-none transition-[box-shadow,transform] duration-150 ease-out active:scale-95',
                          accent === key
                            ? 'ring-2 ring-foreground/60 ring-offset-2 ring-offset-background'
                            : 'opacity-60 hover:opacity-100',
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editor-website">Website URL</Label>
                  <Input
                    id="editor-website"
                    name="websiteUrl"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    The logo and title on the public page link here.
                  </p>
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={hideBranding}
                    onCheckedChange={(v) => setHideBranding(v === true)}
                  />
                  Hide the “Powered by PingBoard” footer
                </label>

                <div className="space-y-2">
                  <Label htmlFor="editor-css">Custom CSS</Label>
                  <Textarea
                    id="editor-css"
                    name="customCss"
                    value={customCss}
                    onChange={(e) => setCustomCss(e.target.value)}
                    placeholder={'.my-rule { … }'}
                    rows={6}
                    spellCheck={false}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Injected into this status page only, up to 10 KB. It's your
                    page — unescaped by design.
                  </p>
                </div>
              </Panel>

              <Panel className="flex flex-col gap-2 p-4">
                <Label>Monitors</Label>
                <div className="divide-y divide-border/60 rounded-md border border-border/60">
                  {/* Selected monitors first, in display order — so the up/down
                      buttons make visual sense. Unselected appear below. */}
                  {orderedMonitorList(allMonitors, order).map((m) => {
                    const checked = selected.has(m.id)
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(m.id)}
                        />
                        <div className="min-w-0 flex-1 text-sm">
                          <div className="truncate font-medium">{m.name}</div>
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
                                disabled={order.indexOf(m.id) <= 0}
                                onClick={() => moveOrder(m.id, -1)}
                              >
                                <Icon icon={ArrowUp} className="h-3.5 w-3.5" />
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
                                <Icon icon={ArrowDown} className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <Input
                              value={selected.get(m.id) ?? ''}
                              onChange={(e) => setGroup(m.id, e.target.value)}
                              placeholder="Group"
                              className="w-28 text-xs"
                            />
                          </>
                        )}
                      </div>
                    )
                  })}
                  {allMonitors.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No monitors to add.
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the arrows to reorder. Group names cluster monitors on the
                  public page (e.g. "API", "Web", "Database").
                </p>
              </Panel>

              {error && (
                <p role="alert" aria-live="polite" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <div className="flex justify-end">{saveButton}</div>
            </>
          )}
        </div>

        {/* Live preview */}
        <div
          className={cn(
            mobileTab === 'preview' ? 'flex' : 'hidden',
            'lg:flex min-w-0 flex-col gap-2 lg:sticky lg:top-4',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Live preview
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant={effectiveTheme === 'light' ? 'secondary' : 'ghost'}
                aria-label="Preview light theme"
                aria-pressed={effectiveTheme === 'light'}
                onClick={() => setPeekTheme('light')}
              >
                <Icon icon={Sun} className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant={effectiveTheme === 'dark' ? 'secondary' : 'ghost'}
                aria-label="Preview dark theme"
                aria-pressed={effectiveTheme === 'dark'}
                onClick={() => setPeekTheme('dark')}
              >
                <Icon icon={Moon} className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {/* `dark`/`light` scope the class-based tokens to just this frame,
              overriding whatever the admin shell uses — no next-themes or
              localStorage side effects. */}
          <div
            className={cn(
              'overflow-hidden rounded-xl border border-border/60 ring-1 ring-foreground/10',
              effectiveTheme === 'dark' ? 'dark' : 'light',
            )}
          >
            <div className="h-[65vh] overflow-auto bg-background lg:h-[calc(100dvh-14rem)]">
              {preview.isError ? (
                <div className="p-4">
                  <QueryError
                    subject="preview"
                    onRetry={() => void preview.refetch()}
                  />
                </div>
              ) : previewData ? (
                <PublicStatusView
                  data={previewData}
                  dataUpdatedAt={preview.dataUpdatedAt}
                  forcedTheme={effectiveTheme}
                  preview
                />
              ) : (
                <div className="space-y-4 p-6">
                  <Skeleton className="h-8 w-56" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditorSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Panel key={i} className="space-y-3 p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </Panel>
      ))}
    </>
  )
}

/**
 * Logo picker. Uploads take effect immediately (separate from Save) because
 * the file endpoint is its own multipart round-trip; everything else on the
 * form stays draft-until-save.
 */
function LogoField({
  page,
  logoPath,
}: {
  page: StatusPage
  logoPath: string | null
}) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['pages'] })
    void queryClient.invalidateQueries({ queryKey: ['page', page.id] })
    void queryClient.invalidateQueries({ queryKey: ['page-preview', page.id] })
  }

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('logo', file)
      const res = await fetch(`/api/admin/pages/${page.id}/logo`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(data?.error ?? `UploadSimple failed (${res.status})`)
      }
    },
    onSuccess: () => {
      invalidate()
      toast.success('Logo updated')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'UploadSimple failed'),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/admin/pages/${page.id}/logo`),
    onSuccess: () => {
      invalidate()
      toast.success('Logo removed')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to remove'),
  })

  const busy = upload.isPending || remove.isPending

  return (
    <div className="space-y-2">
      <Label>Logo</Label>
      <div className="flex items-center gap-3">
        {logoPath ? (
          <img
            src={`/api/public/assets/${logoPath}`}
            alt="Current logo"
            className="size-9 shrink-0 rounded-md border border-border/60 object-contain"
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
            <Icon icon={Globe} className="size-4" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="gap-1.5"
          >
            <Icon icon={UploadSimple} className="h-3.5 w-3.5" />
            {upload.isPending ? 'Uploading…' : logoPath ? 'Replace' : 'UploadSimple'}
          </Button>
          {logoPath && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => remove.mutate()}
              className="gap-1.5 text-muted-foreground"
            >
              <Icon icon={Trash} className="h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        PNG, JPEG, SVG or WebP, up to 512 KB. Shown next to the page title.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        aria-label="Choose a logo image"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload.mutate(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
