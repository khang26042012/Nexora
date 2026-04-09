# Hướng dẫn Deploy NexoraGarden — Northflank

## 1. Northflank — Docker Container Hosting

### Đặc điểm
- Free tier: 2 services, 500 build minutes/tháng, 2GB storage
- GitHub auto-deploy: mỗi lần push → tự build Docker + deploy
- Cần thêm payment method (dù dùng free tier — để xác minh danh tính)
- Persistent volume: dữ liệu không mất khi restart

---

## Bước 1 — Tạo account Northflank

1. Vào [northflank.com](https://northflank.com) → **Sign Up**
2. Thêm payment method (bắt buộc, kể cả free tier)
3. Tạo Project mới → đặt tên `nexoragarden`

---

## Bước 2 — Kết nối GitHub

Dashboard → **Account Settings** → **GitHub** → **Connect** → cấp quyền repo `khang26042012/Nexora`

---

## Bước 3 — Tạo Service

Project → **Add Service** → **Deployment Service** → **GitHub Repo**

Cấu hình:
| Trường | Giá trị |
|--------|---------|
| Repository | `khang26042012/Nexora` |
| Branch | `main` |
| Build type | **Dockerfile** |
| Dockerfile path | `/Dockerfile` |
| Port | `8080` |
| Auto deploy | ✅ bật |

---

## Bước 4 — Environment Variables

Service → **Environment** → **Add Variables**:

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

---

## Bước 5 — Persistent Volume (SQLite)

SQLite database lưu tại: `/app/packages/api-server/data/nexora.db`

Service → **Volumes** → **Add Volume**:

| Trường | Giá trị |
|--------|---------|
| Mount path | `/app/packages/api-server/data` |
| Size | `1GB` |

> Nếu không mount volume → dữ liệu sensor/log bị mất mỗi lần restart!

---

## Bước 6 — Deploy lần đầu

Service → **Deploy** → đợi build (~5-10 phút lần đầu vì cần build Docker image)

Log sẽ hiện:
```
Step 1/10 : FROM node:20-slim
...
Step 10/10 : CMD ["node", "packages/api-server/dist/index.mjs"]
✅ Build complete
✅ Server listening on port 8080
```

---

## Bước 7 — DNS — Cloudflare

Service → **Networking** → lấy public URL dạng `xxx.northflank.app`

Cloudflare Dashboard → domain **nexorax.cloud** → **DNS**:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `@` | `xxx.northflank.app` | Proxied ☁️ |

> Hoặc: Northflank → **Custom Domain** → thêm `nexorax.cloud` → Cloudflare verify

---

## Bước 8 — Cloudflare Worker Ping (chống sleep)

Northflank free tier không ngủ, nhưng nên có worker để đảm bảo:

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

Sau khi setup xong:
```
git push origin main → Northflank detect → build Docker → deploy tự động
```
Không cần làm gì thêm!

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

1. Tạo account + project Northflank
2. Kết nối GitHub → chọn repo `Nexora`
3. Tạo Deployment Service (Dockerfile, port 8080, auto-deploy)
4. Set Environment Variables
5. Mount Persistent Volume tại `/app/packages/api-server/data`
6. Deploy → đợi build
7. Lấy URL → cập nhật Cloudflare DNS
8. Tạo Cloudflare Worker ping
