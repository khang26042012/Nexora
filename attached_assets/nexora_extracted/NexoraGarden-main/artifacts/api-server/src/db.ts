import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(dataDir, "nexora.db");

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sensor_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      soil INTEGER,
      water INTEGER,
      temp REAL,
      hum REAL,
      fire INTEGER,
      rain INTEGER
    );

    CREATE TABLE IF NOT EXISTS pump_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      action TEXT,
      trigger TEXT,
      soil_at_start INTEGER,
      soil_at_end INTEGER,
      duration_sec INTEGER
    );

    CREATE TABLE IF NOT EXISTS system_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      pump TEXT DEFAULT 'OFF',
      pump_locked INTEGER DEFAULT 0,
      alert_enabled INTEGER DEFAULT 1,
      tft_enabled INTEGER DEFAULT 1,
      last_seen DATETIME,
      soil INTEGER DEFAULT 0,
      water INTEGER DEFAULT 0,
      temp REAL DEFAULT 0,
      hum REAL DEFAULT 0,
      fire INTEGER DEFAULT 0,
      rain INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      command TEXT NOT NULL,
      description TEXT,
      is_builtin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO system_state (id) VALUES (1);
  `);

  // Migrate: add tft_enabled if missing
  try {
    db.exec(`ALTER TABLE system_state ADD COLUMN tft_enabled INTEGER DEFAULT 1`);
  } catch {}

  // Seed built-in commands if empty
  const count = (db.prepare("SELECT COUNT(*) as c FROM commands").get() as any).c;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO commands (name, command, description, is_builtin)
      VALUES (@name, @command, @description, @is_builtin)
    `);
    const builtins = [
      { name: "Trạng thái hệ thống", command: "/status", description: "Xem trạng thái hiện tại của vườn", is_builtin: 1 },
      { name: "Thời tiết", command: "/weather", description: "Xem thời tiết tại vị trí vườn", is_builtin: 1 },
      { name: "Nhật ký cảm biến", command: "/logs", description: "Xem 10 bản ghi cảm biến gần nhất", is_builtin: 1 },
      { name: "Báo cáo hôm nay", command: "/report", description: "Xem báo cáo tổng hợp trong ngày", is_builtin: 1 },
      { name: "Lịch sử bơm", command: "/history", description: "Xem lịch sử hoạt động máy bơm", is_builtin: 1 },
      { name: "Bật máy bơm", command: "/pump_on", description: "Bật máy bơm thủ công (yêu cầu độ ẩm đất < 30%)", is_builtin: 1 },
      { name: "Tắt máy bơm", command: "/pump_off", description: "Tắt máy bơm và mở khóa tự động", is_builtin: 1 },
      { name: "Mở khóa bơm", command: "/unlock_on", description: "Cho phép bơm tự động (tự tắt sau 500s)", is_builtin: 1 },
      { name: "Khóa bơm", command: "/unlock_off", description: "Tắt chế độ mở khóa bơm tự động", is_builtin: 1 },
      { name: "Bật cảnh báo", command: "/alert_on", description: "Bật thông báo cảnh báo qua Telegram", is_builtin: 1 },
      { name: "Tắt cảnh báo", command: "/alert_off", description: "Tắt thông báo cảnh báo qua Telegram", is_builtin: 1 },
      { name: "Xóa dữ liệu log", command: "/clear", description: "Xóa toàn bộ sensor_logs và pump_logs", is_builtin: 1 },
      { name: "Trợ giúp", command: "/help", description: "Xem danh sách tất cả lệnh có sẵn", is_builtin: 1 },
    ];
    for (const b of builtins) insert.run(b);
  }
}

export function getSystemState() {
  return db.prepare("SELECT * FROM system_state WHERE id = 1").get() as SystemState;
}

export function updateSystemState(fields: Partial<SystemState>) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const set = keys.map((k) => `${k} = @${k}`).join(", ");
  db.prepare(`UPDATE system_state SET ${set} WHERE id = 1`).run(fields);
}

export function insertSensorLog(data: SensorData) {
  db.prepare(`
    INSERT INTO sensor_logs (soil, water, temp, hum, fire, rain)
    VALUES (@soil, @water, @temp, @hum, @fire, @rain)
  `).run(data);
}

export function getRecentLogs(limit = 10) {
  return db.prepare(
    "SELECT * FROM sensor_logs ORDER BY timestamp DESC LIMIT ?"
  ).all(limit);
}

export function insertPumpLog(data: Partial<PumpLog>) {
  db.prepare(`
    INSERT INTO pump_logs (action, trigger, soil_at_start, soil_at_end, duration_sec)
    VALUES (@action, @trigger, @soil_at_start, @soil_at_end, @duration_sec)
  `).run(data);
}

export function getPumpLogs() {
  return db.prepare(
    "SELECT * FROM pump_logs ORDER BY timestamp DESC"
  ).all();
}

export function getTodayReport() {
  const avgStats = db.prepare(`
    SELECT
      ROUND(AVG(temp), 1) as avg_temp,
      ROUND(AVG(hum), 1) as avg_hum,
      COUNT(*) as total_readings,
      SUM(CASE WHEN fire = 1 THEN 1 ELSE 0 END) as fire_events,
      SUM(CASE WHEN rain = 1 THEN 1 ELSE 0 END) as rain_events
    FROM sensor_logs
    WHERE DATE(timestamp) = DATE('now')
  `).get() as any;

  const pumpCount = db.prepare(`
    SELECT COUNT(*) as count FROM pump_logs
    WHERE action = 'ON' AND DATE(timestamp) = DATE('now')
  `).get() as any;

  return { ...avgStats, pump_activations: pumpCount?.count ?? 0 };
}

export function clearAllLogs() {
  db.prepare("DELETE FROM sensor_logs").run();
  db.prepare("DELETE FROM pump_logs").run();
}

export function getCommands() {
  return db.prepare("SELECT * FROM commands ORDER BY is_builtin DESC, id ASC").all();
}

export function addCommand(data: { name: string; command: string; description: string }) {
  return db.prepare(`
    INSERT INTO commands (name, command, description, is_builtin)
    VALUES (@name, @command, @description, 0)
  `).run(data);
}

export function updateCommand(id: number, data: { name: string; command: string; description: string }) {
  return db.prepare(`
    UPDATE commands SET name = @name, command = @command, description = @description
    WHERE id = @id AND is_builtin = 0
  `).run({ ...data, id });
}

export function deleteCommand(id: number) {
  return db.prepare("DELETE FROM commands WHERE id = ? AND is_builtin = 0").run(id);
}

export interface SensorData {
  soil: number;
  water: number;
  temp: number;
  hum: number;
  fire: number;
  rain: number;
}

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
}

export interface PumpLog {
  id: number;
  timestamp: string;
  action: string;
  trigger: string;
  soil_at_start: number | null;
  soil_at_end: number | null;
  duration_sec: number | null;
}
