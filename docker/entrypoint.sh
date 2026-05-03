#!/bin/sh
set -e

# Ensure data dir is writable (mounted volume)
mkdir -p "${DATA_DIR:-/data}"

# Subcommand support: `docker exec pingboard pingboard <cmd>` runs the CLI.
# Invoke `bun` directly (not `bun run`) — `bun run` walks up the tree
# looking for package.json and adds noticeable cold-boot latency.
if [ "$#" -gt 0 ]; then
  exec bun /app/cli.js "$@"
fi

# Default: start the server.
exec bun /app/server.js
