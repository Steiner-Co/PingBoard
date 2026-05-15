import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlusSignIcon, TestTube02Icon, Delete02Icon, Edit02Icon, Notification03Icon } from '@hugeicons/core-free-icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { useConfirm } from '@/components/confirm-provider'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import type { ChannelType, NotificationChannel } from '@/types'

export function ChannelsPage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<NotificationChannel | null>(null)

  const channels = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<{ channels: NotificationChannel[] }>('/api/admin/channels'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/channels/${id}`),
    onSuccess: (_data, _id) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      toast.success('Channel deleted')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to delete channel'),
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/channels/${id}/test`),
  })

  const items = channels.data?.channels ?? []
  const isLoading = channels.isLoading

  return (
    <div className="px-4 lg:px-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground">Where alerts go when monitors change state.</p>
        <Button onClick={() => setOpen(true)}>
          <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4" />
          Add channel
        </Button>
      </div>

      {!isLoading && items.length === 0 ? (
        <EmptyState
          icon={Notification03Icon}
          title="No notification channels yet"
          description="Add a channel (webhook, Slack, Discord, ntfy, or email) so PingBoard can tell you when something goes down."
          action={
            <Button onClick={() => setOpen(true)}>
              <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4" />
              Add your first channel
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Channels</CardTitle>
            <CardDescription>{items.length} configured</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="uppercase text-xs text-muted-foreground">
                      {c.type}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.enabled ? 'success' : 'secondary'}>
                        {c.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const id = toast.loading(`Sending test via ${c.name}…`)
                          testMutation.mutate(c.id, {
                            onSuccess: () =>
                              toast.success(`Test sent via ${c.name}`, { id }),
                            onError: (err) =>
                              toast.error(
                                err instanceof Error
                                  ? `Test failed: ${err.message}`
                                  : 'Test failed',
                                { id },
                              ),
                          })
                        }}
                        disabled={testMutation.isPending}
                      >
                        <HugeiconsIcon icon={TestTube02Icon} className="h-3 w-3" />
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(c)}
                      >
                        <HugeiconsIcon icon={Edit02Icon} className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${c.name}`}
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Delete "${c.name}"?`,
                            description:
                              'Monitors linked to this channel will keep working, but stop notifying through it.',
                            confirmLabel: 'Delete channel',
                            destructive: true,
                          })
                          if (ok) deleteMutation.mutate(c.id)
                        }}
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ChannelDialog open={open} onClose={() => setOpen(false)} />
      <ChannelDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        editing={editing}
      />
    </div>
  )
}

function ChannelDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing?: NotificationChannel | null
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [type, setType] = useState<ChannelType>('webhook')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [enabled, setEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!editing

  const reset = () => {
    setName('')
    setType('webhook')
    setConfig({})
    setEnabled(true)
    setError(null)
  }

  // Hydrate from the editing target whenever it changes (and reset when the
  // dialog moves back into create mode).
  useEffect(() => {
    if (editing) {
      setName(editing.name)
      setType(editing.type)
      setConfig(configToFormState(editing.config))
      setEnabled(editing.enabled)
      setError(null)
    } else {
      reset()
    }
  }, [editing])

  const save = useMutation({
    mutationFn: (payload: object) =>
      editing
        ? api.patch(`/api/admin/channels/${editing.id}`, payload)
        : api.post('/api/admin/channels', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['channels'] })
      toast.success(editing ? 'Channel updated' : 'Channel created')
      reset()
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed'),
  })

  const handleSubmit = () => {
    setError(null)
    const cfg = buildConfig(type, config)
    if ('error' in cfg) {
      setError(cfg.error)
      return
    }
    save.mutate({ name: name.trim(), type, config: cfg.value, enabled })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit ${editing!.name}` : 'Add notification channel'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Type cannot be changed after creation; delete and recreate to switch.'
              : 'Channels can be linked to one or more monitors.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ch-name">Name</Label>
            <Input
              id="ch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. On-call Discord"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as ChannelType)
                setConfig({})
              }}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="discord">Discord</SelectItem>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="ntfy">ntfy</SelectItem>
                <SelectItem value="email">Email (SMTP)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ConfigFields type={type} config={config} setConfig={setConfig} />
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Enabled (receives notifications)
            </label>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || save.isPending}>
            {save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create channel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function configToFormState(config: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(config)) {
    if (v == null) continue
    out[k] = typeof v === 'string' ? v : String(v)
  }
  return out
}

function ConfigFields({
  type,
  config,
  setConfig,
}: {
  type: ChannelType
  config: Record<string, string>
  setConfig: (v: Record<string, string>) => void
}) {
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setConfig({ ...config, [k]: e.target.value })

  if (type === 'webhook') {
    return (
      <div className="space-y-2">
        <Label htmlFor="ch-url">Webhook URL</Label>
        <Input id="ch-url" value={config.url ?? ''} onChange={set('url')} placeholder="https://…" />
      </div>
    )
  }
  if (type === 'discord' || type === 'slack') {
    return (
      <div className="space-y-2">
        <Label htmlFor="ch-webhook">Webhook URL</Label>
        <Input
          id="ch-webhook"
          value={config.webhookUrl ?? ''}
          onChange={set('webhookUrl')}
          placeholder={type === 'discord' ? 'https://discord.com/api/webhooks/…' : 'https://hooks.slack.com/services/…'}
        />
      </div>
    )
  }
  if (type === 'ntfy') {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="ch-server">Server URL</Label>
          <Input
            id="ch-server"
            value={config.serverUrl ?? ''}
            onChange={set('serverUrl')}
            placeholder="https://ntfy.sh"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ch-topic">Topic</Label>
          <Input id="ch-topic" value={config.topic ?? ''} onChange={set('topic')} />
        </div>
      </>
    )
  }
  if (type === 'email') {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="ch-to">Send alerts to</Label>
          <Input id="ch-to" value={config.to ?? ''} onChange={set('to')} placeholder="you@your.org" />
        </div>
        <p className="text-xs text-muted-foreground">
          SMTP fields below are optional — leave blank to use the defaults
          configured in Settings.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="ch-host">SMTP host</Label>
            <Input id="ch-host" value={config.smtpHost ?? ''} onChange={set('smtpHost')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-port">Port</Label>
            <Input id="ch-port" type="number" value={config.smtpPort ?? ''} onChange={set('smtpPort')} placeholder="587" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="ch-user">User</Label>
            <Input id="ch-user" value={config.smtpUser ?? ''} onChange={set('smtpUser')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-pass">Password</Label>
            <Input id="ch-pass" type="password" value={config.smtpPass ?? ''} onChange={set('smtpPass')} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ch-from">From</Label>
          <Input id="ch-from" value={config.smtpFrom ?? ''} onChange={set('smtpFrom')} placeholder="alerts@your.org" />
        </div>
      </>
    )
  }
  return null
}

function buildConfig(
  type: ChannelType,
  config: Record<string, string>,
): { value: Record<string, unknown> } | { error: string } {
  if (type === 'webhook') {
    if (!config.url?.trim()) return { error: 'Webhook URL required' }
    return { value: { url: config.url.trim() } }
  }
  if (type === 'discord' || type === 'slack') {
    if (!config.webhookUrl?.trim()) return { error: 'Webhook URL required' }
    return { value: { webhookUrl: config.webhookUrl.trim() } }
  }
  if (type === 'ntfy') {
    if (!config.serverUrl?.trim() || !config.topic?.trim()) {
      return { error: 'Server URL and topic required' }
    }
    return { value: { serverUrl: config.serverUrl.trim(), topic: config.topic.trim() } }
  }
  if (type === 'email') {
    if (!config.to?.trim()) return { error: 'Recipient address required' }
    const value: Record<string, unknown> = { to: config.to.trim() }
    // Only persist SMTP fields the user filled in; the rest fall back to
    // instance-wide defaults at send time.
    if (config.smtpHost?.trim()) value.smtpHost = config.smtpHost.trim()
    if (config.smtpPort?.trim()) value.smtpPort = Number(config.smtpPort)
    if (config.smtpUser?.trim()) value.smtpUser = config.smtpUser.trim()
    if (config.smtpPass?.trim()) value.smtpPass = config.smtpPass
    if (config.smtpFrom?.trim()) value.smtpFrom = config.smtpFrom.trim()
    return { value }
  }
  return { error: 'Unknown type' }
}
