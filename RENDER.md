# Deploy lên Render.com

## Cách deploy nhanh nhất — Render Blueprint

Repo đã có file `render.yaml` ở root → Render tự đọc và setup mọi thứ.

### Bước 1 — Tạo account Render
- Vào https://render.com → **Sign Up with GitHub** (dùng `khang26042012`)

### Bước 2 — New Blueprint
1. Dashboard → **New** → **Blueprint**
2. Chọn repo `khang26042012/Nexora`
3. Branch: `main`
4. Render đọc `render.yaml` → preview cấu hình → bấm **Apply**

### Bước 3 — Set Environment Variables (secret)
Vào service `nexora` → **Environment** → điền các biến `sync: false`:

| Key | Value |
|---|---|
| `TELEGRAM_TOKEN` | bot token |
| `TELEGRAM_CHAT_ID` | chat ID |
| `GEMINI_API_KEY` | Gemini key |
| `WEATHER_API_KEY` | WeatherAPI key |
| `TELEGRAM_WEBHOOK_URL` | `https://nexora.onrender.com/NexoraGarden/telegram-webhook` |
| `TELEGRAM_WEBHOOK_SECRET` | secret webhook |

`NODE_ENV` và `PORT` đã set sẵn trong `render.yaml`.

### Bước 4 — Đợi build & deploy
- Build lần đầu ~6-10 phút (Docker image lớn)
- URL public: `https://nexora.onrender.com`
- Auto-deploy: push GitHub → Render tự rebuild

## ⚠️ Hạn chế Render Free Tier

| Vấn đề | Giải pháp |
|---|---|
| **Sleep sau 15 phút không có traffic** | Cloudflare Worker ping mỗi 10 phút (xem DEPLOY.md mục Cloudflare Worker) |
| **KHÔNG có persistent disk free** | SQLite mất mỗi lần restart → cần upgrade $7/tháng cho disk, hoặc đổi sang Turso/PostgreSQL Render free |
| **750 giờ/tháng** | Đủ cho 1 service chạy 24/7 |
| **Cold start ~30s** sau khi sleep | Cron ping giải quyết |

## Cảnh báo SQLite

Render free **KHÔNG có persistent disk** — file `nexora.db` sẽ bị xoá mỗi lần restart. Lựa chọn:

1. **Chấp nhận mất data sensor** — chỉ giữ data trong RAM, mất khi restart
2. **Upgrade Render** $7/tháng cho 1GB disk persistent
3. **Đổi DB sang Render PostgreSQL free** (90 ngày, sau đó mất) — phải refactor `lib/db`
4. **Dùng Turso (SQLite cloud)** free 5GB — refactor minimal, vẫn dùng SQL syntax

## Custom domain `nexorax.cloud`

Service → **Settings** → **Custom Domain** → add `nexorax.cloud`
→ Cloudflare DNS:
| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `@` | `nexora.onrender.com` | Proxied |

## ESP32

```cpp
const char* SERVER_HOST = "nexorax.cloud";  // hoặc nexora.onrender.com
const int   SERVER_PORT = 443;
const char* WS_PATH     = "/NexoraGarden/ws";
```
