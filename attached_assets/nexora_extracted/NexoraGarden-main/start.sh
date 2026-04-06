#!/bin/bash
set -e

# The API server listens on $PORT (set by Replit, default 3000).
# Vite runs internally on a fixed internal port and is proxied through the API server.
API_PORT=${PORT:-3000}
VITE_PORT=5173

# Start Vite dev server internally on the fixed internal port
BASE_PATH=/ PORT=$VITE_PORT pnpm --filter @workspace/dashboard run dev &
FRONTEND_PID=$!

# Wait for Vite to be ready (up to 30s)
echo "Waiting for Vite on port $VITE_PORT..."
for i in $(seq 1 30); do
  if nc -z 127.0.0.1 $VITE_PORT 2>/dev/null; then
    echo "Vite is ready"
    break
  fi
  sleep 1
done

# Start API server on the Replit-assigned port, proxying static to Vite
PORT=$API_PORT VITE_DEV_PORT=$VITE_PORT pnpm --filter @workspace/api-server run dev

# If API server exits, kill Vite too
kill $FRONTEND_PID 2>/dev/null
