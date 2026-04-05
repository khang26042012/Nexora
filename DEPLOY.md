# Hướng Dẫn Deploy Lên Render

## Yêu Cầu
- Tài khoản [Render.com](https://render.com) (miễn phí)
- Repo GitHub chứa source code này

## Các Bước Deploy

### Bước 1: Push code lên GitHub
Đảm bảo toàn bộ code đã được push lên GitHub repository của bạn.

### Bước 2: Kết nối Render với GitHub
1. Đăng nhập vào [dashboard.render.com](https://dashboard.render.com)
2. Nhấn **New +** → chọn **Static Site**
3. Chọn **Connect account** để kết nối GitHub
4. Tìm và chọn repository `Khang-Portfolio` (hoặc tên repo của bạn)

### Bước 3: Cấu hình Static Site
Render sẽ tự đọc file `render.yaml` và điền thông tin. Nếu không, điền thủ công:

| Trường | Giá trị |
|--------|---------|
| **Name** | `nexorax-portfolio` |
| **Build Command** | `npm install -g pnpm && pnpm install --frozen-lockfile && pnpm --filter @workspace/portfolio run build` |
| **Publish Directory** | `artifacts/portfolio/dist/public` |

### Bước 4: Deploy
Nhấn **Create Static Site** — Render sẽ tự động build và deploy.

Sau khi xong, bạn sẽ nhận được URL dạng:
```
https://nexorax-portfolio.onrender.com
```

### Bước 5: Trỏ Domain (tùy chọn)
Xem file `DNS_GUIDE.md` để biết cách trỏ domain `nexorax.cloud` vào Render.

## Tự Động Deploy Khi Push Code
Render tự động redeploy mỗi khi bạn push commit mới lên nhánh `main`. Không cần thao tác thêm.
