#!/usr/bin/env bash
#
# start-ui.sh — install deps (if needed) and start the scaffold web UI.
# Called by the SessionStart hook or manually.
#
# Usage:
#   ./start-ui.sh <vault-root>
#   ./start-ui.sh              # defaults vault root to CWD
#

set -euo pipefail

# Find the plugin root (directory containing .claude-plugin/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$PLUGIN_DIR/app"

# Vault root: first arg, or CWD
VAULT_ROOT="${1:-$(pwd)}"
VAULT_ROOT="$(cd "$VAULT_ROOT" && pwd)"

# Install deps if needed (silent, fast — skips if node_modules exists)
if [ ! -d "$APP_DIR/node_modules" ]; then
  echo "Installing novus-toolkit dependencies..."
  npm install --prefix "$APP_DIR" --silent 2>/dev/null
fi

# Start the server if not already running on port 3847
if lsof -ti:3847 >/dev/null 2>&1; then
  echo "Scaffold UI already running at http://localhost:3847"
else
  nohup node "$APP_DIR/dist/server.js" "$VAULT_ROOT" >/dev/null 2>&1 &
  # Brief pause to let the server bind
  sleep 0.5
  if lsof -ti:3847 >/dev/null 2>&1; then
    echo "Scaffold UI started at http://localhost:3847 (vault: $VAULT_ROOT)"
  else
    echo "Warning: Scaffold UI failed to start. Run manually:"
    echo "  node $APP_DIR/dist/server.js $VAULT_ROOT"
  fi
fi
