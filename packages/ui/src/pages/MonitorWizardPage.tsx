import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import type { MonitorType, NotificationChannel } from '@/types'

const STEPS = ['Target', 'Schedule', 'Notify'] as const

export function MonitorWizardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [target, setTarget] = useState('')
  const [name, setName] = useState('')
  const [intervalSeconds, setIntervalSeconds] = useState(60)
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const detected = useMemo(() => detectType(target), [target])

  const channelsQuery = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<{ channels: NotificationChannel[] }>('/api/admin/channels'),
  })

  const createMutation = useMutation({
    mutationFn: (payload: object) => api.post('/api/admin/monitors', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
      navigate('/admin')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create'),
  })

  const canAdvance = () => {
    if (step === 0) return Boolean(target.trim() && detected.type)
    if (step === 1) return Boolean(name.trim())
    return true
  }

  const handleSubmit = () => {
    setError(null)
    if (!detected.type) {
      setError('Could not detect monitor type from input')
      return
    }
    createMutation.mutate({
      name: name.trim(),
      type: detected.type,
      target: detected.target,
      intervalSeconds,
      timeoutSeconds: 10,
      retryCount: 1,
      config: detected.config,
      channelIds: selectedChannels,
    })
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Add monitor</h1>
        <p className="text-muted-foreground">A few quick steps and you're tracking uptime.</p>
      </header>

      <Stepper current={step} />

      <Card>
        <CardHeader>
          <CardTitle>{['What to check?', 'How often?', 'Where to alert?'][step]}</CardTitle>
          <CardDescription>
            {step === 0 && 'Paste a URL, host, or host:port. Type is auto-detected.'}
            {step === 1 && 'Sensible defaults are pre-filled.'}
            {step === 2 && 'Optional — pick existing channels (or skip).'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="target">URL or host</Label>
                <Input
                  id="target"
                  placeholder="https://example.com or db.example.com:5432"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  autoFocus
                />
                {detected.type && (
                  <p className="text-xs text-muted-foreground">
                    Detected: <span className="font-medium uppercase">{detected.type}</span> check on{' '}
                    <span className="font-mono">{detected.target}</span>
                  </p>
                )}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  placeholder={defaultName(detected.target) ?? 'My monitor'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval">Check interval</Label>
                <Select
                  value={String(intervalSeconds)}
                  onValueChange={(v) => setIntervalSeconds(Number(v))}
                >
                  <SelectTrigger id="interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Every 30 seconds</SelectItem>
                    <SelectItem value="60">Every 1 minute</SelectItem>
                    <SelectItem value="300">Every 5 minutes</SelectItem>
                    <SelectItem value="900">Every 15 minutes</SelectItem>
                    <SelectItem value="3600">Every hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              {channelsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading channels…</p>
              ) : channelsQuery.data?.channels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No notification channels yet. You can add them later from Channels and link them
                  to this monitor.
                </p>
              ) : (
                <div className="space-y-2">
                  {channelsQuery.data?.channels.map((c) => {
                    const checked = selectedChannels.includes(c.id)
                    return (
                      <label
                        key={c.id}
                        className={cn(
                          'flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors',
                          checked ? 'bg-accent border-primary' : 'hover:bg-accent/50',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedChannels((prev) =>
                              prev.includes(c.id)
                                ? prev.filter((id) => id !== c.id)
                                : [...prev, c.id],
                            )
                          }
                          className="h-4 w-4"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground uppercase">{c.type}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => (step === 0 ? navigate('/admin') : setStep(step - 1))}
          disabled={createMutation.isPending}
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canAdvance()}>
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create monitor'}
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
              i < current && 'bg-primary text-primary-foreground',
              i === current && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
              i > current && 'bg-muted text-muted-foreground',
            )}
          >
            {i < current ? <Check className="h-3 w-3" /> : i + 1}
          </span>
          <span className={cn(i === current ? 'font-medium' : 'text-muted-foreground')}>
            {label}
          </span>
          {i < STEPS.length - 1 && <span className="text-muted-foreground/50">›</span>}
        </li>
      ))}
    </ol>
  )
}

function detectType(input: string): {
  type: MonitorType | null
  target: string
  config: Record<string, unknown>
} {
  const trimmed = input.trim()
  if (!trimmed) return { type: null, target: '', config: {} }

  if (/^https?:\/\//i.test(trimmed)) {
    return { type: 'http', target: trimmed, config: {} }
  }

  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4.test(trimmed)) {
    return { type: 'ping', target: trimmed, config: {} }
  }

  const hostPort = trimmed.match(/^([^\s:]+):(\d+)$/)
  if (hostPort) {
    return {
      type: 'tcp',
      target: trimmed,
      config: { port: Number(hostPort[2]) },
    }
  }

  // Bare hostname → assume HTTP with https://
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(trimmed)) {
    return { type: 'http', target: `https://${trimmed}`, config: {} }
  }

  return { type: null, target: trimmed, config: {} }
}

function defaultName(target: string): string | null {
  if (!target) return null
  try {
    const url = new URL(target)
    return url.hostname
  } catch {
    return target.split(':')[0] ?? target
  }
}
