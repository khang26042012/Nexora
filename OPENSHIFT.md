# Deploy lên OpenShift Developer Sandbox (Red Hat)

**Free thật, không cần thẻ. Spec: 7GB RAM, 15GB storage, không hết hạn (renew thủ công 30 ngày/lần).**

## Bước 1 — Đăng ký Developer Account (5 phút)

1. Vào https://developers.redhat.com → bấm **Register**
2. Điền email + mật khẩu (dùng email Gmail của Khang)
3. Verify email
4. Sau đó vào https://developers.redhat.com/developer-sandbox → bấm **Start your sandbox for free**
5. Chờ ~3-5 phút → sandbox sẵn sàng → bấm **Launch**

> Sandbox sẽ có 2 namespace: `<username>-dev` và `<username>-stage`. Dùng `<username>-dev`.

## Bước 2 — Deploy bằng Web Console (cách dễ nhất)

1. Trong OpenShift Console → bên trái chọn **Developer** view (không phải Administrator)
2. Bấm **+Add** → **Import from Git**
3. Điền:
   - **Git Repo URL**: `https://github.com/khang26042012/Nexora`
   - **Git reference**: `main`
   - **Context dir**: `/`
4. Phần **Import Strategy** → bấm **Edit Import Strategy** → chọn **Dockerfile**
   - **Dockerfile path**: `Dockerfile`
5. Phần **General**:
   - **Application name**: `nexora`
   - **Name**: `nexora-server`
6. Phần **Resources**: chọn **Deployment**
7. Phần **Advanced options**:
   - **Target port**: `8080`
   - Tick **Create a route** ✅
8. Bấm **Create**

→ OpenShift sẽ build Docker image (~5-8 phút) rồi deploy. Theo dõi tab **Builds**.

## Bước 3 — Mount Persistent Volume (SQLite)

Sau khi pod chạy:

1. Bên trái chọn **Storage** → **PersistentVolumeClaims** → **Create PVC**
2. Điền:
   - **Name**: `nexora-data`
   - **Storage class**: giữ default (`ocs-storagecluster-ceph-rbd` hoặc `gp3-csi`)
   - **Access mode**: `Single user (RWO)`
   - **Size**: `5 GiB`
3. Bấm **Create**

Mount vào pod:
1. Vào **Workloads** → **Deployments** → `nexora-server` → tab **YAML**
2. Tìm `spec.template.spec.containers[0]` → thêm `volumeMounts`:
   ```yaml
   volumeMounts:
     - name: nexora-data
       mountPath: /app/packages/api-server/data
   ```
3. Trong `spec.template.spec` thêm `volumes`:
   ```yaml
   volumes:
     - name: nexora-data
       persistentVolumeClaim:
         claimName: nexora-data
   ```
4. Bấm **Save** → pod tự restart với volume

## Bước 4 — Set Environment Variables

1. **Workloads** → **Deployments** → `nexora-server` → tab **Environment**
2. Add các biến:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `TELEGRAM_TOKEN` | bot token |
| `TELEGRAM_CHAT_ID` | chat ID |
| `GEMINI_API_KEY` | Gemini key |
| `WEATHER_API_KEY` | WeatherAPI key |

3. Bấm **Save** → pod restart

> Nên dùng **Secret** thay vì env trực tiếp cho key sensitive. Vào **Secrets** → **Create** → **Key/value secret** → mount vào deployment.

## Bước 5 — Lấy URL public

1. Bên trái **Networking** → **Routes** → tìm `nexora-server`
2. Cột **Location** = URL public (dạng `https://nexora-server-<username>-dev.apps.rm3.7wse.p1.openshiftapps.com`)
3. Test:
   - `https://<url>/` → portfolio
   - `https://<url>/NexoraGarden` → dashboard
   - `https://<url>/NexoraGarden/health` → health check

## Bước 6 — Renew sandbox mỗi 30 ngày

OpenShift Sandbox tự suspend sau 30 ngày. Để renew:

1. Vào https://developers.redhat.com/developer-sandbox
2. Bấm **Renew** → chờ ~1 phút → sandbox active lại
3. **Data trong PVC giữ nguyên**, deployment tự khởi động lại

> Tip: set Google Calendar reminder mỗi 28 ngày để khỏi quên renew.

## Auto-deploy khi push GitHub

Mặc định OpenShift KHÔNG auto-deploy khi push GitHub. Để bật:

1. Vào **Builds** → `nexora-server` → tab **Webhooks**
2. Copy **GitHub Webhook URL**
3. Vào GitHub repo → **Settings** → **Webhooks** → **Add webhook**
4. Paste URL, content type = `application/json`, chọn event = **Just the push event**

→ Push GitHub → OpenShift tự rebuild + deploy.

## ESP32 firmware

Sau khi có URL OpenShift, update firmware:
```cpp
const char* SERVER_HOST = "nexora-server-<username>-dev.apps.rm3.7wse.p1.openshiftapps.com";
const int   SERVER_PORT = 443;
const char* WS_PATH     = "/NexoraGarden/ws";
```

Hoặc giữ domain cũ `nexorax.cloud` → Cloudflare DNS → CNAME tới OpenShift route.

## Troubleshooting

- **Build fail "permission denied"** → Dockerfile đã có `USER 1001` + `chgrp -R 0`, OK với OpenShift restricted SCC
- **Pod CrashLoopBackOff với SQLite error** → kiểm tra PVC đã mount đúng `/app/packages/api-server/data`
- **WebSocket fail** → OpenShift Route mặc định support WSS, không cần config thêm
- **Quota exceeded** → kiểm tra **Project Resource Quota** → app đang dùng quá 7GB RAM, giảm replica = 1
