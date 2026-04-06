#!/bin/bash
set -e

# Install workspace dependencies (frozen lockfile for reproducibility)
pnpm install --frozen-lockfile

# Rebuild native addons (better-sqlite3) if not loadable in the package that owns it
if ! pnpm --filter @workspace/api-server exec node -e "require('better-sqlite3')" 2>/dev/null; then
  echo "Rebuilding better-sqlite3..."
  pnpm rebuild better-sqlite3
fi

echo "Post-merge setup complete."
