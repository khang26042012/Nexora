# Hướng dẫn Deploy NexoraGarden — Railway

## Đặc điểm Railway

- **$5 credit miễn phí/tháng** — không cần thẻ để đăng ký
- GitHub auto-deploy: push code → Railway tự build Docker + deploy
- PORT inject tự động qua `$PORT` env var
- Persistent Volume: hỗ trợ mount thư mục (SQLite persist)
- Custom domain: miễn phí (subdomain `railway.app` hoặc domain riêng)
- Sleep policy: không sleep (khác Render)

---

## Bước 1 — Tạo account Railway

1. Vào [railway.app](https://railway.app) → **Start a New Project**
2. **Sign Up with GitHub** — dùng tài khoản GitHub `khang26042012`

---

## Bước 2 — Tạo Project mới

Dashboard → **New Project** → **Deploy from GitHub repo**

- Chọn repo `khang26042012/Nexora`
- Branch: `main`
- Railway tự detect `Dockerfile` + `railway.json` tại root ✅

---

## Bước 3 — Environment Variables

Vào Service → **Variables** → thêm từng biến:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `TELEGRAM_TOKEN` | *(token bot Telegram)* |
| `TELEGRAM_CHAT_ID` | *(chat ID nhận thông báo)* |
| `GEMINI_API_KEY` | *(API key Gemini)* |
| `TELEGRAM_WEBHOOK_URL` | `https://nexorax.cloud/NexoraGarden/telegram-webhook` |
| `TELEGRAM_WEBHOOK_SECRET` | *(secret webhook)* |
| `WEATHER_API_KEY` | *(WeatherAPI key)* |
| `YOUTUBE_COOKIES` | *(nội dung cookies.txt — tùy chọn)* |

> `PORT` **không cần set** — Railway inject tự động.

---

## Bước 4 — Persistent Volume (SQLite)

SQLite database lưu tại: `/app/packages/api-server/data/nexora.db`

Service → **Volumes** → **Add Volume**:

| Mount path | Size |
|-----------|------|
| `/app/packages/api-server/data` | 1 GB |

> Nếu không mount volume → dữ liệu sensor bị mất mỗi lần restart!

---

## Bước 5 — Custom Domain

Service → **Settings** → **Networking** → **Custom Domain** → thêm `nexorax.cloud`

Railway cấp subdomain mặc định: `xxx.railway.app`

Cloudflare DNS → domain **nexorax.cloud**:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `@` | `xxx.railway.app` | Proxied ☁️ |

---

## Bước 6 — Cloudflare Worker Ping (tùy chọn)

Nếu muốn giữ container luôn hoạt động:

Cloudflare → **Workers & Pages** → Create Worker `ping`:

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
git push origin main → Railway detect → build Docker → deploy tự động ✅
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

1. railway.app → Sign Up with GitHub
2. New Project → Deploy from GitHub → repo `Nexora`, branch `main`
3. Variables: set tất cả env vars (không cần PORT)
4. Volumes: mount `/app/packages/api-server/data`
5. Đợi build lần đầu (~5-10 phút)
6. Lấy domain `railway.app` → Cloudflare DNS + Custom Domain
7. (Tùy chọn) Tạo Cloudflare Worker ping
