# Workspace — Portfolio của Phan Trọng Khang

## Tổng quan

Monorepo pnpm. **Sản phẩm chính: `apps/portfolio`** — portfolio cá nhân của Khang (React 19 + Vite + Three.js/R3F, theme arcane/mystical).

> **Lưu ý cho AI**: NexoraGarden (IoT tưới cây) chỉ là sản phẩm phụ trong repo này, không cần quan tâm trừ khi Khang yêu cầu cụ thể.

## Stack chính

- **Monorepo**: pnpm workspaces (Node.js 24, TypeScript 5.9)
- **Portfolio**: React 19 + Vite + Tailwind 4 + Three.js/R3F — `apps/portfolio`
- GitHub: `khang26042012/Nexora` | Deploy: Railway

## Workflow

| Workflow | Mô tả |
|---|---|
| `Start application` | Portfolio dev server tại port 21113 |

## Migration nhanh (đổi Replit account/môi trường mới)

```bash
pnpm install --ignore-scripts
```
Rồi restart workflow `Start application`.

## Lệnh thường dùng

```bash
pnpm install --ignore-scripts
pnpm --filter @workspace/portfolio run dev
pnpm run typecheck
```

## Quy trình push GitHub

**LUÔN dùng Git Tree API** (1 blob → 1 tree → 1 commit → update ref) để tránh spam deploy. KHÔNG dùng Contents API.
