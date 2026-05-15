import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Calendar03Icon,
  Delete02Icon,
  LinkSquare02Icon,
} from '@hugeicons/core-free-icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { useConfirm } from '@/components/confirm-provider'
import { api } from '@/lib/api'

interface MaintenanceWindow {
  id: string
  monitorId: string
  monitorName: string
  title: string
  description: string | null
  startsAt: string
  endsAt: string
}

export function MaintenancePage() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const query = useQuery({
    queryKey: ['maintenance-windows'],
    queryFn: () =>
      api.get<{ windows: MaintenanceWindow[] }>('/api/admin/maintenance-windows'),
  })

  const remove = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/admin/maintenance-windows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-windows'] })
      toast.success('Maintenance window removed')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to remove'),
  })

  const windows = query.data?.windows ?? []
  const now = Date.now()

  const active = windows.filter((w) => {
    const start = new Date(w.startsAt).getTime()
    const end = new Date(w.endsAt).getTime()
    return start <= now && end >= now
  })
  const upcoming = windows.filter((w) => new Date(w.startsAt).getTime() > now)
  const past = windows.filter((w) => new Date(w.endsAt).getTime() < now)

  if (!query.isLoading && windows.length === 0) {
    return (
      <div className="px-4 lg:px-6 flex flex-col gap-6">
        <p className="text-muted-foreground">
          Suppress alerts during scheduled downtime. Windows still record real
          heartbeats — they just don't page you.
        </p>
        <EmptyState
          icon={Calendar03Icon}
          title="No maintenance windows scheduled"
          description="Schedule one from a monitor's detail page when you're planning downtime."
        />
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6 flex flex-col gap-6">
      <p className="text-muted-foreground">
        Suppress alerts during scheduled downtime. Windows still record real
        heartbeats — they just don't page you.
      </p>

      <Section
        title="In progress"
        description={active.length === 0 ? 'Nothing right now.' : `${active.length} active`}
        windows={active}
        onDelete={(w) =>
          confirm({
            title: `End "${w.title}" now?`,
            description:
              'Alerts during this window will resume immediately.',
            confirmLabel: 'End window',
            destructive: true,
          }).then((ok) => ok && remove.mutate(w.id))
        }
        emphasize="active"
      />

      <Section
        title="Upcoming"
        description={upcoming.length === 0 ? 'No upcoming windows.' : `${upcoming.length} scheduled`}
        windows={upcoming}
        onDelete={(w) =>
          confirm({
            title: `Cancel "${w.title}"?`,
            description: 'You can always schedule another one later.',
            confirmLabel: 'Cancel window',
            destructive: true,
          }).then((ok) => ok && remove.mutate(w.id))
        }
      />

      {past.length > 0 && (
        <Section
          title="Past"
          description={`${past.length} completed (last 50 shown)`}
          windows={past.slice(0, 50)}
          onDelete={(w) =>
            confirm({
              title: `Delete "${w.title}"?`,
              description: 'Past windows can be removed for cleanliness.',
              confirmLabel: 'Delete',
              destructive: true,
            }).then((ok) => ok && remove.mutate(w.id))
          }
        />
      )}
    </div>
  )
}

function Section({
  title,
  description,
  windows,
  onDelete,
  emphasize,
}: {
  title: string
  description: string
  windows: MaintenanceWindow[]
  onDelete: (w: MaintenanceWindow) => void
  emphasize?: 'active'
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {windows.length > 0 && (
        <CardContent className="divide-y">
          {windows.map((w) => (
            <div
              key={w.id}
              className="py-3 flex items-start justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{w.title}</span>
                  {emphasize === 'active' && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-500/15 text-amber-700 dark:text-amber-400 uppercase text-[10px] tracking-wide"
                    >
                      In progress
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  <Link
                    to={`/admin/monitors/${w.monitorId}`}
                    className="inline-flex items-center gap-1 hover:text-foreground hover:underline underline-offset-4"
                  >
                    <HugeiconsIcon
                      icon={LinkSquare02Icon}
                      className="h-3 w-3"
                      strokeWidth={2}
                    />
                    {w.monitorName}
                  </Link>
                  <span className="mx-2">·</span>
                  {new Date(w.startsAt).toLocaleString()} →{' '}
                  {new Date(w.endsAt).toLocaleString()}
                </div>
                {w.description && (
                  <div className="text-xs text-muted-foreground">
                    {w.description}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Delete ${w.title}`}
                onClick={() => onDelete(w)}
              >
                <HugeiconsIcon icon={Delete02Icon} className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}
