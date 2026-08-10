# @pingboard/mcp

An [MCP](https://modelcontextprotocol.io) server for PingBoard. Ask your
assistant what's down, why a check is failing, or to schedule maintenance —
without leaving the editor.

```
> which monitors are down?
> why did the API check fail this morning?
> schedule maintenance on the database for tonight 2–4am
```

It talks to a running PingBoard over its REST API, so it works against
`localhost` or a remote instance, and nothing is added to the container.

## Setup

1. In PingBoard, go to **Settings → API tokens** and create one. It's shown
   once.
2. Point the server at your instance with two environment variables:

| Variable | Example |
|---|---|
| `PINGBOARD_URL` | `http://localhost:3000` |
| `PINGBOARD_TOKEN` | `pb_…` |

### From a clone of this repo

The package is not on npm yet, so until it is published, run the compiled
build straight from the repo:

```bash
bun install && bun run --filter @pingboard/mcp build
```

```json
{
  "mcpServers": {
    "pingboard": {
      "command": "node",
      "args": ["/absolute/path/to/PingBoard/apps/mcp/dist/index.js"],
      "env": {
        "PINGBOARD_URL": "http://localhost:3000",
        "PINGBOARD_TOKEN": "pb_..."
      }
    }
  }
}
```

### Claude Code (once published to npm)

```bash
claude mcp add pingboard \
  --env PINGBOARD_URL=http://localhost:3000 \
  --env PINGBOARD_TOKEN=pb_... \
  -- npx -y @pingboard/mcp
```

### Claude Desktop, Cursor, Zed (once published to npm)

Add to the client's MCP config:

```json
{
  "mcpServers": {
    "pingboard": {
      "command": "npx",
      "args": ["-y", "@pingboard/mcp"],
      "env": {
        "PINGBOARD_URL": "http://localhost:3000",
        "PINGBOARD_TOKEN": "pb_..."
      }
    }
  }
}
```

## Tools

**Reading**

| Tool | What it answers |
|---|---|
| `list_monitors` | What exists and what state is it in — optionally filtered by status |
| `get_monitor` | Full config, recent heartbeats and incident history for one check |
| `list_incidents` | Every down→up transition, open or resolved |
| `list_status_pages` | Public pages, their slugs and how many monitors each publishes |
| `get_status_page` | One page's full settings plus the monitors it publishes, in order |
| `list_maintenance_windows` | Scheduled downtime |
| `list_notification_channels` | Where alerts go, and whether each channel is enabled |
| `run_check` | Run one check right now without saving it — useful before creating a monitor |

**Writing**

| Tool | Notes |
|---|---|
| `create_monitor` | Attach `channelIds`, or failures page nobody |
| `set_monitor_paused` | Pause or resume checks |
| `delete_monitor` | Permanent — marked destructive |
| `resolve_incident` | Manually close an open incident |
| `annotate_incident` | Add an explanation; notes appear on the public status page |
| `schedule_maintenance` | Preferred over pausing for planned downtime — heartbeats keep recording honestly |
| `create_status_page` | Slug is permanent; attach `monitors` or the page shows nothing |
| `update_status_page` | Omitted fields are untouched; passing `monitors` replaces the whole list |
| `delete_status_page` | Permanent — marked destructive. Monitors themselves are untouched |

Read-only tools are annotated as such, and both delete tools are annotated
destructive, so clients can gate or confirm them.

## Notes

A token has the same access as the admin account — there are no scopes yet.
Revoking it from Settings takes effect immediately.

Deliberately not included: anything that acts on the *monitored* systems.
PingBoard observes; remediation belongs to whatever you actually run. Logo
uploads are also UI-only — the API takes multipart forms, which doesn't map
cleanly onto MCP.
