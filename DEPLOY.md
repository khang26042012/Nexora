# Hướng dẫn Deploy NexoraGarden

## 1. Render — Web Service

**Lưu ý quan trọng:** Phải chọn **Web Service** (KHÔNG phải Static Site).

### Build & Start Command

```
Build:  pnpm install && pnpm --filter @workspace/nexora-garden run build && pnpm --filter @workspace/portfolio run build && pnpm --filter @workspace/api-server run build
Start:  node packages/api-server/dist/index.mjs
```

### Environment Variables

| Key | Value |
|-----|-------|
| `TELEGRAM_TOKEN` | *(token bot Telegram)* |
| `TELEGRAM_CHAT_ID` | *(chat ID nhận thông báo)* |
| `GEMINI_API_KEY` | *(API key Gemini)* |
| `TELEGRAM_WEBHOOK_URL` | `https://nexorax.cloud/NexoraGarden/telegram-webhook` |
| `NODE_ENV` | `production` |

---

## 2. DNS — Cloudflare

1. Đăng nhập [dash.cloudflare.com](https://dash.cloudflare.com) → chọn domain **nexorax.cloud** → vào **DNS**
2. Cập nhật CNAME record trỏ về Render URL mới:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `@` (hoặc `nexorax.cloud`) | `nexora-v8re.onrender.com` | Proxied (đám mây màu cam) |

> Đảm bảo **Proxy status** là **Proxied** (biểu tượng đám mây cam) để Cloudflare làm CDN & SSL.

---

## 3. Cloudflare Worker — Ping Keep-Alive

Worker này tự động ping server mỗi 3 phút để tránh Render sleep do free tier.

### Tên worker: `ping`

### Cron trigger: `*/3 * * * *`

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

### Cách tạo:
1. Vào **Cloudflare Dashboard** → **Workers & Pages** → **Create Application** → **Create Worker**
2. Đặt tên: `ping`
3. Dán code trên vào editor
4. Deploy
5. Vào **Settings** → **Triggers** → **Add Cron Trigger** → nhập `*/3 * * * *`

---

## 4. Cloudflare Redirect Rules — Xóa Rule Cũ

Xóa redirect rule cũ (nếu có):
- Rule: `/NexoraGarden` → `nexoragarden.onrender.com`

Lý do: Server mới phục vụ toàn bộ qua `nexorax.cloud`, không cần redirect này nữa.

Cách xóa: **Cloudflare Dashboard** → **nexorax.cloud** → **Rules** → **Redirect Rules** → tìm và xóa rule trên.

---

## 5. ESP32 Firmware

Cập nhật các hằng số kết nối trong file `firmware/NexoraGarden/NexoraGarden.ino`:

```cpp
const char* SERVER_HOST = "nexorax.cloud";
const int   SERVER_PORT = 443;
const char* WS_PATH     = "/NexoraGarden/ws";
```

> Firmware đã được cập nhật sẵn các giá trị này. Chỉ cần nạp lại vào ESP32.

---

## 6. Xóa Service Cũ trên Render

Sau khi xác nhận mọi thứ hoạt động ổn định trên `nexorax.cloud`:

1. Vào [Render Dashboard](https://dashboard.render.com)
2. Tìm service `nexoragarden.onrender.com`
3. Vào **Settings** → cuộn xuống → **Delete Service**

> **Chờ ít nhất 24 giờ** trước khi xóa để đảm bảo DNS đã propagate hoàn toàn.

---

## Thứ tự thực hiện

1. Deploy service mới lên Render (Web Service)
2. Cập nhật DNS Cloudflare → CNAME trỏ về Render URL mới
3. Tạo/cập nhật Cloudflare Worker `ping` với cron `*/3 * * * *`
4. Xóa Redirect Rule cũ trên Cloudflare
5. Nạp firmware mới vào ESP32
6. Kiểm tra toàn bộ hệ thống hoạt động
7. Xóa service cũ `nexoragarden.onrender.com`
