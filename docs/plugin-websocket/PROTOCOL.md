# NexoraMC WebSocket Metrics Protocol

## Tổng quan

Plugin Minecraft cần kết nối WebSocket đến server Nexora để gửi metrics real-time.
Server sẽ relay dữ liệu này đến trình duyệt người dùng qua endpoint riêng.

## Kết nối

### Endpoint
```
wss://phantrongkhangg.up.railway.app/ws-metrics
```

Hoặc nếu dùng custom domain:
```
wss://nexorax.cloud/ws-metrics
```

### Giao thức
- **Protocol**: WebSocket (ws/wss)
- **Path**: `/ws-metrics` (chính xác, không có trailing slash)
- **Auth**: Không yêu cầu authentication (có thể thêm sau)
- **Reconnect**: Nên tự động reconnect khi mất kết nối (khuyến nghị 5-10s delay)

## Định dạng dữ liệu

Plugin gửi JSON object qua WebSocket message. Server parse và broadcast đến tất cả browser clients.

### Schema bắt buộc

```json
{
  "serverName": "NexoraMC",
  "version": "Paper 1.21.4",
  "status": "online",
  "uptimeSeconds": 86400,
  "players": {
    "online": 12,
    "max": 100
  },
  "tps": {
    "oneMin": 19.8,
    "fiveMin": 19.9,
    "fifteenMin": 20.0
  },
  "mspt": 42,
  "entities": 1850,
  "chunks": 620,
  "ram": {
    "usedMB": 2800,
    "maxMB": 4096,
    "percent": 68
  },
  "cpu": {
    "percent": 35
  },
  "network": {
    "inboundKBs": 125,
    "outboundKBs": 340
  }
}
```

### Chi tiết từng field

| Field | Type | Mô tả | Ví dụ |
|-------|------|-------|-------|
| `serverName` | string | Tên server hiển thị | `"NexoraMC"` |
| `version` | string | Phiên bản server (Paper/Spigot/etc) | `"Paper 1.21.4"` |
| `status` | enum | Trạng thái server | `"online"`, `"offline"`, `"starting"` |
| `uptimeSeconds` | number | Thời gian chạy (giây) | `86400` (24h) |
| `players.online` | number | Số player hiện tại | `12` |
| `players.max` | number | Max players | `100` |
| `tps.oneMin` | number | TPS trung bình 1 phút | `19.8` |
| `tps.fiveMin` | number | TPS trung bình 5 phút | `19.9` |
| `tps.fifteenMin` | number | TPS trung bình 15 phút | `20.0` |
| `mspt` | number | Milliseconds per tick | `42` |
| `entities` | number | Tổng số entities loaded | `1850` |
| `chunks` | number | Số chunks đang load | `620` |
| `ram.usedMB` | number | RAM đang dùng (MB) | `2800` |
| `ram.maxMB` | number | RAM tối đa (MB) | `4096` |
| `ram.percent` | number | % RAM sử dụng | `68` |
| `cpu.percent` | number | % CPU sử dụng | `35` |
| `network.inboundKBs` | number | Network in (KB/s) | `125` |
| `network.outboundKBs` | number | Network out (KB/s) | `340` |

## Tần suất gửi

- **Khuyến nghị**: Mỗi 2-5 giây
- **Tối thiểu**: Không quá nhanh (tránh spam server)
- Khi server tắt/startup: Gửi `{ "status": "offline" }` hoặc `{ "status": "starting" }`

## Xử lý lỗi phía Server

- Nếu JSON parse fail → Server log warning, bỏ qua message
- Nếu plugin disconnect → Server broadcast `{ status: "offline", timestamp: ... }` đến browsers
- Nếu có plugin mới connect → Plugin cũ bị terminate (chỉ 1 source tại 1 thời điểm)

## Ví dụ Java (Paper/Bukkit Plugin)

```java
// Sử dụng Java-WebSocket library
import org.java_websocket.client.WebSocketClient;
import org.json.JSONObject;

public class NexoraMetricsSender extends WebSocketClient {
    
    public NexoraMetricsSender() throws URISyntaxException {
        super(new URI("wss://phantrongkhangg.up.railway.app/ws-metrics"));
    }
    
    @Override
    public void onOpen(ServerHandshake handshakedata) {
        getLogger().info("Connected to Nexora metrics server");
        // Start scheduled task to send metrics every 3 seconds
    }
    
    @Override
    public void onClose(int code, String reason, boolean remote) {
        getLogger().warning("Disconnected from Nexora: " + reason);
        // Schedule reconnect after 5 seconds
    }
    
    public void sendMetrics() {
        JSONObject metrics = new JSONObject();
        metrics.put("serverName", "NexoraMC");
        metrics.put("version", Bukkit.getVersion());
        metrics.put("status", "online");
        metrics.put("uptimeSeconds", ManagementFactory.getRuntimeMXBean().getUptime() / 1000);
        
        JSONObject players = new JSONObject();
        players.put("online", Bukkit.getOnlinePlayers().size());
        players.put("max", Bukkit.getMaxPlayers());
        metrics.put("players", players);
        
        // ... fill other fields
        
        this.send(metrics.toString());
    }
}
```

## Testing

Sau khi plugin kết nối thành công:
1. Mở https://phantrongkhangg.up.railway.app/server-status
2. Trang sẽ tự động chuyển từ mock data sang real data
3. Kiểm tra console log server: `Server metrics source connected via /ws-metrics`

## Liên hệ

Nếu cần hỗ trợ tích hợp, liên hệ Khang qua Telegram hoặc Discord.
