#!/bin/sh
set -e

# Ensure data dir is writable (mounted volume)
mkdir -p "${DATA_DIR:-/data}"

# Subcommand support: `docker exec pingboard pingboard <cmd>` runs the CLI.
if [ "$#" -gt 0 ]; then
  exec bun run /app/apps/pingboard/src/cli.ts "$@"
fi

# Default: start the server
exec bun run /app/apps/pingboard/src/server.ts
