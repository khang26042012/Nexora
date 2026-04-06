#!/bin/bash
set -e

# Install workspace dependencies
# Note: better-sqlite3 requires native compilation via node-gyp
# Use --ignore-scripts for speed when binary is cached, then rebuild if needed
pnpm install --frozen-lockfile

# Rebuild native addons (better-sqlite3) if needed
if ! node -e "require('better-sqlite3')" 2>/dev/null; then
  echo "Rebuilding better-sqlite3..."
  pnpm rebuild better-sqlite3
fi

echo "Post-merge setup complete."
