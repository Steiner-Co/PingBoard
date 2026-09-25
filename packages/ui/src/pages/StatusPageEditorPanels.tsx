import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowDown } from '@phosphor-icons/react/dist/icons/ArrowDown'
import { ArrowUp } from '@phosphor-icons/react/dist/icons/ArrowUp'
import { Globe } from '@phosphor-icons/react/dist/icons/Globe'
import { LockKey } from '@phosphor-icons/react/dist/icons/LockKey'
import { UploadSimple } from '@phosphor-icons/react/dist/icons/UploadSimple'
import { Trash } from '@phosphor-icons/react/dist/icons/Trash'
import { Sun } from '@phosphor-icons/react/dist/icons/Sun'
import { Moon } from '@phosphor-icons/react/dist/icons/Moon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { THEME_PRESETS, type ThemePreset } from '@/public/theme-presets'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { MonitorWithLatest, Theme } from '@/types'

/**
 * Non-text page settings for the toolbar popover. The page itself is the
 * canvas (title + description edit inline); these panels host everything
 * that doesn't fit inline: monitors, appearance, access.
 */

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

export function MonitorsPanel({
  allMonitors,
  order,
  selected,
  onToggle,
  onMove,
  onGroup,
}: {
  allMonitors: MonitorWithLatest[]
  order: string[]
  selected: Map<string, string>
  onToggle: (mid: string) => void
  onMove: (mid: string, delta: -1 | 1) => void
  onGroup: (mid: string, value: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs/relaxed text-muted-foreground">
        Ticked monitors appear on the public page, in this order. Group names
        cluster them (e.g. “API”, “Web”, “Database”). Changes apply with Save
        changes.
      </p>
      <div className="divide-y divide-border/60 rounded-md border border-border/60">
        {/* Selected monitors first, in display order — so the reorder
            controls make visual sense. Unselected below. */}
        {orderedMonitorList(allMonitors, order).map((m) => {
          const checked = selected.has(m.id)
          return (
            <div key={m.id} className="flex items-center gap-3 p-3">
              <Checkbox checked={checked} onCheckedChange={() => onToggle(m.id)} />
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
                      onClick={() => onMove(m.id, -1)}
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
                      onClick={() => onMove(m.id, 1)}
                    >
                      <Icon icon={ArrowDown} className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={selected.get(m.id) ?? ''}
                    onChange={(e) => onGroup(m.id, e.target.value)}
                    placeholder="Group"
                    aria-label={`Group for ${m.name}`}
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
    </div>
  )
}

export function AppearancePanel({
  theme,
  onTheme,
  activePresetId,
  onPreset,
  onClearPreset,
  pageId,
  logoPath,
  websiteUrl,
  onWebsiteUrl,
  hideBranding,
  onHideBranding,
  customCss,
  onCustomCss,
  peekTheme,
  onPeekTheme,
}: {
  theme: Theme
  onTheme: (v: Theme) => void
  activePresetId: string | null
  onPreset: (preset: ThemePreset) => void
  onClearPreset: () => void
  pageId: string
  logoPath: string | null
  websiteUrl: string
  onWebsiteUrl: (v: string) => void
  hideBranding: boolean
  onHideBranding: (v: boolean) => void
  customCss: string
  onCustomCss: (v: string) => void
  peekTheme: 'light' | 'dark' | null
  onPeekTheme: (v: 'light' | 'dark' | null) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Label>Preview as</Label>
        <div className="flex gap-1">
          {(
            [
              { v: null, label: 'Setting', icon: null },
              { v: 'light', label: 'Light', icon: Sun },
              { v: 'dark', label: 'Dark', icon: Moon },
            ] as const
          ).map((o) => (
            <Button
              key={o.label}
              type="button"
              size="sm"
              variant={peekTheme === o.v ? 'secondary' : 'ghost'}
              aria-pressed={peekTheme === o.v}
              onClick={() => onPeekTheme(o.v)}
              className="gap-1.5"
            >
              {o.icon && <Icon icon={o.icon} className="h-3.5 w-3.5" />}
              {o.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="editor-theme">Theme</Label>
        <Select value={theme} onValueChange={(v) => onTheme(v as Theme)}>
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

      <div className="flex flex-col gap-2">
        <Label>Theme preset</Label>
        <div className="flex flex-wrap gap-1.5">
          {THEME_PRESETS.map((preset) => {
            const active = activePresetId === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onPreset(preset)}
                aria-pressed={active}
                title={`Apply ${preset.label}`}
                className={cn(
                  'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs/relaxed outline-none transition-[border-color,background-color,box-shadow] duration-150 ease-out',
                  active
                    ? 'border-ring ring-2 ring-ring/30'
                    : 'border-border/60 hover:bg-muted/50',
                )}
              >
                <span className="flex overflow-hidden rounded-sm ring-1 ring-foreground/10">
                  {preset.swatches.map((color) => (
                    <span
                      key={color}
                      className="size-3"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                {preset.label}
              </button>
            )
          })}
          {activePresetId && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onClearPreset}
            >
              Default
            </Button>
          )}
        </div>
        <p className="text-xs/relaxed text-muted-foreground">
          Writes a dark + light palette into Custom CSS below — edit it there,
          or pick Default to clear it.
        </p>
      </div>

      <LogoField pageId={pageId} logoPath={logoPath} />

      <div className="space-y-2">
        <Label htmlFor="editor-website">Website URL</Label>
        <Input
          id="editor-website"
          name="websiteUrl"
          value={websiteUrl}
          onChange={(e) => onWebsiteUrl(e.target.value)}
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
          onCheckedChange={(v) => onHideBranding(v === true)}
        />
        Hide the “Powered by PingBoard” footer
      </label>

      <div className="space-y-2">
        <Label htmlFor="editor-css">Custom CSS</Label>
        <Textarea
          id="editor-css"
          name="customCss"
          value={customCss}
          onChange={(e) => onCustomCss(e.target.value)}
          placeholder={'.my-rule { … }'}
          rows={6}
          spellCheck={false}
          className="font-mono text-xs"
        />
        <p className="text-xs/relaxed text-muted-foreground">
          Injected into this status page only, up to 10 KB. It's your page —
          unescaped by design.
        </p>
      </div>
    </div>
  )
}

export function AccessPanel({
  slug,
  passwordSet,
  password,
  onPassword,
  changingPassword,
  onChangingPassword,
  saving,
  onSave,
  onRemove,
}: {
  slug: string
  passwordSet: boolean
  password: string
  onPassword: (v: string) => void
  changingPassword: boolean
  onChangingPassword: (v: boolean) => void
  saving: boolean
  onSave: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="editor-password">Password protection</Label>
      {passwordSet && !changingPassword ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
          <span className="flex items-center gap-2 text-xs/relaxed text-muted-foreground">
            <Icon icon={LockKey} className="size-3.5" />
            On — visitors need a password
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChangingPassword(true)}
            >
              Change
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={saving}
              onClick={onRemove}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <PasswordInput
            id="editor-password"
            autoComplete="new-password"
            placeholder={passwordSet ? 'New password' : 'Set a password'}
            value={password}
            onChange={(e) => onPassword(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            size="sm"
            disabled={!password.trim() || saving}
            onClick={onSave}
          >
            {saving ? 'Saving…' : passwordSet ? 'Update' : 'Set'}
          </Button>
          {passwordSet && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                onChangingPassword(false)
                onPassword('')
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      )}
      <p className="text-xs/relaxed text-muted-foreground">
        Visitors need this password to view{' '}
        <span className="font-mono">/{slug}</span>. Cookies last 30 days.
        Applied immediately, not with Save changes.
      </p>
    </div>
  )
}

/**
 * Shared logo upload/remove actions. Uploads take effect immediately
 * (separate from Save) because the file endpoint is its own multipart
 * round-trip; everything else stays draft-until-save.
 */
function useLogoActions(pageId: string) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['pages'] })
    void queryClient.invalidateQueries({ queryKey: ['page', pageId] })
    void queryClient.invalidateQueries({ queryKey: ['page-preview', pageId] })
  }

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('logo', file)
      const res = await fetch(`/api/admin/pages/${pageId}/logo`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(data?.error ?? `Upload failed (${res.status})`)
      }
    },
    onSuccess: () => {
      invalidate()
      toast.success('Logo updated')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Upload failed'),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/admin/pages/${pageId}/logo`),
    onSuccess: () => {
      invalidate()
      toast.success('Logo removed')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to remove'),
  })

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload.mutate(file)
    e.target.value = ''
  }

  return {
    fileRef,
    busy: upload.isPending || remove.isPending,
    uploading: upload.isPending,
    remove,
    pick: () => fileRef.current?.click(),
    onFileChange,
  }
}

/**
 * Inline logo for the editing canvas. Shows the current logo (click to
 * replace) or a dashed empty state (click to upload). Removal lives in the
 * Appearance panel.
 */
export function InlineLogo({
  pageId,
  logoUrl,
}: {
  pageId: string
  logoUrl: string | null
}) {
  const { fileRef, busy, pick, onFileChange } = useLogoActions(pageId)
  return (
    <>
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        title={logoUrl ? 'Replace logo' : 'Upload a logo'}
        aria-label={logoUrl ? 'Replace logo' : 'Upload a logo'}
        className={
          logoUrl
            ? 'shrink-0 rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring'
            : 'flex size-11 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground outline-none transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:size-12'
        }
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="size-11 rounded-md object-contain sm:size-12"
          />
        ) : (
          <Icon icon={Globe} className="size-4" />
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={onFileChange}
      />
    </>
  )
}

/**
 * Logo picker for the Appearance panel. Same immediate-upload behavior;
 * removal lives here next to replace.
 */
function LogoField({
  pageId,
  logoPath,
}: {
  pageId: string
  logoPath: string | null
}) {
  const { fileRef, busy, uploading, remove, pick, onFileChange } =
    useLogoActions(pageId)

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
            onClick={pick}
            className="gap-1.5"
          >
            <Icon icon={UploadSimple} className="h-3.5 w-3.5" />
            {uploading ? 'Uploading…' : logoPath ? 'Replace' : 'Upload'}
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
        onChange={onFileChange}
      />
    </div>
  )
}
