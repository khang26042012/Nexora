# Deploy lên Leapcell.io

Repo này là **monorepo 1 service**: `api-server` build sẵn cả 2 frontend (`portfolio` + `nexora-garden`) rồi serve qua Express:
- `/` → portfolio (apps/portfolio/dist/public)
- `/NexoraGarden` → nexora-garden (apps/nexora-garden/dist/public)
- `/api/*` → API routes
- `/ws`, `/ws-browser` → WebSocket

→ Chỉ cần **1 service** trên Leapcell, dùng `Dockerfile` gốc.

## Cấu hình Leapcell

| Field | Value |
|---|---|
| Source | `khang26042012/Nexora` (branch `main`) |
| Build Type | **Dockerfile** |
| Dockerfile Path | `Dockerfile` |
| Port | `8080` |
| Service Type | Web Service |
| Persistent Volume | mount `/app/packages/api-server/data` (SQLite DB) |

> `PORT` không cần set — Leapcell inject tự động qua `$PORT`.

## Environment variables

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `TELEGRAM_TOKEN` | *(bot token)* |
| `TELEGRAM_CHAT_ID` | *(chat ID)* |
| `GEMINI_API_KEY` | *(Gemini API key)* |
| `WEATHER_API_KEY` | *(WeatherAPI key)* |
| `TELEGRAM_WEBHOOK_URL` | `https://<domain-leapcell>/NexoraGarden/telegram-webhook` |
| `TELEGRAM_WEBHOOK_SECRET` | *(secret webhook)* |

## Sau khi deploy

- Frontend portfolio: `https://<domain>/`
- Dashboard NexoraGarden: `https://<domain>/NexoraGarden`
- Health check: `https://<domain>/NexoraGarden/health`

ESP32 trỏ `SERVER_HOST` → domain Leapcell, `WS_PATH` = `/NexoraGarden/ws`.

## Auto-deploy

Push `main` → Leapcell tự rebuild Dockerfile → deploy.
