const BASE = "/NexoraGarden/api";

export interface SystemState {
  id: number;
  pump: "ON" | "OFF";
  pump_locked: number;
  alert_enabled: number;
  tft_enabled: number;
  last_seen: string | null;
  soil: number;
  water: number;
  temp: number;
  hum: number;
  fire: number;
  rain: number;
  admin_active?: boolean;
}

export interface SensorLog {
  id: number;
  timestamp: string;
  soil: number;
  water: number;
  temp: number;
  hum: number;
  fire: number;
  rain: number;
}

export interface Command {
  id: number;
  name: string;
  command: string;
  description: string;
  is_builtin: number;
  created_at: string;
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getStatus: () => req<SystemState>("/status"),
  getLogs: (limit = 20) => req<SensorLog[]>(`/logs?limit=${limit}`),
  getReport: () => req<any>("/report"),
  pumpControl: (action: "ON" | "OFF") =>
    req<any>("/pump", { method: "POST", body: JSON.stringify({ action }) }),
  unlockControl: (action: "ON" | "OFF") =>
    req<any>("/unlock", { method: "POST", body: JSON.stringify({ action }) }),
  alertControl: (enabled: boolean) =>
    req<any>("/alert", { method: "POST", body: JSON.stringify({ enabled }) }),
  tftControl: (enabled: boolean) =>
    req<any>("/tft", { method: "POST", body: JSON.stringify({ enabled }) }),
  adminControl: (action: "ON" | "OFF") =>
    req<any>("/admin", { method: "POST", body: JSON.stringify({ action }) }),
  getCommands: () => req<Command[]>("/commands"),
  addCommand: (data: { name: string; command: string; description: string }) =>
    req<any>("/commands", { method: "POST", body: JSON.stringify(data) }),
  updateCommand: (id: number, data: { name: string; command: string; description: string }) =>
    req<any>(`/commands/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCommand: (id: number) =>
    req<any>(`/commands/${id}`, { method: "DELETE" }),
};
