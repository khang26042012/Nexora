# NexoraGarden — Workspace

## Tổng quan

Monorepo pnpm cho dự án **NexoraGarden** — hệ thống IoT tưới cây thông minh của Phan Trọng Khang.
GitHub: `khang26042012/Nexora` | Deploy: Render.com (auto-deploy từ branch main)

## Stack

- **Monorepo**: pnpm workspaces (Node.js 24, TypeScript 5.9)
- **Backend**: Express 5 + WebSocket (`ws`) — `packages/api-server`
- **IoT Server logic**: `apps/nexora-garden/server/` (db, telegram, websocket, routes, gemini)
- **Frontend Dashboard**: React 19 + Vite + Tailwind 4 — `apps/nexora-garden/`
- **Portfolio**: React 19 + Three.js/R3F — `apps/portfolio`
- **Database**: SQLite (`better-sqlite3`) via thư viện tự viết (không dùng Drizzle ORM)
- **AI**: Google Gemini 2.5 Flash (`@google/generative-ai`)
- **Telegram Bot**: `node-telegram-bot-api`
- **Firmware**: ESP32 Arduino C++ — `firmware/NexoraGarden/NexoraGarden.ino`

## Cấu trúc thư mục

```
apps/
  nexora-garden/         # Dashboard React + Server logic (db, ws, telegram, routes)
  portfolio/             # Portfolio cá nhân (React + Three.js)
  mockup-sandbox/        # UI component preview server
packages/
  api-server/            # Entry point chính — import từ nexora-garden/server
lib/
  db/                    # Drizzle schema (dự phòng, SQLite tự managed)
  api-spec/              # OpenAPI spec
  api-zod/               # Zod schemas generated
  api-client-react/      # React hooks generated
firmware/
  NexoraGarden/          # ESP32 code (.ino)
attached_assets/
  nexora_extracted/      # File tham khảo import từ project cũ (KHÔNG push GitHub)
```

## Workflows đang chạy

| Workflow | Status | Mô tả |
|---|---|---|
| `Start application` | ✅ RUNNING | Portfolio tại port 21113 |
| `packages/api-server: API Server` | ✅ RUNNING | API + WebSocket + Telegram tại PORT env |

## Environment Variables cần thiết (Render)

- `TELEGRAM_TOKEN` — Token bot Telegram
- `TELEGRAM_CHAT_ID` — Chat ID của Khang
- `TELEGRAM_WEBHOOK_URL` — URL webhook production
- `TELEGRAM_WEBHOOK_SECRET` — Secret để verify webhook
- `GEMINI_API_KEY` — Google Gemini API key
- `WEATHER_API_KEY` — WeatherAPI key (cũng trong ESP32 code)

## Quy trình push GitHub

**LUÔN dùng Git Tree API** — tạo 1 commit duy nhất, tránh spam Render deploy:
1. Tạo blob cho từng file thay đổi
2. Tạo tree mới
3. Tạo 1 commit từ tree
4. Update ref `heads/main`

**KHÔNG dùng**: Contents API (PUT từng file → nhiều commit → nhiều Render deploy)

## Thông tin kỹ thuật

- WebSocket ESP32: `wss://nexoragarden.onrender.com/ws`
- WebSocket Browser: `wss://nexoragarden.onrender.com/ws-browser`
- Production URL: `nexoragarden.onrender.com`
- SQLite DB path: `packages/api-server/data/nexora.db` (production)
- Gemini model: `gemini-2.5-flash`
- Admin timeout: 25 giây
- Unlock timeout: 500 giây
- Offline alert: 5 giây

## Lệnh thường dùng

```bash
pnpm install --ignore-scripts          # Cài deps nhanh (bỏ qua build scripts)
pnpm --filter @workspace/api-server run dev   # Chạy API server
pnpm --filter @workspace/portfolio run dev    # Chạy portfolio
pnpm run typecheck                            # Typecheck toàn bộ
```

## Ghi chú firmware ESP32

File `.ino` ở `firmware/NexoraGarden/NexoraGarden.ino`.
Chỉ cần nạp lại firmware khi: thay PIN mapping, ngưỡng bơm, giao thức WebSocket, địa chỉ server, thêm cảm biến mới.
Xem `attached_assets/nexora_extracted/NexoraGarden-main/quy_trinh_lam_viec.txt` để biết chi tiết.
