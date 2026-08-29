# Quick Reference - NexoraMC Metrics Plugin

## Connection
```
URL: wss://phantrongkhangg.up.railway.app/ws-metrics
Protocol: WebSocket (JSON text frames)
Frequency: Every 2-5 seconds
```

## Minimal Valid Payload
```json
{
  "serverName": "NexoraMC",
  "version": "Paper 1.21.4",
  "status": "online",
  "uptimeSeconds": 0,
  "players": { "online": 0, "max": 100 },
  "tps": { "oneMin": 20.0, "fiveMin": 20.0, "fifteenMin": 20.0 },
  "mspt": 0,
  "entities": 0,
  "chunks": 0,
  "ram": { "usedMB": 0, "maxMB": 4096, "percent": 0 },
  "cpu": { "percent": 0 },
  "network": { "inboundKBs": 0, "outboundKBs": 0 }
}
```

## How to Get Each Value (Bukkit/Paper API)

| Field | API Call |
|-------|----------|
| serverName | Config or `Bukkit.getServerName()` |
| version | `Bukkit.getVersion()` |
| status | Always `"online"` when plugin runs |
| uptimeSeconds | `ManagementFactory.getRuntimeMXBean().getUptime() / 1000` |
| players.online | `Bukkit.getOnlinePlayers().size()` |
| players.max | `Bukkit.getMaxPlayers()` |
| tps.* | `Bukkit.getTPS()` returns [1m, 5m, 15m] |
| mspt | `Bukkit.getAverageTickTime()` (Paper only) |
| entities | Sum of `world.getEntities().size()` for all worlds |
| chunks | Sum of `world.getLoadedChunks().length` for all worlds |
| ram.usedMB | `Runtime.getRuntime().totalMemory() - freeMemory()` / 1MB |
| ram.maxMB | `Runtime.getRuntime().maxMemory()` / 1MB |
| ram.percent | `(usedMB / maxMB) * 100` |
| cpu.percent | `OperatingSystemMXBean.getProcessCpuLoad() * 100` |
| network.* | Track bytes sent/received via Netty or packet listener |

## Maven Dependency (Java-WebSocket)
```xml
<dependency>
    <groupId>org.java-websocket</groupId>
    <artifactId>Java-WebSocket</artifactId>
    <version>1.5.4</version>
</dependency>
```

## Verify Connection
Check Railway logs for: `Server metrics source connected via /ws-metrics`
