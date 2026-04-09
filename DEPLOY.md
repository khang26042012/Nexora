# Hướng dẫn Deploy NexoraGarden — Wispbyte

## 1. Wispbyte — Free Container Hosting

### Đặc điểm
- Free, 24/7, 1GB storage
- Node.js / Python / Java / Bun hỗ trợ
- Upload file qua File Manager hoặc SFTP
- Custom startup command + custom domain

### Bước 1 — Tạo account và server

1. Vào [wispbyte.com](https://wispbyte.com) → **Sign Up** (miễn phí)
2. Dashboard → **Create Server** → chọn **Generic Hosting** → Runtime: **Node.js**
3. Đặt tên server (vd: `nexoragarden`)

### Bước 2 — Upload source code lên Wispbyte

**Option A — File Manager (UI):**
- Nén toàn bộ source (trừ `node_modules/`, `.git/`, `attached_assets/`) thành `.zip`
- Upload qua File Manager trong panel Wispbyte → Extract

**Option B — SFTP (nhanh hơn):**
- Lấy SFTP credentials từ Wispbyte dashboard
- Dùng FileZilla hoặc terminal:
  ```bash
  sftp user@host
  put -r /path/to/nexora .
  ```

> **Lưu ý:** KHÔNG upload thư mục `node_modules/` và `attached_assets/` — nặng, không cần thiết

### Bước 3 — Set Startup Command

Trong Wispbyte panel → **Startup Settings** → **Startup Command**:

```
bash startup.sh
```

Script `startup.sh` (đã có sẵn trong repo) sẽ tự động:
- Cài `pnpm` nếu chưa có
- Cài dependencies
- Build native `better-sqlite3`
- Build frontend + api-server (chỉ lần đầu)
- Start server

**Các lần restart sau:** script detect `dist/` đã tồn tại → skip build → start ngay (~5 giây).

### Bước 4 — Set Environment Variables

Trong Wispbyte panel → **Startup / Environment Variables**:

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

> **PORT** sẽ được Wispbyte tự set — code đã đọc `process.env.PORT` đúng cách.

### Bước 5 — Start Server

Panel → **Start** → đợi lần đầu build (~3-5 phút)

Log sẽ hiện:
```
[pnpm] Installing pnpm...
[deps] Installing packages...
[sqlite3] Building native binary...
[build] Building all packages...
[start] Starting API server on port 8080...
```

---

## 2. Cập nhật code (khi push GitHub)

Sau mỗi lần push GitHub → cần update Wispbyte thủ công:

**Cách nhanh nhất:**
1. Trên Replit: build lại `pnpm --filter @workspace/api-server run build` (+ frontend nếu cần)
2. SFTP upload file đã thay đổi lên Wispbyte
3. Panel → **Restart**

**Hoặc xóa `dist/` để force rebuild:**
- File Manager → xóa `packages/api-server/dist/`
- Restart → script tự build lại

---

## 3. DNS — Cloudflare

1. Đăng nhập [dash.cloudflare.com](https://dash.cloudflare.com) → chọn domain **nexorax.cloud** → **DNS**
2. Cập nhật CNAME trỏ về Wispbyte subdomain:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `@` | `<server-name>.wispbyte.com` | Proxied ☁️ |

> Wispbyte subdomain lấy từ dashboard → server URL của bạn

---

## 4. Cloudflare Worker — Ping Keep-Alive

Worker ping mỗi 3 phút để tránh Wispbyte sleep.

### Code worker:
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

**Tạo:** Cloudflare Dashboard → Workers & Pages → Create Worker → đặt tên `ping` → paste code → Deploy → Settings → Triggers → Add Cron `*/3 * * * *`

---

## 5. ESP32 Firmware

Giữ nguyên — server vẫn tại `nexorax.cloud`:

```cpp
const char* SERVER_HOST = "nexorax.cloud";
const int   SERVER_PORT = 443;
const char* WS_PATH     = "/NexoraGarden/ws";
```

---

## 6. YtDownloader Tool

- Wispbyte Linux container có thể có native `ffmpeg` → kiểm tra sau deploy
- Set `YOUTUBE_COOKIES` trong Environment Variables nếu cần

---

## Thứ tự thực hiện

1. Tạo account Wispbyte → Create Server (Generic/Node.js)
2. Upload source code (trừ `node_modules/`, `.git/`, `attached_assets/`)
3. Set Startup Command: `bash startup.sh`
4. Set tất cả Environment Variables
5. Start server → đợi build lần đầu (~5 phút)
6. Lấy Wispbyte subdomain → cập nhật Cloudflare DNS
7. Tạo/cập nhật Cloudflare Worker `ping`
8. Cập nhật `TELEGRAM_WEBHOOK_URL` nếu cần
9. Kiểm tra hệ thống
