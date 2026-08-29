/**
 * NexoraMC Server Metrics Interface
 * 
 * This is the exact schema that the Minecraft plugin must send
 * via WebSocket to wss://phantrongkhangg.up.railway.app/ws-metrics
 */

export interface MetricsData {
  /** Server display name */
  serverName: string;
  
  /** Server version (e.g., "Paper 1.21.4") */
  version: string;
  
  /** Current server status */
  status: "online" | "offline" | "starting";
  
  /** Server uptime in seconds */
  uptimeSeconds: number;
  
  /** Player count info */
  players: {
    /** Current online players */
    online: number;
    /** Maximum player slots */
    max: number;
  };
  
  /** Ticks Per Second (average over different periods) */
  tps: {
    /** Average TPS over last 1 minute */
    oneMin: number;
    /** Average TPS over last 5 minutes */
    fiveMin: number;
    /** Average TPS over last 15 minutes */
    fifteenMin: number;
  };
  
  /** Milliseconds Per Tick (lower is better, <50 is good) */
  mspt: number;
  
  /** Total loaded entities */
  entities: number;
  
  /** Total loaded chunks */
  chunks: number;
  
  /** Memory usage */
  ram: {
    /** Used RAM in megabytes */
    usedMB: number;
    /** Max allocated RAM in megabytes */
    maxMB: number;
    /** RAM usage percentage (0-100) */
    percent: number;
  };
  
  /** CPU usage */
  cpu: {
    /** CPU usage percentage (0-100) */
    percent: number;
  };
  
  /** Network throughput */
  network: {
    /** Inbound traffic in KB/s */
    inboundKBs: number;
    /** Outbound traffic in KB/s */
    outboundKBs: number;
  };
}

/**
 * Example valid payload:
 * 
 * {
 *   "serverName": "NexoraMC",
 *   "version": "Paper 1.21.4",
 *   "status": "online",
 *   "uptimeSeconds": 86400,
 *   "players": { "online": 12, "max": 100 },
 *   "tps": { "oneMin": 19.8, "fiveMin": 19.9, "fifteenMin": 20.0 },
 *   "mspt": 42,
 *   "entities": 1850,
 *   "chunks": 620,
 *   "ram": { "usedMB": 2800, "maxMB": 4096, "percent": 68 },
 *   "cpu": { "percent": 35 },
 *   "network": { "inboundKBs": 125, "outboundKBs": 340 }
 * }
 */
