# rconkhang

Plugin Paper/Spigot Minecraft cho phép admin panel kết nối và quản lý server từ xa qua HTTP API.

## Tính năng

- **Player management**: list online players với UUID, IP, ping, location, health, food
- **Ban**: có thời hạn (1d, 7d, 30d, ...) hoặc vĩnh viễn (-1)
- **Unban**: gỡ ban theo tên hoặc UUID
- **Ban IP**: chống evade bằng cách đổi tên
- **Kick**: với lý do tùy chỉnh
- **Clear effects**: gỡ mọi potion + fire ticks
- **Whisper**: gửi tin nhắn riêng cho player
- **Teleport**: admin → player
- **Action log**: lưu 200 actions gần nhất
- **Persistent storage**: YAML files

## ⚠️ Giới hạn

- **KHÔNG có lệnh gamemode** (theo policy)
- API key random sinh lần đầu, lưu `plugins/rconkhang/data.yml`
- HTTP server chỉ listen trên `127.0.0.1:8765` mặc định — KHÔNG expose ra internet
- Dùng Bearer token cho mọi API call

## Commands

```
/rconkhang reload     - Reload config
/rconkhang status     - Show status
/rconkhang resetkey   - Tạo API key mới
/rconkhang key        - In full API key
```

## HTTP API

Tất cả endpoints (trừ `/health` và `/`) yêu cầu header `Authorization: Bearer <api_key>`.

### GET /health
```json
{"status":"ok","plugin":"rconkhang","version":"1.0.0"}
```

### GET /players
```json
{
  "players": [
    {"name":"khang","uuid":"...","ip":"1.2.3.4","ping":20,"world":"world","x":100,"y":64,"z":200,"gameMode":"SURVIVAL","health":20,"food":20}
  ],
  "max": 100,
  "count": 1
}
```

### POST /ban
```json
{"name":"player", "reason":"hack", "days":7, "admin":"admin_name"}
// days: -1 = permanent, 1 = 1 day, etc.
```

### POST /unban
```json
{"name":"player", "admin":"admin_name"}
```

### POST /kick
```json
{"name":"player", "reason":"spam", "admin":"admin_name"}
```

### POST /clear-effects
```json
{"name":"player", "admin":"admin_name"}
```

### POST /whisper
```json
{"name":"player", "message":"hello", "admin":"Admin"}
```

### POST /teleport
```json
{"from":"admin_name", "to":"player_name", "admin":"admin_name"}
```

### POST /ban-ip
```json
{"ip":"1.2.3.4", "reason":"ban evade", "admin":"admin_name"}
```

### POST /unban-ip
```json
{"ip":"1.2.3.4", "admin":"admin_name"}
```

### GET /bans
Trả về danh sách bans + IP bans.

### GET /log
Trả về action log (max 50 entries).

## Build

```bash
cd apps/rconkhang-plugin
mvn clean package
# Output: target/rconkhang-1.0.0.jar
```

## Cài đặt

1. Copy `rconkhang-1.0.0.jar` vào `plugins/` của Paper server
2. Khởi động server
3. Lấy API key: `/rconkhang key` (in-game)
4. Hoặc đọc `plugins/rconkhang/data.yml`
5. Đổi CORS trong `plugins/rconkhang/config.yml` để cho phép panel domain
6. Nếu cần access từ xa, dùng SSH tunnel: `ssh -L 8765:127.0.0.1:8765 user@server`
