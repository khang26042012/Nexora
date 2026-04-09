#!/bin/bash
set -e

echo "=============================="
echo " NexoraGarden — Startup Script"
echo "=============================="

# 1. Cài pnpm nếu chưa có
if ! command -v pnpm &> /dev/null; then
  echo "[pnpm] Installing pnpm..."
  npm install -g pnpm
fi
echo "[pnpm] $(pnpm --version)"

# 2. Cài deps (skip scripts để nhanh, native build riêng bên dưới)
echo "[deps] Installing packages..."
pnpm install --ignore-scripts

# 3. Build native better-sqlite3 nếu chưa có binary
SQLITE_BIN="node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
if [ ! -f "$SQLITE_BIN" ]; then
  echo "[sqlite3] Building native binary..."
  npm install -g node-gyp --prefix=/tmp/gyp-install 2>/dev/null
  cd node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3
  /tmp/gyp-install/bin/node-gyp configure
  /tmp/gyp-install/bin/node-gyp build
  cd ../../../../..
  echo "[sqlite3] Done"
else
  echo "[sqlite3] Binary exists, skip build"
fi

# 4. Build frontends + api-server nếu chưa build
if [ ! -f "packages/api-server/dist/index.mjs" ]; then
  echo "[build] Building all packages..."
  pnpm --filter @workspace/nexora-garden run build
  pnpm --filter @workspace/portfolio run build
  pnpm --filter @workspace/api-server run build
  echo "[build] Done"
else
  echo "[build] dist/ exists, skip build"
fi

# 5. Khởi động server
echo "[start] Starting API server on port ${PORT:-8080}..."
exec node packages/api-server/dist/index.mjs
