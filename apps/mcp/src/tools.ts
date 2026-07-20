import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { PingBoardError, type PingBoardClient } from './client.js'

const MONITOR_TYPES = [
  'http',
  'tcp',
  'ping',
  'dns',
  'ssl',
  'domain',
  'push',
] as const

const ALLOWED_INTERVALS = [10, 30, 60, 300, 900, 3600] as const

interface Heartbeat {
  status: 'up' | 'down' | 'degraded'
  responseTimeMs: number | null
  statusCode: number | null
  message: string | null
  checkedAt: string
}

interface Monitor {
  id: string
  name: string
  type: string
  target: string
  intervalSeconds: number
  paused: boolean
  tags: string[]
  latest?: Heartbeat | null
  channelIds?: string[]
}

interface Incident {
  id: string
  monitorId: string
  monitorName: string
  startedAt: string
  resolvedAt: string | null
  cause: 'auto' | 'manual'
  note: string | null
}

/** MCP content is text; JSON keeps it unambiguous for the model to parse. */
function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

function fail(err: unknown) {
  const message =
    err instanceof PingBoardError
      ? err.message
      : err instanceof Error
        ? err.message
        : String(err)
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true,
  }
}

/** Wraps a handler so a transport-level failure reports as a tool error. */
function guard<A>(fn: (args: A) => Promise<ReturnType<typeof ok>>) {
  return async (args: A) => {
    try {
      return await fn(args)
    } catch (err) {
      return fail(err)
    }
  }
}

function statusOf(m: Monitor): string {
  if (m.paused) return 'paused'
  if (!m.latest) return 'pending'
  return m.latest.status
}

/** Trimmed shape — full rows carry config blobs the model doesn't need. */
function summarise(m: Monitor) {
  return {
    id: m.id,
    name: m.name,
    type: m.type,
    target: m.target,
    status: statusOf(m),
    intervalSeconds: m.intervalSeconds,
    tags: m.tags,
    lastCheckedAt: m.latest?.checkedAt ?? null,
    responseTimeMs: m.latest?.responseTimeMs ?? null,
    lastMessage: m.latest?.message || null,
    notifiesChannels: m.channelIds?.length ?? 0,
  }
}

export function registerTools(server: McpServer, client: PingBoardClient): void {
  // ─────────────── Read ───────────────

  server.registerTool(
    'list_monitors',
    {
      title: 'List monitors',
      description:
        'List all monitors with their current status (up, down, degraded, paused, or pending), target, check interval and last response time. Use this first to find a monitor id for the other tools.',
      inputSchema: {
        status: z
          .enum(['up', 'down', 'degraded', 'paused', 'pending'])
          .optional()
          .describe('Only return monitors currently in this state.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    guard(async ({ status }: { status?: string }) => {
      const { monitors } = await client.get<{ monitors: Monitor[] }>(
        '/api/admin/monitors',
      )
      const rows = monitors.map(summarise)
      return ok(status ? rows.filter((r) => r.status === status) : rows)
    }),
  )

  server.registerTool(
    'get_monitor',
    {
      title: 'Get monitor detail',
      description:
        'Full detail for one monitor: configuration, recent heartbeats from the last 24 hours, and its incident history. Use when diagnosing why a specific check is failing.',
      inputSchema: {
        monitorId: z.string().describe('Monitor id from list_monitors.'),
        heartbeatLimit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe('How many recent heartbeats to include. Default 20.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    guard(
      async ({
        monitorId,
        heartbeatLimit = 20,
      }: {
        monitorId: string
        heartbeatLimit?: number
      }) => {
        const detail = await client.get<{
          monitor: Monitor
          heartbeats: Heartbeat[]
          incidents: Incident[]
        }>(`/api/admin/monitors/${monitorId}`)
        return ok({
          monitor: summarise(detail.monitor),
          config: (detail.monitor as unknown as { config?: unknown }).config ?? {},
          recentHeartbeats: detail.heartbeats.slice(0, heartbeatLimit),
          incidents: detail.incidents,
        })
      },
    ),
  )

  server.registerTool(
    'list_incidents',
    {
      title: 'List incidents',
      description:
        'Incident history across all monitors — every down-to-up transition, with start time, resolution time and any note. Use to answer questions about reliability or what broke recently.',
      inputSchema: {
        state: z
          .enum(['open', 'resolved', 'all'])
          .optional()
          .describe('Filter by state. Default all.'),
        limit: z.number().int().min(1).max(200).optional().describe('Default 50.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    guard(
      async ({ state = 'all', limit = 50 }: { state?: string; limit?: number }) => {
        const { incidents } = await client.get<{ incidents: Incident[] }>(
          '/api/admin/incidents',
        )
        const filtered = incidents.filter((i) =>
          state === 'open'
            ? !i.resolvedAt
            : state === 'resolved'
              ? !!i.resolvedAt
              : true,
        )
        return ok(filtered.slice(0, limit))
      },
    ),
  )

  server.registerTool(
    'list_status_pages',
    {
      title: 'List status pages',
      description:
        'Public status pages on this instance, with slug, theme, whether a password is set, and how many monitors each publishes.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    guard(async () => ok(await client.get('/api/admin/pages'))),
  )

  server.registerTool(
    'list_maintenance_windows',
    {
      title: 'List maintenance windows',
      description:
        'Scheduled maintenance windows. Alerts are suppressed while a window is active and the public status page shows a banner.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    guard(async () => ok(await client.get('/api/admin/maintenance-windows'))),
  )

  server.registerTool(
    'list_notification_channels',
    {
      title: 'List notification channels',
      description:
        'Configured alert destinations (email, webhook, Discord, Slack, ntfy) and whether each is enabled. Channel ids are needed when creating a monitor that should page someone.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    guard(async () => ok(await client.get('/api/admin/channels'))),
  )

  // ─────────────── Write ───────────────

  server.registerTool(
    'create_monitor',
    {
      title: 'Create monitor',
      description:
        'Add a new monitor. Attach channelIds so failures actually notify someone — a monitor with no channels is checked but pages nobody.',
      inputSchema: {
        name: z.string().min(1).describe('Human-readable name.'),
        type: z.enum(MONITOR_TYPES).describe('Check type.'),
        target: z
          .string()
          .min(1)
          .describe(
            'URL for http, host:port for tcp, hostname for ping/dns/ssl/domain.',
          ),
        intervalSeconds: z
          .number()
          .int()
          .optional()
          .describe(`One of ${ALLOWED_INTERVALS.join(', ')}. Default 60.`),
        tags: z.array(z.string()).optional(),
        channelIds: z
          .array(z.string())
          .optional()
          .describe('Notification channel ids from list_notification_channels.'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    guard(async (args: Record<string, unknown>) => {
      const created = await client.post<{ monitor: Monitor }>(
        '/api/admin/monitors',
        args,
      )
      return ok(summarise(created.monitor))
    }),
  )

  server.registerTool(
    'set_monitor_paused',
    {
      title: 'Pause or resume a monitor',
      description:
        'Pause a monitor to stop checking it (and stop its alerts), or resume a paused one. Prefer schedule_maintenance for planned downtime, since that keeps recording heartbeats honestly.',
      inputSchema: {
        monitorId: z.string(),
        paused: z.boolean().describe('true to pause, false to resume.'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    guard(async ({ monitorId, paused }: { monitorId: string; paused: boolean }) => {
      const res = await client.patch<{ monitor: Monitor }>(
        `/api/admin/monitors/${monitorId}`,
        { paused },
      )
      return ok(summarise(res.monitor))
    }),
  )

  server.registerTool(
    'delete_monitor',
    {
      title: 'Delete monitor',
      description:
        'Permanently delete a monitor along with its heartbeats, incidents and status-page links. This cannot be undone — pause it instead if you only want to stop checks.',
      inputSchema: { monitorId: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    },
    guard(async ({ monitorId }: { monitorId: string }) => {
      await client.delete(`/api/admin/monitors/${monitorId}`)
      return ok({ deleted: monitorId })
    }),
  )

  server.registerTool(
    'run_check',
    {
      title: 'Run a one-off check',
      description:
        'Run a single check against a target right now and return the result without saving anything. Use to validate a target before creating a monitor, or to see whether something is reachable from the PingBoard host.',
      inputSchema: {
        type: z.enum(MONITOR_TYPES.filter((t) => t !== 'push') as unknown as [string, ...string[]]),
        target: z.string().min(1),
        timeoutSeconds: z.number().int().min(1).max(60).optional(),
        config: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Type-specific options, e.g. { "expectedStatusCodes": [200] }.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    guard(async (args: Record<string, unknown>) =>
      ok(await client.post('/api/admin/monitors/run', args)),
    ),
  )

  server.registerTool(
    'resolve_incident',
    {
      title: 'Resolve an incident',
      description:
        'Manually close an open incident. The monitor keeps checking; this only marks the incident resolved.',
      inputSchema: { incidentId: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    guard(async ({ incidentId }: { incidentId: string }) =>
      ok(await client.post(`/api/admin/incidents/${incidentId}/resolve`)),
    ),
  )

  server.registerTool(
    'annotate_incident',
    {
      title: 'Add a note to an incident',
      description:
        'Attach an explanation to an incident, e.g. "upstream provider outage, not our fault". Notes show on the public status page.',
      inputSchema: {
        incidentId: z.string(),
        note: z.string().describe('Pass an empty string to clear the note.'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    guard(async ({ incidentId, note }: { incidentId: string; note: string }) =>
      ok(await client.patch(`/api/admin/incidents/${incidentId}`, { note })),
    ),
  )

  server.registerTool(
    'schedule_maintenance',
    {
      title: 'Schedule a maintenance window',
      description:
        'Suppress alerts for a monitor over a time range. Heartbeats are still recorded truthfully and the public status page shows a banner, so this is the honest way to handle planned downtime.',
      inputSchema: {
        monitorId: z.string(),
        title: z.string().min(1).describe('Shown on the status page.'),
        startsAt: z.string().describe('ISO 8601 timestamp.'),
        endsAt: z.string().describe('ISO 8601 timestamp, after startsAt.'),
        description: z.string().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    guard(async (args: Record<string, unknown>) => {
      const start = Date.parse(args.startsAt as string)
      const end = Date.parse(args.endsAt as string)
      if (Number.isNaN(start) || Number.isNaN(end)) {
        throw new Error('startsAt and endsAt must be ISO 8601 timestamps.')
      }
      if (end <= start) throw new Error('endsAt must be after startsAt.')
      return ok(await client.post('/api/admin/maintenance-windows', args))
    }),
  )
}
