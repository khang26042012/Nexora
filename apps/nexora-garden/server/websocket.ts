import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import type { IncomingMessage } from "node:http";
import {
  getSystemState,
  updateSystemState,
  insertSensorLog,
  insertPumpLog,
} from "./db.js";
import { logger } from "./lib/logger.js";
import { setWebControlLock, isWebControlLocked } from "./commandLock.js";
import { isAdminActive } from "./adminControl.js";

let esp32Socket: WebSocket | null = null;
let offlineTimer: NodeJS.Timeout | null = null;
let activityTimer: NodeJS.Timeout | null = null;

// Track last time we received ANY frame from ESP32 (data message OR ping)
let lastEsp32MessageTime = 0;
// Sau khi có server-side ping mỗi 8s, giảm timeout còn 20s là đủ
const ACTIVITY_TIMEOUT_MS = 20_000;

// Throttle sensor log writes — only write to DB every LOG_INTERVAL_MS
const LOG_INTERVAL_MS = 10_000;
let lastLogTime = 0;

// Cooldown for Telegram connect/disconnect notifications (avoid spam on reconnect loops)
const TELEGRAM_NOTIFY_COOLDOWN_MS = 30_000;
let lastConnectNotifyTime = 0;
let lastDisconnectNotifyTime = 0;

// Browser clients listening for real-time updates
const browserClients = new Set<WebSocket>();

export function getEsp32Socket(): WebSocket | null {
  return esp32Socket;
}

export function pushCommandToEsp32(pump: "ON" | "OFF") {
  if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
    esp32Socket.send(JSON.stringify({ type: "command", pump }));
    logger.info({ pump }, "Pushed command to ESP32");
  }
}

export function pushUnlockCommandToEsp32(unlock: "ON" | "OFF") {
  if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
    esp32Socket.send(JSON.stringify({ type: "command", unlock }));
    logger.info({ unlock }, "Pushed unlock command to ESP32");
  }
}

export function pushAdminCommandToEsp32(admin: "ON" | "OFF") {
  if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
    esp32Socket.send(JSON.stringify({ type: "command", admin }));
    logger.info({ admin }, "Pushed admin command to ESP32");
  }
}

function broadcastToBrowsers(data: object) {
  const msg = JSON.stringify(data);
  for (const client of browserClients) {
    if (client.readyState === WebSocket.OPEN) {
      try { client.send(msg); } catch {}
    } else {
      browserClients.delete(client);
    }
  }
}

function broadcastLog(level: "info" | "warn" | "error" | "success", message: string) {
  const timestamp = new Date().toISOString();
  broadcastToBrowsers({ type: "log", level, message, timestamp });
}

export function broadcastManualPumpLog(action: "ON" | "OFF") {
  broadcastLog(
    action === "ON" ? "success" : "info",
    `Máy bơm THỦ CÔNG: ${action === "ON" ? "BẬT" : "TẮT"}`
  );
}

export function broadcastWebLock(active: boolean) {
  broadcastToBrowsers({ type: "web_lock", active });
}

export function initWebSocket(
  server: Server,
  sendTelegram: (msg: string) => void
) {
  // Use a SINGLE WebSocketServer with no path restriction.
  // Two separate WebSocketServers on the same HTTP server both listen to the
  // `upgrade` event. When the first handles /ws, the second also fires,
  // sees a path mismatch and calls socket.destroy() — causing immediate
  // disconnect with code 1006. Routing by path inside ONE wss fixes this.
  const wss = new WebSocketServer({ server, perMessageDeflate: false });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;

    if (pathname === "/ws-browser") {
      handleBrowserConnection(ws);
    } else if (pathname === "/ws") {
      handleEsp32Connection(ws, req, sendTelegram);
    } else {
      // Unknown path — close cleanly
      ws.close(1008, "Unknown path");
    }
  });

  logger.info("WebSocket server ready at /ws and /ws-browser");
}

function handleBrowserConnection(ws: WebSocket) {
  browserClients.add(ws);
  logger.info("Browser client connected to /ws-browser");

  // Send current state immediately on connect
  try {
    const state = getSystemState();
    ws.send(JSON.stringify({ type: "state", ...state }));
    // Gửi trạng thái ESP32 thực tế — không để browser đoán mò
    const esp32Connected = esp32Socket !== null && esp32Socket.readyState === WebSocket.OPEN;
    ws.send(JSON.stringify({ type: "esp32_status", online: esp32Connected }));
    ws.send(JSON.stringify({ type: "web_lock", active: isWebControlLocked() }));
  } catch {}

  ws.on("close", () => {
    browserClients.delete(ws);
    logger.info("Browser client disconnected from /ws-browser");
  });

  ws.on("error", () => {
    browserClients.delete(ws);
  });
}

function handleEsp32Connection(
  ws: WebSocket,
  req: IncomingMessage,
  sendTelegram: (msg: string) => void
) {
  const ip = req.socket.remoteAddress ?? "unknown";
  logger.info({ ip }, "ESP32 connected via WebSocket");

  if (offlineTimer) {
    clearTimeout(offlineTimer);
    offlineTimer = null;
  }

  // Terminate previous ESP32 connection if still open
  if (esp32Socket && esp32Socket !== ws) {
    const old = esp32Socket;
    try { old.terminate(); } catch {}
  }
  esp32Socket = ws;

  // --- Activity-based dead-connection detection ---
  // DHT22 sends data every ~1 s. If silent for 3 s → assume offline, terminate.
  // Check every 1 s for fast detection.
  lastEsp32MessageTime = Date.now();
  if (activityTimer) clearInterval(activityTimer);
  activityTimer = setInterval(() => {
    if (!esp32Socket || esp32Socket !== ws) {
      clearInterval(activityTimer!);
      activityTimer = null;
      return;
    }
    if (Date.now() - lastEsp32MessageTime > ACTIVITY_TIMEOUT_MS) {
      logger.warn("ESP32 activity timeout (3 s no data) — terminating dead connection");
      try { ws.terminate(); } catch {}
      clearInterval(activityTimer!);
      activityTimer = null;
    }
  }, 1_000);

  const now = Date.now();
  if (now - lastConnectNotifyTime >= TELEGRAM_NOTIFY_COOLDOWN_MS) {
    sendTelegram("✅ ESP32 đã kết nối lại");
    lastConnectNotifyTime = now;
  }
  broadcastLog("success", `ESP32 đã kết nối (${ip})`);

  // Khi ESP32 reconnect: kiểm tra admin có đang chạy không trước khi reset
  const adminCurrentlyActive = isAdminActive();

  if (!adminCurrentlyActive) {
    // Không có admin → reset pump về OFF như bình thường
    updateSystemState({ pump: "OFF" });
    logger.info("ESP32 reconnected — pump reset to OFF");
  } else {
    // Admin đang chạy → KHÔNG reset, giữ nguyên pump = ON
    logger.info("ESP32 reconnected during active admin mode — keeping pump ON");
  }

  // Gửi trạng thái khởi đầu cho ESP32 sau khi socket ổn định
  setTimeout(() => {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      const state = getSystemState();
      if (adminCurrentlyActive) {
        // Admin đang chạy → gửi lại lệnh admin ON để ESP32 biết
        ws.send(JSON.stringify({ type: "command", admin: "ON" }));
        logger.info("Re-sent admin ON to reconnected ESP32");
      } else {
        ws.send(JSON.stringify({ type: "command", pump: "OFF" }));
      }
      if (state.tft_enabled !== undefined) {
        ws.send(JSON.stringify({ type: "command", tft: state.tft_enabled ? "ON" : "OFF" }));
      }
    } catch (err) {
      logger.error({ err }, "Failed to send initial commands to ESP32");
    }
  }, 200);

  // Notify browsers that ESP32 is online
  broadcastToBrowsers({ type: "esp32_status", online: true });

  // FIX: Đếm cả WebSocket ping frames làm activity
  ws.on("ping", () => {
    lastEsp32MessageTime = Date.now();
  });

  // Server chủ động ping ESP32 mỗi 10 giây — giữ kết nối qua Render proxy.
  // Pong trả về → reset activity watchdog (tránh false-positive timeout).
  // KHÔNG terminate dựa vào pong — WebSocketsClient ESP32 không tự trả pong cho server-initiated ping.
  // Dead connection sẽ bị phát hiện bởi activityTimer (20s) khi ESP32 ngừng gửi data.
  ws.on("pong", () => {
    lastEsp32MessageTime = Date.now();
  });
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.ping(); } catch {}
    } else {
      clearInterval(pingInterval);
    }
  }, 10_000);

  // Cleanup ping interval khi socket đóng
  ws.on("close", () => { clearInterval(pingInterval); });

  ws.on("message", (data) => {
    lastEsp32MessageTime = Date.now(); // reset activity watchdog on every message
    try {
      const msg = JSON.parse(data.toString());
      handleMessage(ws, msg, sendTelegram);
    } catch (err) {
      logger.warn({ err }, "Invalid WS message from ESP32");
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ type: "error", message: String(err) })); } catch {}
      }
    }
  });

  ws.on("close", (code, reason) => {
    if (esp32Socket !== ws) {
      logger.info({ code, reason: reason?.toString() }, "Old ESP32 socket closed (already replaced)");
      return;
    }

    logger.info({ code, reason: reason?.toString() }, "ESP32 WebSocket disconnected");
    esp32Socket = null;
    if (activityTimer) { clearInterval(activityTimer); activityTimer = null; }

    broadcastToBrowsers({ type: "esp32_status", online: false });
    broadcastLog("error", "🔴 ESP32 mất kết nối — dữ liệu cảm biến không còn cập nhật!");

    // Chờ 5 giây để tránh báo nhầm khi ESP32 đang tự reconnect
    offlineTimer = setTimeout(() => {
      const nowDisc = Date.now();
      if (nowDisc - lastDisconnectNotifyTime >= TELEGRAM_NOTIFY_COOLDOWN_MS) {
        sendTelegram(
          `🔴 <b>ESP32 mất kết nối!</b>\n\nChủ nhân ơi, hệ thống không nhận được tín hiệu từ ESP32 rồi ạ 😟\nDữ liệu cảm biến hiện <b>không còn cập nhật</b>.\n\nKiểm tra nguồn điện và WiFi nhé chủ nhân!`
        );
        lastDisconnectNotifyTime = nowDisc;
      }
      broadcastLog("error", "🔴 ESP32 vẫn mất kết nối sau 5 giây — kiểm tra thiết bị!");
      offlineTimer = null;
    }, 5_000);
  });

  ws.on("error", (err) => {
    logger.error({ err }, "ESP32 WebSocket error");
  });
}

let prevFire = 0;
let prevRain = 0;

// Spike rejection: bỏ qua nếu nhảy > 35% trong 1 lần đọc
const SPIKE_THRESHOLD = 35;
let lastValidSoil  = -1;
let lastValidWater = -1;

function handleMessage(
  ws: WebSocket,
  msg: any,
  sendTelegram: (m: string) => void
) {
  if (msg.type === "sensor") {
    let soil = Number(msg.soil ?? 0);
    let water = Number(msg.water ?? 0);

    // Lọc spike đột biến — giữ giá trị cũ nếu nhảy quá lớn
    if (lastValidSoil >= 0 && soil > 0 && Math.abs(soil - lastValidSoil) > SPIKE_THRESHOLD) {
      logger.warn({ soil, lastValidSoil }, "Soil spike rejected");
      soil = lastValidSoil;
    } else if (soil > 0) {
      lastValidSoil = soil;
    }
    if (lastValidWater >= 0 && water > 0 && Math.abs(water - lastValidWater) > SPIKE_THRESHOLD) {
      logger.warn({ water, lastValidWater }, "Water spike rejected");
      water = lastValidWater;
    } else if (water > 0) {
      lastValidWater = water;
    }
    const temp = Number(msg.temp ?? 0);
    const hum = Number(msg.hum ?? 0);
    const fire = msg.fire ? 1 : 0;
    const rain = msg.rain ? 1 : 0;

    const state = getSystemState();
    const prevPump = state.pump;

    const nowUtc = new Date().toISOString().replace("T", " ").slice(0, 19);
    const stateUpdate: Record<string, any> = {
      soil,
      water,
      temp,
      hum,
      fire,
      rain,
      last_seen: nowUtc,
    };

    // Chỉ chạy pump logic khi admin KHÔNG active.
    // Nếu admin đang bật: bỏ qua hoàn toàn — tránh raw ADC hoặc bất kỳ sensor nào
    // gây ra lệnh pump:"OFF" làm tắt bơm giữa chừng admin session.
    if (!isAdminActive()) {
      if (soil >= 70) {
        // Đất đủ ẩm → tắt bơm và khóa auto-pump
        stateUpdate.pump = "OFF";
        stateUpdate.pump_locked = 1;
      } else if (soil < 28 && soil > 0 && state.pump_locked && !isWebControlLocked()) {
        // Đất đã khô lại dưới ngưỡng → tự mở khóa để auto-pump hoạt động lại
        stateUpdate.pump_locked = 0;
      }

      const effectiveLocked = stateUpdate.pump_locked ?? state.pump_locked;
      if (soil <= 30 && soil > 0 && !effectiveLocked) {
        stateUpdate.pump = "ON";
      }
    }

    try {
      updateSystemState(stateUpdate);
    } catch (dbErr) {
      logger.error({ dbErr, stateUpdate }, "updateSystemState failed");
      throw dbErr;
    }

    // Throttle log writes to DB
    const now = Date.now();
    if (now - lastLogTime >= LOG_INTERVAL_MS) {
      try {
        insertSensorLog({ soil, water, temp, hum, fire, rain });
        lastLogTime = now;
      } catch (logErr) {
        logger.error({ logErr }, "insertSensorLog failed");
      }
    }

    // Broadcast real-time sensor data to browser clients
    let newState: ReturnType<typeof getSystemState>;
    try {
      newState = getSystemState();
    } catch (stateErr) {
      logger.error({ stateErr }, "getSystemState (post-update) failed");
      throw stateErr;
    }
    broadcastToBrowsers({ type: "state", ...newState });

    const newPump = (stateUpdate.pump as "ON" | "OFF") ?? prevPump;
    if (newPump !== prevPump) {
      insertPumpLog({
        action: newPump,
        trigger: "auto",
        soil_at_start: soil,
        soil_at_end: null,
        duration_sec: null,
      });
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ type: "command", pump: newPump })); } catch {}
      }
      if (newPump === "ON") {
        broadcastLog("success", `🚿 Máy bơm TỰ ĐỘNG BẬT (Đất: ${soil}%)`);
      } else {
        broadcastLog("info", `💧 Máy bơm TỰ ĐỘNG TẮT — Đất đủ ẩm (${soil}%)`);
      }
    }

    // Fire detection change
    if (fire !== prevFire) {
      if (fire) {
        broadcastLog("error", "🔥 CẢNH BÁO: Phát hiện lửa!");
        sendTelegram("🔥 CẢNH BÁO: Phát hiện lửa!");
      } else {
        broadcastLog("info", "✅ Lửa đã tắt, an toàn");
      }
      prevFire = fire;
    }

    // Rain change
    if (rain !== prevRain) {
      if (rain) {
        broadcastLog("info", "🌧️ Bắt đầu có mưa");
      } else {
        broadcastLog("info", "☀️ Mưa đã tạnh");
      }
      prevRain = rain;
    }

    // Low water level
    if (water <= 10 && water > 0) {
      broadcastLog("warn", `⚠️ Mực nước thấp: ${water}% — cần bổ sung nước!`);
    }

  } else if (msg.type === "notify") {
    const message = String(msg.message ?? "");
    if (!message) return;
    broadcastLog("warn", `📢 ESP32: ${message}`);
    const state = getSystemState();
    if (state.alert_enabled) {
      sendTelegram(`🔔 <b>ESP32 thông báo:</b>\n${message}`);
    }
  } else if (msg.type === "pre_water") {
    logger.info("ESP32 sent pre_water signal — broadcasting to browsers and Telegram");
    broadcastToBrowsers({ type: "pre_water" });
    broadcastLog("info", "🚿 ESP32 đang chuẩn bị tưới...");
    sendTelegram("🚿 Đang chuẩn bị tưới đây chủ nhân~");
  } else {
    logger.warn({ type: msg.type }, "Unknown WS message type");
  }
}
