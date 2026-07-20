#!/usr/bin/env bun
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { PingBoardClient } from './client.js'
import { registerTools } from './tools.js'

const VERSION = '0.0.0'

function usage(problem: string): never {
  // stderr, never stdout: stdout is the JSON-RPC channel and any stray byte
  // there corrupts the protocol.
  console.error(
    [
      `pingboard-mcp: ${problem}`,
      '',
      'Required environment:',
      '  PINGBOARD_URL    Base URL of your instance, e.g. http://localhost:3000',
      '  PINGBOARD_TOKEN  API token — create one under Settings → API tokens',
      '',
      'Example client config:',
      '  {',
      '    "mcpServers": {',
      '      "pingboard": {',
      '        "command": "npx",',
      '        "args": ["-y", "@pingboard/mcp"],',
      '        "env": {',
      '          "PINGBOARD_URL": "http://localhost:3000",',
      '          "PINGBOARD_TOKEN": "pb_..."',
      '        }',
      '      }',
      '    }',
      '  }',
    ].join('\n'),
  )
  process.exit(1)
}

async function main(): Promise<void> {
  const baseUrl = process.env.PINGBOARD_URL?.trim()
  const token = process.env.PINGBOARD_TOKEN?.trim()
  if (!baseUrl) usage('PINGBOARD_URL is not set.')
  if (!token) usage('PINGBOARD_TOKEN is not set.')

  const server = new McpServer(
    { name: 'pingboard', version: VERSION },
    {
      instructions:
        'PingBoard is a self-hosted uptime monitor. Use list_monitors to see current status, get_monitor to diagnose a failing check, and list_incidents for history. When creating monitors, attach a notification channel — otherwise failures page nobody. Prefer schedule_maintenance over pausing for planned downtime, since it keeps recording heartbeats honestly.',
    },
  )

  registerTools(server, new PingBoardClient({ baseUrl, token }))

  await server.connect(new StdioServerTransport())
  console.error(`pingboard-mcp ready (${baseUrl})`)
}

main().catch((err) => {
  console.error('pingboard-mcp failed to start:', err)
  process.exit(1)
})
