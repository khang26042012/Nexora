# Hướng Dẫn Trỏ DNS nexorax.cloud Vào Render

Sau khi đã deploy thành công lên Render (xem `DEPLOY.md`), làm theo các bước dưới đây để trỏ domain `nexorax.cloud` vào website của bạn.

---

## Bước 1: Lấy Địa Chỉ Render Của Bạn

1. Đăng nhập vào [dashboard.render.com](https://dashboard.render.com)
2. Chọn service **nexorax-portfolio**
3. Vào tab **Settings** → kéo xuống phần **Custom Domains**
4. Nhấn **Add Custom Domain**
5. Nhập `nexorax.cloud` → nhấn **Save**
6. Render sẽ hiển thị một địa chỉ CNAME dạng:
   ```
   nexorax-portfolio.onrender.com
   ```
   **Sao chép địa chỉ này lại**, bạn sẽ cần dùng ở bước sau.

---

## Bước 2: Thêm DNS Record Tại Nhà Đăng Ký Domain

Đăng nhập vào trang quản lý domain nơi bạn đã mua `nexorax.cloud` (ví dụ: Inet, PA Vietnam, Mắt Bão, GoDaddy...), vào phần **Quản lý DNS** hoặc **DNS Records**, rồi thêm các record sau:

### Record cho domain gốc (nexorax.cloud)

> **Lưu ý:** Một số nhà đăng ký không cho phép đặt CNAME cho domain gốc (apex domain). Nếu vậy, dùng **ALIAS** hoặc **ANAME** record thay thế (cùng giá trị).

| Loại | Host / Name | Giá trị (Value) | TTL |
|------|-------------|-----------------|-----|
| CNAME | `@` hoặc để trống | `nexorax-portfolio.onrender.com` | 3600 |

### Record cho www (tùy chọn)

| Loại | Host / Name | Giá trị (Value) | TTL |
|------|-------------|-----------------|-----|
| CNAME | `www` | `nexorax-portfolio.onrender.com` | 3600 |

> Nếu bạn muốn `www.nexorax.cloud` cũng hoạt động, hãy thêm cả record `www`. Sau đó vào lại Render → **Add Custom Domain** → thêm `www.nexorax.cloud`.

---

## Bước 3: Xác Minh Trên Render

1. Quay lại Render dashboard → **Settings** → **Custom Domains**
2. Render sẽ tự động kiểm tra DNS record của bạn
3. Khi xác minh thành công, trạng thái sẽ chuyển sang **Verified** ✅
4. SSL/HTTPS sẽ được Render tự động cấp miễn phí qua Let's Encrypt — **không cần cấu hình gì thêm**

---

## Bước 4: Kiểm Tra Kết Quả

Sau khi DNS được xác minh, truy cập:
- `https://nexorax.cloud` → website của bạn
- `https://www.nexorax.cloud` → (nếu đã thêm record www)

---

## Thời Gian Chờ (DNS Propagation)

DNS thường mất từ **24 đến 48 giờ** để cập nhật toàn cầu, tùy theo TTL và nhà mạng.

Bạn có thể kiểm tra DNS đã cập nhật chưa tại: [https://dnschecker.org](https://dnschecker.org) — nhập `nexorax.cloud` và xem kết quả từ nhiều server khác nhau.

---

## Tóm Tắt Nhanh

```
1. Render Dashboard → Settings → Custom Domains → Add → nexorax.cloud
2. DNS Manager → Thêm CNAME: @ → nexorax-portfolio.onrender.com
3. (Tùy chọn) DNS Manager → Thêm CNAME: www → nexorax-portfolio.onrender.com
4. Chờ Render xác minh → SSL tự động kích hoạt
5. Kiểm tra tại https://nexorax.cloud
```
