# Nexorax — Portfolio của Phan Trọng Khang

> **Truy cập tại:** [nexorax.cloud](https://nexorax.cloud)

Portfolio cá nhân được xây dựng với React, Vite, Three.js và Tailwind CSS. Thiết kế tối giản, hiệu ứng 3D, tối ưu SEO cho từ khóa "nexorax" và "Phan Trọng Khang".

---

## Tính Năng

- Giao diện dark mode với hiệu ứng 3D (Three.js / React Three Fiber)
- Responsive hoàn toàn trên mọi thiết bị
- Smooth scroll navigation
- SEO đầy đủ: title, meta description, Open Graph, Twitter Card
- Favicon và logo tùy chỉnh
- Redirect tự động từ `/NexoraGarden` → [nexoragarden.onrender.com](https://nexoragarden.onrender.com)

---

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | React 19, Vite 7, TypeScript |
| Styling | Tailwind CSS 4, Framer Motion |
| 3D | Three.js, React Three Fiber, Drei |
| UI Components | Radix UI, Lucide React |
| Package Manager | pnpm (monorepo) |
| Deploy | Render (Static Site) |

---

## Cấu Trúc Dự Án

```
.
├── artifacts/
│   ├── portfolio/          # Frontend React (trang chính)
│   └── api-server/         # Express backend (API & redirects)
├── lib/                    # Shared libraries
├── render.yaml             # Cấu hình deploy Render
├── DEPLOY.md               # Hướng dẫn deploy
└── DNS_GUIDE.md            # Hướng dẫn trỏ DNS nexorax.cloud
```

---

## Chạy Locally

**Yêu cầu:** Node.js 20+, pnpm

```bash
# Cài dependencies
pnpm install

# Chạy dev server
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/portfolio run dev
```

Mở trình duyệt tại `http://localhost:3000`

---

## Deploy Lên Render

Xem hướng dẫn chi tiết trong file [`DEPLOY.md`](./DEPLOY.md).

Tóm tắt nhanh:
1. Push repo lên GitHub
2. Vào [dashboard.render.com](https://dashboard.render.com) → **New+** → **Static Site**
3. Kết nối repo → Render tự đọc `render.yaml`
4. Build command: `npm install -g pnpm && pnpm install --frozen-lockfile && pnpm --filter @workspace/portfolio run build`
5. Publish directory: `artifacts/portfolio/dist/public`

---

## Trỏ DNS nexorax.cloud

Xem hướng dẫn chi tiết trong file [`DNS_GUIDE.md`](./DNS_GUIDE.md).

Tóm tắt: Thêm CNAME record `@` → `nexorax-portfolio.onrender.com` tại nhà đăng ký domain.

---

## Liên Hệ

**Phan Trọng Khang** — AI Architect & Developer

Website: [nexorax.cloud](https://nexorax.cloud)
