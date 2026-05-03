import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, TestTube2, Trash2 } from 'lucide-react'
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
  const [open, setOpen] = useState(false)

  const channels = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<{ channels: NotificationChannel[] }>('/api/admin/channels'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/channels/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/channels/${id}/test`),
  })

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Notification channels</h1>
          <p className="text-muted-foreground">Where alerts go when monitors change state.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add channel
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Channels</CardTitle>
          <CardDescription>
            {channels.data?.channels.length ?? 0} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {channels.data && channels.data.channels.length > 0 ? (
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
                {channels.data.channels.map((c) => (
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
                          testMutation.mutate(c.id, {
                            onSuccess: () => alert(`Test sent via ${c.name}`),
                            onError: (err) =>
                              alert(`Test failed: ${err instanceof Error ? err.message : err}`),
                          })
                        }}
                        disabled={testMutation.isPending}
                      >
                        <TestTube2 className="h-3 w-3" />
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete channel "${c.name}"?`)) {
                            deleteMutation.mutate(c.id)
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
              No channels yet. Add one to start receiving alerts.
            </p>
          )}
        </CardContent>
      </Card>

      <ChannelDialog open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

function ChannelDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [type, setType] = useState<ChannelType>('webhook')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName('')
    setType('webhook')
    setConfig({})
    setError(null)
  }

  const create = useMutation({
    mutationFn: (payload: object) => api.post('/api/admin/channels', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['channels'] })
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
    create.mutate({ name: name.trim(), type, config: cfg.value, enabled: true })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && (reset(), onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add notification channel</DialogTitle>
          <DialogDescription>
            Channels can be linked to one or more monitors.
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
            <Select value={type} onValueChange={(v) => { setType(v as ChannelType); setConfig({}) }}>
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
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create channel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="ch-from">From</Label>
            <Input id="ch-from" value={config.smtpFrom ?? ''} onChange={set('smtpFrom')} placeholder="alerts@your.org" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-to">To</Label>
            <Input id="ch-to" value={config.to ?? ''} onChange={set('to')} placeholder="you@your.org" />
          </div>
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
    const required = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpFrom', 'to']
    for (const k of required) {
      if (!config[k]?.trim()) return { error: `${k} required` }
    }
    return {
      value: {
        smtpHost: config.smtpHost,
        smtpPort: Number(config.smtpPort),
        smtpUser: config.smtpUser,
        smtpPass: config.smtpPass,
        smtpFrom: config.smtpFrom,
        to: config.to,
      },
    }
  }
  return { error: 'Unknown type' }
}
