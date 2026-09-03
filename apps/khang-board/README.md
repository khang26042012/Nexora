# Khang Board

Progress + Updates tracker cho các dự án của Khang. Theme giống Nexora (Arcane dark — tím đen).

## 2 chế độ

- `/` — Public: chỉ xem, không thấy nút sửa
- `/admin` — Hidden admin tab: login với mật khẩu `26042012khang` để đăng bài, sửa, tạo project

## Stack

- Frontend: Vite + React + Tailwind + Radix UI (shadcn style) — port **3001**
- Backend: Express + JSON file storage — port **3002**
- Data file: `apps/khang-board/server/board-state.json`
- Theme: Arcane dark (giống Nexora portfolio)

## Chạy local

```bash
# Cài dependencies (1 lần)
pnpm install --filter @workspace/khang-board... --filter @workspace/khang-board-server...

# Backend (terminal 1)
cd apps/khang-board/server
npm install
npm start
# → http://localhost:3002

# Frontend (terminal 2)
cd apps/khang-board
npm install
npm run dev
# → http://localhost:3001
```

Mở `http://localhost:3001` để xem. Click icon 🔒 trên header → nhập mk `26042012khang` để vào admin.

## Tính năng

**Card trên (Progress):**
- % hoàn thành + progress bar
- ETA + countdown (còn X ngày / trễ X ngày)
- Note markdown (bold, italic, code, link)
- Danh sách tasks in progress + todo, có checkbox để tick done
- Sửa được tất cả khi ở admin mode

**Card dưới (Updates):**
- Timeline chat-style, mới nhất ở dưới cùng (auto-scroll)
- Hiện giờ, ngày nếu khác hôm nay
- Markdown support
- Edit / delete update (admin only)

**Header (admin only):**
- Dropdown switch project
- Tạo project mới
- Logout
- List tất cả project + số tasks / updates

## Railway deploy

Repo: `nexora/apps/khang-board`

Tạo 2 service trong Railway:
1. **Backend** — root: `apps/khang-board/server`
   - Build: `npm install`
   - Start: `npm start`
   - Env: `PORT=3002`, `ADMIN_PASSWORD=...`, `SESSION_SECRET=...`
2. **Frontend** — root: `apps/khang-board`
   - Build: `npm install && npm run build`
   - Start: `npm run serve`
   - Env: `PORT=3001`, `BASE_PATH=/`

Set Vite `server.proxy` → backend service URL (or dùng env `VITE_API_BASE`).
