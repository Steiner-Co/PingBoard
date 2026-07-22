import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/confirm-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/api"
import { Panel } from "@/components/panel"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PauseIcon,
  PlayIcon,
  MoreVerticalCircle01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"

export const schema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  interval: z.string(),
  responseMs: z.number().nullable(),
  lastCheck: z.string().nullable(),
  tags: z.array(z.string()),
})

type MonitorRow = z.infer<typeof schema>

function StatusCell({ status }: { status: string }) {
  const dot =
    status === "UP"
      ? "bg-success"
      : status === "DOWN"
        ? "bg-destructive"
        : status === "DEGRADED"
          ? "bg-warning"
          : "bg-muted-foreground/60"
  const label = status.charAt(0) + status.slice(1).toLowerCase()
  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2 shrink-0 rounded-full", dot)} />
      <span
        className={cn(
          "text-sm",
          status === "DOWN" ? "font-medium text-destructive" : "text-foreground",
          (status === "PAUSED" || status === "PENDING") && "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  )
}

const columns: ColumnDef<MonitorRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />
    },
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusCell status={row.original.status} />,
  },
  {
    accessorKey: "target",
    header: "Target",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground truncate max-w-[260px] inline-block align-middle">
        {row.original.target}
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {row.original.type}
      </span>
    ),
  },
  {
    accessorKey: "responseMs",
    header: () => <div className="w-full text-right">Response</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono text-xs tabular-nums text-muted-foreground">
        {row.original.responseMs == null ? "—" : `${row.original.responseMs} ms`}
      </div>
    ),
  },
  {
    accessorKey: "lastCheck",
    header: () => <div className="w-full text-right">Last check</div>,
    cell: ({ row }) => (
      <div className="text-right text-xs tabular-nums text-muted-foreground whitespace-nowrap">
        {row.original.lastCheck ?? "—"}
      </div>
    ),
  },
  {
    accessorKey: "interval",
    header: () => <div className="w-full text-right">Interval</div>,
    cell: ({ row }) => (
      <div className="text-right text-xs tabular-nums text-muted-foreground">
        {row.original.interval}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions row={row.original} />,
  },
]

function RowActions({ row }: { row: MonitorRow }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const isPaused = row.status === "PAUSED"

  const togglePause = useMutation({
    mutationFn: (paused: boolean) =>
      api.patch(`/api/admin/monitors/${row.id}`, { paused }),
    onSuccess: (_data, paused) => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] })
      toast.success(paused ? `Paused "${row.name}"` : `Resumed "${row.name}"`)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to update"),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/admin/monitors/${row.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] })
      toast.success(`Deleted "${row.name}"`)
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to delete"),
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
          size="icon"
          aria-label={`Actions for ${row.name}`}
        >
          <HugeiconsIcon icon={MoreVerticalCircle01Icon} strokeWidth={2} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={() => navigate(`/admin/monitors/${row.id}`)}>
          Open detail
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => togglePause.mutate(!isPaused)}
          disabled={togglePause.isPending}
        >
          <HugeiconsIcon
            icon={isPaused ? PlayIcon : PauseIcon}
            className="h-3.5 w-3.5"
          />
          {isPaused ? "Resume" : "Pause"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={async () => {
            const ok = await confirm({
              title: `Delete "${row.name}"?`,
              description:
                "All heartbeats, incidents, and links to status pages will be removed. This cannot be undone.",
              confirmLabel: "Delete monitor",
              destructive: true,
            })
            if (ok) remove.mutate()
          }}
        >
          <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function DataTable({
  data,
}: {
  data: z.infer<typeof schema>[]
}) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 15,
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return (
    <div className="w-full flex flex-col justify-start gap-4">
      <div className="relative flex flex-col gap-4 overflow-auto">
        <Panel>
          <div className="hidden overflow-x-auto sm:block">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        onClick={
                          cell.column.id === "actions"
                            ? (e) => e.stopPropagation()
                            : undefined
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          <ul className="divide-y divide-border/60 sm:hidden">
            {table.getRowModel().rows.length === 0 ? (
              <li className="p-4 text-center text-sm text-muted-foreground">
                No results.
              </li>
            ) : (
              table.getRowModel().rows.map((row) => (
                <MonitorCard key={row.id} row={row.original} />
              ))
            )}
          </ul>
        </Panel>
        <div className="flex items-center justify-between">
          <div className="text-xs tabular-nums text-muted-foreground">
            {table.getFilteredRowModel().rows.length}{' '}
            {table.getFilteredRowModel().rows.length === 1 ? 'monitor' : 'monitors'}
          </div>
          {table.getPageCount() > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs tabular-nums text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                className="size-7"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              </Button>
              <Button
                variant="outline"
                className="size-7"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MonitorCard({ row }: { row: MonitorRow }) {
  return (
    <li className="flex items-start gap-3 p-3">
      <Link
        to={`/admin/monitors/${row.id}`}
        className="min-w-0 flex-1 space-y-1"
      >
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-foreground">{row.name}</span>
          {row.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="shrink-0 px-1.5 py-0 font-mono text-[10px] text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
        </div>
        <div className="truncate font-mono text-xs text-muted-foreground">
          {row.target}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] tabular-nums text-muted-foreground">
          <StatusCell status={row.status} />
          <span aria-hidden>·</span>
          <span>{row.responseMs == null ? '—' : `${row.responseMs} ms`}</span>
          <span aria-hidden>·</span>
          <span>{row.lastCheck ?? '—'}</span>
          <span aria-hidden>·</span>
          <span>{row.interval}</span>
        </div>
      </Link>
      <div className="shrink-0">
        <RowActions row={row} />
      </div>
    </li>
  )
}

function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Link
        to={`/admin/monitors/${item.id}`}
        className="truncate font-medium text-foreground hover:underline underline-offset-4"
      >
        {item.name}
      </Link>
      {item.tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="hidden shrink-0 px-1.5 py-0 font-mono text-[10px] text-muted-foreground sm:inline-flex"
        >
          {tag}
        </Badge>
      ))}
    </div>
  )
}
