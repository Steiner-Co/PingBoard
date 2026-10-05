import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { Pulse } from "@phosphor-icons/react/dist/icons/Pulse"
import { PlusCircle } from "@phosphor-icons/react/dist/icons/PlusCircle"
import { MagnifyingGlass } from "@phosphor-icons/react/dist/icons/MagnifyingGlass"
import { ArrowClockwise } from "@phosphor-icons/react/dist/icons/ArrowClockwise"
import { ArrowDown } from "@phosphor-icons/react/dist/icons/ArrowDown"
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft"
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight"
import { DotsThreeOutlineVertical } from "@phosphor-icons/react/dist/icons/DotsThreeOutlineVertical"
import { Pause } from "@phosphor-icons/react/dist/icons/Pause"
import { Play } from "@phosphor-icons/react/dist/icons/Play"
import { Trash } from "@phosphor-icons/react/dist/icons/Trash"

import { Button } from '@/components/ui/button'
import { Panel } from '@/components/panel'
import { QueryError } from '@/components/QueryError'
import { Skeleton } from '@/components/ui/skeleton'
import { ScreenHeader, SegmentFilter, StatusCell } from '@/components/screen'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useConfirm } from '@/components/confirm-provider'
import { UptimeBars } from '@/components/uptime-bars'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useSSE } from '@/lib/sse'
import type { MonitorUptime, MonitorWithLatest } from '@/types'

type StatusFilter = 'all' | 'down' | 'up' | 'disabled'

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'down', label: 'Down' },
  { id: 'up', label: 'Up' },
  { id: 'disabled', label: 'Disabled' },
]

const PAGE_SIZE = 10

// Degraded reads as disabled on this screen — one vocabulary for anything
// that isn't cleanly up or down.
function statusOf(monitor: MonitorWithLatest): 'up' | 'down' | 'disabled' | 'pending' {
  if (monitor.paused) return 'disabled'
  if (!monitor.latest) return 'pending'
  if (monitor.latest.status === 'up') return 'up'
  if (monitor.latest.status === 'down') return 'down'
  return 'disabled'
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['monitors'],
    queryFn: () => api.get<{ monitors: MonitorWithLatest[] }>('/api/admin/monitors'),
  })
  // 30-day uptime per monitor — one aggregate call, joined into the table by id.
  const uptimeQuery = useQuery({
    queryKey: ['monitors-uptime'],
    queryFn: () =>
      api.get<{ uptime: Record<string, MonitorUptime> }>(
        '/api/admin/monitors/uptime',
      ),
    staleTime: 60_000,
  })
  const uptimeById = useMemo(
    () => new Map(Object.entries(uptimeQuery.data?.uptime ?? {})),
    [uptimeQuery.data],
  )

  // Live updates: any heartbeat/incident event refreshes the list.
  useSSE('/api/admin/sse', {
    heartbeat: () => {
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
      void queryClient.invalidateQueries({ queryKey: ['monitors-uptime'] })
    },
    'incident.opened': () => {
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
    },
    'incident.resolved': () => {
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
    },
  })

  // Domains have their own portfolio screen — the monitors table is about
  // up/down checks, and a domain's expiry isn't that signal.
  const monitors = (query.data?.monitors ?? []).filter((m) => m.type !== 'domain')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)
  const reduceMotion = useReducedMotion() ?? false

  const counts = useMemo(() => {
    let down = 0
    let up = 0
    let disabled = 0
    for (const m of monitors) {
      const s = statusOf(m)
      if (s === 'down') down++
      else if (s === 'up') up++
      else if (s === 'disabled') disabled++
    }
    return { all: monitors.length, down, up, disabled }
  }, [monitors])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return monitors.filter((m) => {
      const s = statusOf(m)
      if (statusFilter === 'down' && s !== 'down') return false
      if (statusFilter === 'up' && s !== 'up') return false
      if (statusFilter === 'disabled' && s !== 'disabled') return false
      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) ||
        m.target.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [monitors, search, statusFilter])

  // A new filter/search starts back on the first page; deleting the last row
  // of a page steps back into range.
  useEffect(() => {
    setPage(0)
  }, [search, statusFilter])
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1))
  }, [pageCount])
  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  if (query.isPending) return <DashboardSkeleton />
  if (query.isError) {
    return (
      <div className="px-4 lg:px-6">
        <QueryError subject="monitors" onRetry={() => void query.refetch()} />
      </div>
    )
  }
  if (query.isSuccess && monitors.length === 0) {
    return <EmptyDashboard />
  }

  const refreshing = query.isFetching || uptimeQuery.isFetching
  const refresh = () => {
    void query.refetch()
    void uptimeQuery.refetch()
  }

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <ScreenHeader
        title="Monitors"
        description="Every check, it’s current state and thirty days of history"
      />

      <div className="flex flex-wrap items-center gap-3">
        <SegmentFilter
          label="Status filter"
          options={STATUS_FILTERS.map((f) => ({ ...f, count: counts[f.id] }))}
          value={statusFilter}
          onChange={setStatusFilter}
          reduceMotion={reduceMotion}
          layoutId="monitors-segment-pill"
        />
        <div className="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-[background-color,transform] duration-150 ease-out hover:bg-muted active:scale-[0.96] disabled:opacity-60"
          >
            <Icon
              icon={ArrowClockwise}
              className={cn('size-[19px]', refreshing && 'animate-spin')}
            />
          </button>
          <label className="flex h-10 w-full items-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-medium sm:w-[153px]">
            <Icon icon={MagnifyingGlass} className="size-[19px] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              aria-label="Search monitors"
              className="w-full bg-transparent outline-none placeholder:text-foreground"
            />
          </label>
        </div>
      </div>

      <Panel className="overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th scope="col" className="px-6 py-4 text-left text-base font-medium">
                  Name
                </th>
                <th scope="col" className="w-[12%] px-6 py-4 text-left text-base font-medium">
                  Status
                </th>
                <th scope="col" className="hidden w-[12%] px-6 py-4 text-left text-base font-medium md:table-cell">
                  Response
                </th>
                <th scope="col" className="hidden px-6 py-4 text-left text-base font-medium lg:table-cell">
                  Uptime
                </th>
                <th scope="col" className="w-12 px-2 py-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No monitors match this filter.
                  </td>
                </tr>
              ) : (
                <AnimatePresence initial={false}>
                  {pageRows.map((m, i) => (
                    <MonitorRow
                      key={m.id}
                      monitor={m}
                      uptime={uptimeById.get(m.id)}
                      index={i}
                      reduceMotion={reduceMotion}
                    />
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs tabular-nums text-muted-foreground">
            {rows.length} {rows.length === 1 ? 'monitor' : 'monitors'}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">
              Page {page + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              className="size-7"
              size="icon"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <span className="sr-only">Go to previous page</span>
              <Icon icon={ArrowLeft} />
            </Button>
            <Button
              variant="outline"
              className="size-7"
              size="icon"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
            >
              <span className="sr-only">Go to next page</span>
              <Icon icon={ArrowRight} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function MonitorRow({
  monitor,
  uptime,
  index,
  reduceMotion,
}: {
  monitor: MonitorWithLatest
  uptime: MonitorUptime | undefined
  index: number
  reduceMotion: boolean
}) {
  const status = statusOf(monitor)
  return (
    <motion.tr
      initial={reduceMotion ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.18,
        ease: [0.25, 1, 0.5, 1],
        delay: reduceMotion ? 0 : Math.min(index * 0.02, 0.12),
      }}
      className="relative border-b border-border transition-colors last:border-b-0 hover:bg-muted/40"
    >
      <td className="px-6 py-5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Link
            to={`/admin/monitors/${monitor.id}`}
            className="inline-block max-w-full truncate text-lg font-medium tracking-tight outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {monitor.name}
          </Link>
          {monitor.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-1 max-w-full truncate text-xs font-medium" title={monitor.target}>
          {monitor.target}
        </div>
      </td>
      <td className="px-6 py-5">
        <StatusCell status={status} />
      </td>
      <td className="hidden px-6 py-5 md:table-cell">
        {status === 'up' ? (
          monitor.latest?.responseTimeMs == null ? (
            <span className="text-lg text-muted-foreground">—</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-lg font-medium tabular-nums">
              <Icon icon={ArrowDown} className="size-3.5 text-success" />
              {monitor.latest.responseTimeMs}ms
            </span>
          )
        ) : (
          <span className="text-lg text-muted-foreground">—</span>
        )}
      </td>
      <td className="hidden px-6 py-5 lg:table-cell">
        <UptimeBars variant="chunky" uptime={uptime} />
      </td>
      <td className="w-12 px-2 py-5 text-right">
        <RowActions monitor={monitor} />
      </td>
    </motion.tr>
  )
}

function RowActions({ monitor }: { monitor: MonitorWithLatest }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const isPaused = monitor.paused

  const togglePause = useMutation({
    mutationFn: (paused: boolean) =>
      api.patch(`/api/admin/monitors/${monitor.id}`, { paused }),
    onSuccess: (_data, paused) => {
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
      toast.success(paused ? `Paused "${monitor.name}"` : `Resumed "${monitor.name}"`)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to update'),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/admin/monitors/${monitor.id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['monitors'] })
      toast.success(`Deleted "${monitor.name}"`)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to delete'),
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${monitor.name}`}
          // Above the row's stretched name link.
          className="relative z-10 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-[color,background-color] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 data-[state=open]:bg-muted"
        >
          <Icon icon={DotsThreeOutlineVertical} className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={() => navigate(`/admin/monitors/${monitor.id}`)}>
          Open detail
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => togglePause.mutate(!isPaused)}
          disabled={togglePause.isPending}
        >
          <Icon icon={isPaused ? Play : Pause} className="size-3.5" />
          {isPaused ? 'Resume' : 'Pause'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={async () => {
            const ok = await confirm({
              title: `Delete "${monitor.name}"?`,
              description:
                'All heartbeats, incidents, and links to status pages will be removed. This cannot be undone.',
              confirmLabel: 'Delete monitor',
              destructive: true,
            })
            if (ok) remove.mutate()
          }}
        >
          <Icon icon={Trash} className="size-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-12 w-80 rounded-full" />
        <div className="ml-auto flex items-center gap-2.5">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-10 w-[153px] rounded-full" />
        </div>
      </div>
      <Panel className="overflow-hidden rounded-2xl">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border/60 p-6 last:border-b-0">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-9 w-64" />
          </div>
        ))}
      </Panel>
    </div>
  )
}

function EmptyDashboard() {
  return (
    <div className="px-4 lg:px-6">
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 rounded-lg border border-dashed bg-card/50 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon icon={Pulse} className="h-6 w-6" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-semibold tracking-tight">No monitors yet</h2>
          <p className="text-muted-foreground text-sm">
            Add your first check to start tracking uptime. The table will
            light up as soon as the first heartbeat lands — usually within a
            couple of seconds.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/monitors/new" className="gap-2">
            <Icon icon={PlusCircle} className="h-4 w-4" />
            Add your first check
          </Link>
        </Button>
      </div>
    </div>
  )
}
