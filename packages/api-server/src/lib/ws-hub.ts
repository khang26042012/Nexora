import { WebSocketServer, type WebSocket } from "ws";
import crypto from "node:crypto";

// ── WS Hub: plugin (Minecraft) ↔ backend (Express) ──
//
// Protocol:
//   Client (plugin) connect tới PATH, gửi header X-Plugin-Key.
//   Server verify key, accept connection, expect { type: "hello" } frame.
//   Server → plugin: { id, action, payload }
//   Plugin → server: { id, ok, result | error }
//   Plugin → server (event): { type: "event", event, data }

interface PendingRequest {
  resolve: (v: any) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

interface PluginState {
  ws: WebSocket;
  helloAt: number;
  serverName?: string;
  pluginVersion?: string;
  lastEventAt?: number;
  // Last-known state from plugin (events).
  players: Map<string, any>;
  bans: any[];
  ipBans: string[];
  log: any[];
}

const REQUEST_TIMEOUT_MS = 10_000;
const LOG_BUFFER_MAX = 200;

let hub: PluginState | null = null;
let wss: WebSocketServer | null = null;

export function isHubConnected(): boolean {
  return hub !== null;
}

export function getHubState() {
  if (!hub) return null;
  return {
    serverName: hub.serverName,
    pluginVersion: hub.pluginVersion,
    lastEventAt: hub.lastEventAt,
    playersCount: hub.players.size,
    bansCount: hub.bans.length,
    logCount: hub.log.length,
  };
}

// ── Send request to plugin, await response by id ──
export function requestPlugin(action: string, payload: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!hub || hub.ws.readyState !== hub.ws.OPEN) {
      reject(new Error("Plugin chưa kết nối"));
      return;
    }
    const id = crypto.randomUUID();
    const pending: PendingRequest = {
      resolve,
      reject,
      timer: setTimeout(() => {
        hub && (hub as any).pending?.delete(id);
        reject(new Error(`Plugin request timeout (action=${action})`));
      }, REQUEST_TIMEOUT_MS),
    };
    if (!(hub as any).pending) (hub as any).pending = new Map();
    (hub as any).pending.set(id, pending);
    hub.ws.send(JSON.stringify({ id, action, payload }));
  });
}

// ── Get cached players list ──
export function getCachedPlayers(): any[] | null {
  if (!hub) return null;
  return Array.from(hub.players.values());
}

// ── Get cached bans ──
export function getCachedBans(): any[] | null {
  return hub ? hub.bans : null;
}

// ── Get cached log ──
export function getCachedLog(): any[] | null {
  return hub ? hub.log : null;
}

// ── Setup WS server on a given HTTP server (so Railway reverse proxy works) ──
export function attachWsHub(server: import("http").Server, pluginKey: string) {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (req.url !== "/ws/plugin") {
      socket.destroy();
      return;
    }
    const key = req.headers["x-plugin-key"];
    if (!pluginKey) {
      socket.write("HTTP/1.1 503 Plugin key chưa cấu hình\r\n\r\n");
      socket.destroy();
      return;
    }
    if (key !== pluginKey) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    wss!.handleUpgrade(req, socket, head, (ws) => {
      onConnection(ws);
    });
  });

  console.log("[ws-hub] WebSocket server ready on /ws/plugin");
}

function onConnection(ws: WebSocket) {
  console.log("[ws-hub] Plugin connected");
  // If a previous connection exists, close it.
  if (hub) {
    try { hub.ws.close(1000, "replaced"); } catch {}
  }
  const state: PluginState = {
    ws,
    helloAt: Date.now(),
    players: new Map(),
    bans: [],
    ipBans: [],
    log: [],
  };
  (state as any).pending = new Map<string, PendingRequest>();
  hub = state;

  ws.on("message", (raw) => {
    let msg: any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    // Response to a request
    if (msg.id && (state as any).pending.has(msg.id)) {
      const p = (state as any).pending.get(msg.id) as PendingRequest;
      (state as any).pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.ok) p.resolve(msg.result);
      else p.reject(new Error(msg.error || "Plugin error"));
      return;
    }

    // Hello frame
    if (msg.type === "hello") {
      state.serverName = msg.server || "unknown";
      state.pluginVersion = msg.version || "?";
      console.log(`[ws-hub] hello from ${state.serverName} plugin v${state.pluginVersion}`);
      return;
    }

    // Event frame (player join/leave, action log, bans update...)
    if (msg.type === "event") {
      state.lastEventAt = Date.now();
      switch (msg.event) {
        case "player-join":
          state.players.set(msg.data.uuid || msg.data.name, msg.data);
          break;
        case "player-quit":
          state.players.delete(msg.data.uuid || msg.data.name);
          break;
        case "snapshot":
          // Plugin pushes full state (players/bans/log) periodically or on demand.
          if (Array.isArray(msg.data.players)) {
            state.players.clear();
            for (const p of msg.data.players) state.players.set(p.uuid || p.name, p);
          }
          if (Array.isArray(msg.data.bans)) state.bans = msg.data.bans;
          if (Array.isArray(msg.data.ipBans)) state.ipBans = msg.data.ipBans;
          if (Array.isArray(msg.data.log)) {
            state.log = msg.data.log.slice(-LOG_BUFFER_MAX);
          }
          break;
        case "log":
          state.log.push(msg.data);
          if (state.log.length > LOG_BUFFER_MAX) state.log.shift();
          break;
        case "bans-update":
          if (Array.isArray(msg.data.bans)) state.bans = msg.data.bans;
          if (Array.isArray(msg.data.ipBans)) state.ipBans = msg.data.ipBans;
          break;
      }
      return;
    }
  });

  ws.on("close", () => {
    console.log("[ws-hub] Plugin disconnected");
    if (hub === state) {
      // Reject all pending
      const pendings = (state as any).pending as Map<string, PendingRequest>;
      for (const [, p] of pendings) {
        clearTimeout(p.timer);
        p.reject(new Error("Plugin disconnected"));
      }
      hub = null;
    }
  });

  ws.on("error", (e) => {
    console.error("[ws-hub] socket error:", e.message);
  });
}
