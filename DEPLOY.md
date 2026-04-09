# Hướng dẫn Deploy NexoraGarden — Back4App Containers

## 1. Back4App Containers — Docker Hosting

### Đặc điểm
- **Miễn phí hoàn toàn** — không cần thẻ thanh toán
- GitHub auto-deploy: mỗi lần push → tự build Docker + deploy
- Zero-downtime deployment
- CPU: 0.25 vCPU | RAM: 256 MB | Transfer: 100 GB/tháng
- Sử dụng Dockerfile (đã có sẵn trong repo)

---

## Bước 1 — Tạo account Back4App

1. Vào [back4app.com](https://back4app.com) → **Sign Up** (miễn phí, không cần thẻ)
2. Chọn **Containers** (không phải Parse Server)

---

## Bước 2 — Tạo Container App

Dashboard → **Build new app** → **Containers as a Service**

---

## Bước 3 — Kết nối GitHub

- Chọn **GitHub** → cấp quyền → chọn repo `khang26042012/Nexora`
- Branch: `main`
- Back4App tự detect `Dockerfile` tại root ✅

---

## Bước 4 — Cấu hình

| Trường | Giá trị |
|--------|---------|
| App name | `nexoragarden` |
| Branch | `main` |
| Dockerfile | `/Dockerfile` (tự detect) |
| Port | `8080` |
| Auto deploy | ✅ bật |

---

## Bước 5 — Environment Variables

Trong phần **Environment Variables** khi tạo app hoặc sau khi tạo:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `TELEGRAM_TOKEN` | *(token bot Telegram)* |
| `TELEGRAM_CHAT_ID` | *(chat ID nhận thông báo)* |
| `GEMINI_API_KEY` | *(API key Gemini)* |
| `TELEGRAM_WEBHOOK_URL` | `https://nexorax.cloud/NexoraGarden/telegram-webhook` |
| `TELEGRAM_WEBHOOK_SECRET` | *(secret webhook)* |
| `WEATHER_API_KEY` | *(WeatherAPI key)* |
| `YOUTUBE_COOKIES` | *(nội dung cookies.txt — tùy chọn)* |

→ Nhấn **Create App**

---

## Bước 6 — Deploy lần đầu

Back4App tự build Docker → đợi ~5-10 phút. Log hiển thị trong dashboard.

Sau khi build xong, app có URL dạng: `https://nexoragarden-xxx.b4a.run`

---

## Bước 7 — DNS — Cloudflare

App → **Settings** → **Custom Domain** → thêm `nexorax.cloud`

Cloudflare Dashboard → domain **nexorax.cloud** → **DNS**:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `@` | `nexoragarden-xxx.b4a.run` | Proxied ☁️ |

---

## Bước 8 — Persistent Volume (SQLite)

SQLite database lưu tại: `/app/packages/api-server/data/nexora.db`

Back4App → App → **Storage** → **Add Volume**:

| Mount path | Size |
|-----------|------|
| `/app/packages/api-server/data` | 1 GB |

> Nếu không mount volume → dữ liệu sensor bị mất mỗi lần restart!

---

## Bước 9 — Cloudflare Worker Ping

Cloudflare Dashboard → **Workers & Pages** → Create Worker `ping`:

```js
export default {
  async scheduled(event, env, ctx) {
    await fetch("https://nexorax.cloud/NexoraGarden");
  },
  async fetch(request, env, ctx) {
    return new Response("Worker alive");
  }
};
```

Settings → Triggers → Add Cron: `*/3 * * * *`

---

## Auto-deploy sau khi push GitHub

Sau khi setup xong — mỗi lần push GitHub:
```
git push origin main → Back4App detect → build Docker → deploy tự động ✅
```

---

## ESP32 Firmware

Giữ nguyên — server vẫn tại `nexorax.cloud`:

```cpp
const char* SERVER_HOST = "nexorax.cloud";
const int   SERVER_PORT = 443;
const char* WS_PATH     = "/NexoraGarden/ws";
```

---

## Thứ tự thực hiện

1. back4app.com → Sign Up → Containers as a Service
2. Build new app → GitHub → repo `Nexora`, branch `main`
3. Port `8080`, auto-deploy ON
4. Set tất cả Environment Variables
5. Create App → đợi build (~10 phút)
6. Add Volume tại `/app/packages/api-server/data`
7. Lấy URL `b4a.run` → Cloudflare DNS + Custom Domain
8. Tạo Cloudflare Worker ping
