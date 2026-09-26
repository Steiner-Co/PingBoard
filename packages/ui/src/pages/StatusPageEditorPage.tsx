import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft"
import { ArrowCircleUpRight } from "@phosphor-icons/react/dist/icons/ArrowCircleUpRight"
import { ListChecks } from '@phosphor-icons/react/dist/icons/ListChecks'
import { Palette } from '@phosphor-icons/react/dist/icons/Palette'
import { LockKey } from '@phosphor-icons/react/dist/icons/LockKey'
import { LockKeyOpen } from '@phosphor-icons/react/dist/icons/LockKeyOpen'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/panel'
import { QueryError } from '@/components/QueryError'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/components/confirm-provider'
import { useUnsavedGuard } from '@/contexts/unsaved-changes'
import { THEME_PRESETS, type ThemePreset } from '@/public/theme-presets'
import {
  PublicStatusView,
  type PublicData,
  type PublicMonitor,
} from '@/public/PublicStatusPage'
import {
  AccessPanel,
  AppearancePanel,
  MonitorsPanel,
} from './StatusPageEditorPanels'
import {
  EditorToolbar,
  type ToolbarSection,
} from '@/components/description-editor'
import { api } from '@/lib/api'
import { isRichTextBlank, sanitizeRichText } from '@/lib/rich-text'
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

const SECTIONS: ToolbarSection[] = [
  {
    id: 'monitors',
    label: 'Monitors',
    icon: <Icon icon={ListChecks} className="h-4 w-4" />,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: <Icon icon={Palette} className="h-4 w-4" />,
  },
]

/**
 * Status page editor: the page itself is the canvas. Title + description
 * edit inline on the full-width preview; the floating toolbar below hosts
 * text formatting plus the Monitors / Appearance / Access panels. Nothing is
 * saved until "Save changes"; only logo uploads and the password take effect
 * immediately (separate round-trips).
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
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [hideBranding, setHideBranding] = useState(false)
  const [customCss, setCustomCss] = useState('')
  // monitorId → groupName ('' = no group)
  const [selected, setSelected] = useState<Map<string, string>>(new Map())
  const [order, setOrder] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  // Manual light/dark override for the preview; null = follow the draft
  // theme setting. Reset whenever the draft theme changes.
  const [peekTheme, setPeekTheme] = useState<'light' | 'dark' | null>(null)
  // Which toolbar section panel is open above the bar; null = formatting only.
  // The ?add= deep link opens Monitors so the ticked monitor is visible.
  const [activeSection, setActiveSection] = useState<string | null>(
    addMonitorId ? 'monitors' : null,
  )
  // Password is applied immediately rather than through "Save changes": it is
  // a security action and the PATCH takes it as a standalone field.
  const [password, setPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  // Ref of the inline description editor on the canvas — the toolbar's
  // formatting commands act on whatever it holds a selection in.
  const descriptionEditorRef = useRef<HTMLDivElement | null>(null)

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
        // Compare sanitized: the editor's DOM readback adds explicit
        // link attrs (target/rel) that are semantically identical — without
        // this, a focus+blur with zero edits would read as dirty.
        description: sanitizeRichText(description).trim(),
        theme,
        websiteUrl: websiteUrl.trim(),
        hideBranding,
        customCss: customCss.trim(),
        monitors: order.map((mid) => [mid, selected.get(mid)?.trim() || '']),
      }),
    [title, description, theme, websiteUrl, hideBranding, customCss, order, selected],
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
    // Store sanitized so the baseline matches what the editor DOM reads back.
    setDescription(sanitizeRichText(detail.data.page.description ?? ''))
    setTheme(detail.data.page.theme)
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

  // The Access dropdown anchors to the top bar — dismiss it on outside click.
  useEffect(() => {
    if (activeSection !== 'access') return
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[data-access-menu]')) {
        setActiveSection(null)
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [activeSection])

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

  const savePassword = useMutation({
    mutationFn: (next: string | null) =>
      api.patch(`/api/admin/pages/${id}`, { password: next }),
    onSuccess: (_data, next) => {
      setPassword('')
      setChangingPassword(false)
      void queryClient.invalidateQueries({ queryKey: ['page', id] })
      void queryClient.invalidateQueries({ queryKey: ['pages'] })
      toast.success(
        next ? 'Password protection enabled' : 'Password protection removed',
      )
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed'),
  })

  const removePassword = async () => {
    const ok = await confirm({
      title: 'Remove password protection?',
      description:
        'Anyone with the link will be able to view this status page again.',
      confirmLabel: 'Remove password',
      destructive: true,
    })
    if (ok) savePassword.mutate(null)
  }

  // A preset is "active" only while the Custom CSS field still matches it
  // byte-for-byte — edit the CSS and the picker shows nothing selected, which
  // is the honest answer.
  const activePresetId =
    THEME_PRESETS.find((p) => p.css.trim() === customCss.trim())?.id ?? null

  const applyPreset = async (preset: ThemePreset) => {
    if (customCss.trim() && !activePresetId) {
      const ok = await confirm({
        title: `Replace your custom CSS with ${preset.label}?`,
        description:
          'This overwrites the CSS currently in the Appearance panel. You can still edit it afterwards.',
        confirmLabel: 'Replace',
        destructive: true,
      })
      if (!ok) return
    }
    setCustomCss(preset.css)
  }

  const handleSubmit = () => {
    if (!detail.data) return // never submit a form that never hydrated
    if (customCss.length > 10 * 1024) {
      setError('Custom CSS is limited to 10 KB')
      return
    }
    setError(null)
    // The description is edited as HTML — scrub pasted junk down to the
    // supported subset before saving so the column only holds clean markup.
    const cleanDesc = sanitizeRichText(description)
    if (cleanDesc !== description) setDescription(cleanDesc)
    save.mutate({
      title: title.trim() || detail.data.page.slug,
      description: isRichTextBlank(cleanDesc) ? null : cleanDesc,
      theme,
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

  // Domains are a separate surface with no uptime bar — the backend already
  // excludes them from /monitors, this is belt-and-braces for cached data
  // and legacy status pages that still link one.
  const allMonitors = (monitors.data?.monitors ?? []).filter((m) => m.type !== 'domain')

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
        description: isRichTextBlank(description) ? null : description,
        theme,
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
              <Icon icon={ArrowCircleUpRight} className="h-3.5 w-3.5" />
              View
            </a>
          </Button>
        )}
        {page && (
          <div className="relative" data-access-menu>
            <Button
              size="icon-sm"
              variant="outline"
              aria-label={
                page.passwordSet
                  ? 'Access: password protected. Change settings.'
                  : 'Access: public. Change settings.'
              }
              title="Access"
              aria-pressed={activeSection === 'access'}
              onClick={() =>
                setActiveSection((prev) => (prev === 'access' ? null : 'access'))
              }
            >
              <Icon
                icon={page.passwordSet ? LockKey : LockKeyOpen}
                className="h-3.5 w-3.5"
              />
            </Button>
            {activeSection === 'access' && (
              <div
                role="dialog"
                aria-label="Access settings"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setActiveSection(null)
                }}
                className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border/70 bg-card p-4 shadow-lg"
              >
                <AccessPanel
                  slug={page.slug}
                  passwordSet={page.passwordSet}
                  password={password}
                  onPassword={setPassword}
                  changingPassword={changingPassword}
                  onChangingPassword={setChangingPassword}
                  saving={savePassword.isPending}
                  onSave={() => savePassword.mutate(password.trim())}
                  onRemove={() => void removePassword()}
                />
              </div>
            )}
          </div>
        )}
        {saveButton}
      </div>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {/* The page is the canvas: full width, title + description editable in
          place. Bottom padding keeps the footer clear of the fixed toolbar. */}
      <div className="pb-32">
        {!page || !hydrated ? (
          <EditorSkeleton />
        ) : preview.isError ? (
          <div className="p-4">
            <QueryError
              subject="preview"
              onRetry={() => void preview.refetch()}
            />
          </div>
        ) : previewData ? (
          // `dark`/`light` scope the class-based tokens to just this page,
          // overriding whatever the admin shell uses — no next-themes or
          // localStorage side effects.
          <div className={effectiveTheme === 'dark' ? 'dark' : 'light'}>
            <PublicStatusView
              data={previewData}
              dataUpdatedAt={preview.dataUpdatedAt}
              forcedTheme={effectiveTheme}
              preview
              editable
              pageId={id}
              titleValue={title}
              onTitleChange={setTitle}
              descriptionValue={description}
              onDescriptionChange={setDescription}
              descriptionEditorRef={descriptionEditorRef}
            />
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4 px-5 py-10">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
      </div>

      {page && hydrated && (
        <EditorToolbar
          editorRef={descriptionEditorRef}
          onInput={(html) => setDescription(html)}
          sections={SECTIONS}
          activeSection={activeSection}
          onSection={(sid) =>
            setActiveSection((prev) => (prev === sid ? null : sid))
          }
          onClose={() => setActiveSection(null)}
          panel={
            activeSection === 'monitors' ? (
              <MonitorsPanel
                allMonitors={allMonitors}
                order={order}
                selected={selected}
                onToggle={toggle}
                onMove={moveOrder}
                onGroup={setGroup}
              />
            ) : activeSection === 'appearance' ? (
              <AppearancePanel
                theme={theme}
                onTheme={(v) => {
                  setTheme(v)
                  setPeekTheme(null)
                }}
                activePresetId={activePresetId}
                onPreset={(preset) => void applyPreset(preset)}
                onClearPreset={() => setCustomCss('')}
                pageId={page.id}
                logoPath={page.logoPath}
                websiteUrl={websiteUrl}
                onWebsiteUrl={setWebsiteUrl}
                hideBranding={hideBranding}
                onHideBranding={setHideBranding}
                customCss={customCss}
                onCustomCss={setCustomCss}
                peekTheme={peekTheme}
                onPeekTheme={setPeekTheme}
              />
            ) : null
          }
        />
      )}
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
