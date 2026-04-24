# Deploy lên Leapcell.io

Repo này có **2 service riêng** — tạo 2 project Leapcell, mỗi project trỏ tới 1 Dockerfile riêng (Dockerfile gốc build cả 3 package nên quá nặng cho Leapcell free tier).

## Service 1 — Portfolio (Static frontend)

| Field | Value |
|---|---|
| Source | `khang26042012/Nexora` (branch `main`) |
| Build Type | **Dockerfile** |
| Dockerfile Path | `Dockerfile.portfolio` |
| Port | `8080` |
| Service Type | Web Service |

Env vars: **không cần** (frontend thuần).

## Service 2 — API Server (Node.js + SQLite)

| Field | Value |
|---|---|
| Source | `khang26042012/Nexora` (branch `main`) |
| Build Type | **Dockerfile** |
| Dockerfile Path | `Dockerfile.api` |
| Port | `8080` |
| Service Type | Web Service |
| Persistent Volume | mount `/app/packages/api-server/data` (SQLite DB) |

Env vars cần set:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `TELEGRAM_TOKEN` | *(bot token)* |
| `TELEGRAM_CHAT_ID` | *(chat ID)* |
| `GEMINI_API_KEY` | *(Gemini API key)* |
| `WEATHER_API_KEY` | *(WeatherAPI key)* |

> `PORT` không cần set — Leapcell inject tự động qua `$PORT`.

## Vì sao tách Dockerfile?

- `Dockerfile` (gốc) build cả `nexora-garden` + `portfolio` + `api-server` → image > 1.5 GB, build > 8 phút → fail trên Leapcell free tier.
- `Dockerfile.portfolio`: chỉ install + build `@workspace/portfolio` (filter `...`) → output static, serve bằng `serve`.
- `Dockerfile.api`: chỉ install + build `@workspace/api-server` (filter `...`) → vẫn cài `ffmpeg` + native build cho `better-sqlite3`.

## Sau khi push GitHub

Cả 2 service trên Leapcell sẽ tự rebuild khi `main` có commit mới.
