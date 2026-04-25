import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.join(process.cwd(), "packages/api-server/data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(dataDir, "nexora.db");
const db = new Database(DB_PATH);
db.pragma("busy_timeout = 5000");
try { db.pragma("journal_mode = WAL"); } catch (e) { console.warn("[db] WAL mode skipped:", (e as Error).message); }

db.exec(`
  CREATE TABLE IF NOT EXISTS access_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip         TEXT,
    method     TEXT,
    path       TEXT,
    status     INTEGER,
    duration_ms INTEGER,
    user_agent TEXT,
    referer    TEXT
  );

  CREATE TABLE IF NOT EXISTS tool_logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip        TEXT,
    tool      TEXT,
    action    TEXT,
    detail    TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_access_ts   ON access_logs (timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_access_status ON access_logs (status);
  CREATE INDEX IF NOT EXISTS idx_tool_ts     ON tool_logs (timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_tool_name   ON tool_logs (tool);
`);

export interface AccessLog {
  id: number;
  timestamp: string;
  ip: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  user_agent: string;
  referer: string;
}

export interface ToolLog {
  id: number;
  timestamp: string;
  ip: string;
  tool: string;
  action: string;
  detail: string;
}

export function insertAccessLog(data: Omit<AccessLog, "id" | "timestamp">) {
  db.prepare(`
    INSERT INTO access_logs (ip, method, path, status, duration_ms, user_agent, referer)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.ip ?? "",
    data.method ?? "",
    data.path ?? "",
    data.status ?? 0,
    data.duration_ms ?? 0,
    (data.user_agent ?? "").slice(0, 512),
    (data.referer ?? "").slice(0, 256),
  );
}

export function insertToolLog(data: Omit<ToolLog, "id" | "timestamp">) {
  db.prepare(`
    INSERT INTO tool_logs (ip, tool, action, detail)
    VALUES (?, ?, ?, ?)
  `).run(
    data.ip ?? "",
    data.tool ?? "",
    data.action ?? "",
    (data.detail ?? "").slice(0, 1000),
  );
}

export function getAccessLogs(opts: {
  limit: number;
  offset: number;
  onlyErrors?: boolean;
  search?: string;
}): { rows: AccessLog[]; total: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.onlyErrors) {
    conditions.push("status >= 400");
  }
  if (opts.search) {
    conditions.push("(path LIKE ? OR ip LIKE ?)");
    params.push(`%${opts.search}%`, `%${opts.search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM access_logs ${where}`).get(...params) as { cnt: number }).cnt;
  const rows = db.prepare(`SELECT * FROM access_logs ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...params, opts.limit, opts.offset) as AccessLog[];
  return { rows, total };
}

export function getToolLogs(opts: {
  limit: number;
  offset: number;
  tool?: string;
  search?: string;
}): { rows: ToolLog[]; total: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.tool && opts.tool !== "all") {
    conditions.push("tool = ?");
    params.push(opts.tool);
  }
  if (opts.search) {
    conditions.push("(detail LIKE ? OR ip LIKE ?)");
    params.push(`%${opts.search}%`, `%${opts.search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM tool_logs ${where}`).get(...params) as { cnt: number }).cnt;
  const rows = db.prepare(`SELECT * FROM tool_logs ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...params, opts.limit, opts.offset) as ToolLog[];
  return { rows, total };
}

export function getStats() {
  const today = new Date().toISOString().slice(0, 10);

  const totalRequests = (db.prepare("SELECT COUNT(*) as cnt FROM access_logs").get() as { cnt: number }).cnt;
  const uniqueIPs = (db.prepare("SELECT COUNT(DISTINCT ip) as cnt FROM access_logs").get() as { cnt: number }).cnt;
  const todayRequests = (db.prepare("SELECT COUNT(*) as cnt FROM access_logs WHERE timestamp >= ?").get(`${today} 00:00:00`) as { cnt: number }).cnt;
  const totalErrors = (db.prepare("SELECT COUNT(*) as cnt FROM access_logs WHERE status >= 400").get() as { cnt: number }).cnt;
  const todayErrors = (db.prepare("SELECT COUNT(*) as cnt FROM access_logs WHERE status >= 400 AND timestamp >= ?").get(`${today} 00:00:00`) as { cnt: number }).cnt;
  const totalAICalls = (db.prepare("SELECT COUNT(*) as cnt FROM tool_logs WHERE tool IN ('chat','prompt-gen','formatter','ocr')").get() as { cnt: number }).cnt;
  const todayAICalls = (db.prepare("SELECT COUNT(*) as cnt FROM tool_logs WHERE tool IN ('chat','prompt-gen','formatter','ocr') AND timestamp >= ?").get(`${today} 00:00:00`) as { cnt: number }).cnt;
  const totalToolUsage = (db.prepare("SELECT COUNT(*) as cnt FROM tool_logs").get() as { cnt: number }).cnt;

  const topPaths = db.prepare(`
    SELECT path, COUNT(*) as cnt FROM access_logs
    WHERE path NOT LIKE '/api/admin%'
    GROUP BY path ORDER BY cnt DESC LIMIT 10
  `).all() as { path: string; cnt: number }[];

  const toolBreakdown = db.prepare(`
    SELECT tool, COUNT(*) as cnt FROM tool_logs
    GROUP BY tool ORDER BY cnt DESC
  `).all() as { tool: string; cnt: number }[];

  const recentIPs = db.prepare(`
    SELECT ip, COUNT(*) as cnt, MAX(timestamp) as last_seen
    FROM access_logs
    GROUP BY ip ORDER BY last_seen DESC LIMIT 10
  `).all() as { ip: string; cnt: number; last_seen: string }[];

  const statusBreakdown = db.prepare(`
    SELECT status, COUNT(*) as cnt FROM access_logs
    GROUP BY status ORDER BY cnt DESC LIMIT 10
  `).all() as { status: number; cnt: number }[];

  return {
    totalRequests,
    uniqueIPs,
    todayRequests,
    totalErrors,
    todayErrors,
    totalAICalls,
    todayAICalls,
    totalToolUsage,
    topPaths,
    toolBreakdown,
    recentIPs,
    statusBreakdown,
  };
}

export function clearLogs(type: "access" | "tool" | "all") {
  if (type === "access" || type === "all") {
    db.prepare("DELETE FROM access_logs").run();
  }
  if (type === "tool" || type === "all") {
    db.prepare("DELETE FROM tool_logs").run();
  }
}
