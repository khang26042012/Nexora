# Hướng dẫn Deploy NexoraGarden — Zeabur

## 1. Zeabur — Web Service (thay thế Render)

### Bước deploy

1. Vào [zeabur.com](https://zeabur.com) → **New Project**
2. Kết nối GitHub → chọn repo `khang26042012/Nexora`
3. Zeabur tự detect `zbpack.json` ở root → chọn **1 service duy nhất** (API Server)
4. Deploy → Zeabur tự chạy:
   - Install: `pnpm install`
   - Build: build nexora-garden + portfolio + api-server
   - Start: `node packages/api-server/dist/index.mjs`

### Environment Variables (thêm trong Zeabur Dashboard → Service → Variables)

| Key | Value |
|-----|-------|
| `TELEGRAM_TOKEN` | *(token bot Telegram)* |
| `TELEGRAM_CHAT_ID` | *(chat ID nhận thông báo)* |
| `GEMINI_API_KEY` | *(API key Gemini)* |
| `TELEGRAM_WEBHOOK_URL` | `https://nexorax.cloud/NexoraGarden/telegram-webhook` |
| `TELEGRAM_WEBHOOK_SECRET` | *(secret webhook)* |
| `WEATHER_API_KEY` | *(WeatherAPI key)* |
| `YOUTUBE_COOKIES` | *(nội dung cookies.txt — tùy chọn)* |
| `NODE_ENV` | `production` |

### File cấu hình Zeabur

`zbpack.json` ở root repo — Zeabur đọc tự động:
```json
{
  "install_command": "pnpm install",
  "build_command": "pnpm --filter @workspace/nexora-garden run build && pnpm --filter @workspace/portfolio run build && pnpm --filter @workspace/api-server run build",
  "start_command": "node packages/api-server/dist/index.mjs",
  "cache_dependencies": false
}
```

---

## 2. DNS — Cloudflare

1. Đăng nhập [dash.cloudflare.com](https://dash.cloudflare.com) → chọn domain **nexorax.cloud** → vào **DNS**
2. Cập nhật CNAME record trỏ về Zeabur URL:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `@` (hoặc `nexorax.cloud`) | `<zeabur-service>.zeabur.app` | Proxied (đám mây màu cam) |

> Zeabur URL dạng: `nexorax-xxx.zeabur.app` — lấy trong Zeabur Dashboard → Service → Domains

---

## 3. Cloudflare Worker — Ping Keep-Alive

Worker này tự động ping server mỗi 3 phút (Zeabur free tier cũng có thể sleep).

### Tên worker: `ping`
### Cron trigger: `*/3 * * * *`

```js
export default {
  async scheduled(event, env, ctx) {
    await fetch("https://nexorax.cloud/NexoraGarden");
  },
  async fetch(request, env, ctx) {
    return new Response("Worker is alive!");
  }
};
```

---

## 4. ESP32 Firmware

Giữ nguyên — server vẫn chạy tại `nexorax.cloud`:

```cpp
const char* SERVER_HOST = "nexorax.cloud";
const int   SERVER_PORT = 443;
const char* WS_PATH     = "/NexoraGarden/ws";
```

---

## 5. YtDownloader Tool

- Zeabur có **ffmpeg native** → tất cả quality kể cả 4K hoạt động ngay
- Set `YOUTUBE_COOKIES` trong Zeabur Variables nếu cần bypass geo-block

---

## Thứ tự thực hiện

1. Push `zbpack.json` lên GitHub (đã có sẵn)
2. Deploy lên Zeabur → lấy URL service
3. Cập nhật DNS Cloudflare → CNAME trỏ về Zeabur URL
4. Cập nhật/tạo Cloudflare Worker `ping`
5. Thêm tất cả Environment Variables trong Zeabur
6. Kiểm tra hệ thống hoạt động
7. (Tùy chọn) Xóa service cũ trên Render
