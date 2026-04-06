import { useEffect, useRef, useState, useCallback } from "react";
import type { SystemState } from "@/lib/api";

export type LogEntry = {
  id: number;
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
};

let logIdCounter = 0;

type WsState = {
  connected: boolean;
  esp32Online: boolean;
  data: SystemState | null;
  logs: LogEntry[];
  preWaterAlert: boolean;
  webLockActive: boolean;
};

export function useWebSocket() {
  const [state, setState] = useState<WsState>({
    connected: false,
    esp32Online: false,
    data: null,
    logs: [],
    preWaterAlert: false,
    webLockActive: false,
  });
  const preWaterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback((level: LogEntry["level"], message: string, timestamp?: string) => {
    const entry: LogEntry = {
      id: ++logIdCounter,
      timestamp: timestamp ?? new Date().toISOString(),
      level,
      message,
    };
    setState((s) => ({ ...s, logs: [entry, ...s.logs].slice(0, 200) }));
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws-browser`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((s) => ({ ...s, connected: true }));
      addLog("success", "Dashboard đã kết nối WebSocket");
    };

    ws.onclose = () => {
      setState((s) => ({ ...s, connected: false }));
      addLog("warn", "WebSocket bị ngắt kết nối, thử lại...");
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "state") {
          const { type: _t, ...data } = msg;
          // Không tự set esp32Online=true ở đây — server gửi state từ DB ngay cả khi ESP32 offline.
          // Trạng thái online/offline chỉ được set bởi message "esp32_status".
          setState((s) => ({ ...s, data: data as SystemState }));
        } else if (msg.type === "esp32_status") {
          setState((s) => ({
            ...s,
            esp32Online: msg.online,
            // Khi offline: xóa pump state để không hiện sai
            data: msg.online ? s.data : s.data ? { ...s.data, pump: "OFF" as const } : s.data,
          }));
        } else if (msg.type === "log") {
          addLog(msg.level ?? "info", msg.message, msg.timestamp);
        } else if (msg.type === "pre_water") {
          setState((s) => ({ ...s, preWaterAlert: true }));
          if (preWaterTimer.current) clearTimeout(preWaterTimer.current);
          preWaterTimer.current = setTimeout(() => {
            setState((s) => ({ ...s, preWaterAlert: false }));
            preWaterTimer.current = null;
          }, 8000);
        } else if (msg.type === "web_lock") {
          setState((s) => ({ ...s, webLockActive: !!msg.active }));
        }
      } catch {}
    };
  }, [addLog]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (preWaterTimer.current) clearTimeout(preWaterTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return state;
}
