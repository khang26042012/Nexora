# Workspace — NexoraGarden Backend

## Overview

pnpm workspace monorepo using TypeScript. Backend server for NexoraGarden — a smart IoT agriculture system built on ESP32.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **WebSocket**: ws package (real-time ESP32 communication)
- **Database**: SQLite (better-sqlite3) — file at `artifacts/api-server/data/nexora.db`
- **Telegram bot**: node-telegram-bot-api (polling mode)
- **AI**: Google Gemini 2.0 Flash (@google/generative-ai)
- **Build**: esbuild (ESM bundle)
- **Deploy target**: Render.com

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   └── api-server/              # NexoraGarden Express API + WebSocket + Telegram + Gemini
│       ├── src/
│       │   ├── index.ts         # Entry — loads .env, inits DB, starts HTTP + WS server + Telegram
│       │   ├── app.ts           # Express setup, mounts GET /status and GET /logs
│       │   ├── db.ts            # SQLite setup + all DB query helpers
│       │   ├── routes.ts        # HTTP routes: GET /status, GET /logs
│       │   ├── websocket.ts     # WebSocket server at /ws — handles ESP32 real-time comms
│       │   ├── gemini.ts        # Gemini 2.0 Flash AI integration
│       │   ├── telegram.ts      # Telegram bot + all command handlers + sendTelegram()
│       │   └── lib/logger.ts    # Pino logger singleton
│       ├── data/nexora.db       # SQLite database (auto-created on first start)
│       └── .env                 # Local secrets (TELEGRAM_TOKEN, GEMINI_API_KEY, PORT)
├── lib/                         # Shared libraries (api-spec, api-zod, api-client-react, db)
├── render.yaml                  # Render.com deployment config
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## WebSocket Protocol (`/ws`)

ESP32 connects via `wss://<host>/ws`

### ESP32 → Server:
```json
// Sensor data (every 200ms)
{ "type": "sensor", "soil": 50, "water": 30, "temp": 32.5, "hum": 80, "fire": false, "rain": false, "pump": false }

// Notification
{ "type": "notify", "message": "Tu dong bat bom: do am dat 25%" }
```

### Server → ESP32:
```json
{ "type": "command", "pump": "ON" }
```

### Server WebSocket Logic:
- On `sensor`: update system_state, insert sensor_log, run auto pump logic, push `command` if pump changed
- On `notify`: forward to Telegram if alert_enabled = true
- On connect: cancel offline timer, notify Telegram "✅ ESP32 đã kết nối lại", push current pump state
- On disconnect: wait 60s → send Telegram "⚠️ ESP32 mất kết nối"

## HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Full system state (UptimeRobot keepalive ping) |
| GET | `/logs` | Last 10 sensor log entries |

## Auto Pump Logic (run on every sensor message)

- `soil >= 70%` → pump OFF, pump_locked = 1
- `soil <= 30% AND soil > 0 AND !pump_locked` → pump ON
- If state changed → push `{ type: "command", pump }` to ESP32 immediately

## Database Schema

Three SQLite tables:
- `sensor_logs` — timestamped sensor readings (soil, water, temp, hum, fire, rain)
- `pump_logs` — pump activity history (action, trigger, soil_at_start, soil_at_end, duration_sec)
- `system_state` — single-row current state (id=1, always upsert)

## Telegram Bot Commands

`/start`, `/status`, `/weather`, `/logs`, `/report`, `/history`, `/pump_on`, `/pump_off`, `/alert_on`, `/alert_off`, `/clear`, `/help` + free text → Gemini AI

Pump commands (`/pump_on`, `/pump_off`) also push WebSocket command to ESP32 in real-time.

## Environment Variables

Set in `artifacts/api-server/.env` (dev) or Render Dashboard (prod):
```
TELEGRAM_TOKEN=...
GEMINI_API_KEY=...
PORT=3000
```

Chat ID is auto-saved when someone sends `/start` to the bot.

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — build + start dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle

## Render.com Deployment

See `render.yaml`. Add `TELEGRAM_TOKEN` and `GEMINI_API_KEY` in Render Dashboard → Environment.
Health check: `GET /status`
ESP32 WebSocket: `wss://nexorax.cloud/ws`
