import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, LogOut, RefreshCw, Search, Trash2,
  Users, AlertTriangle, ChevronLeft, ChevronRight,
  Clock, Globe, Bot, Wrench, TrendingUp, Eye, EyeOff,
  Download, Activity
} from "lucide-react";

const ADMIN_KEY_STORAGE = "nexora_admin_key";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

/* ─── Types ─────────────────────────────────────────── */
interface Stats {
  totalRequests: number;
  uniqueIPs: number;
  todayRequests: number;
  totalErrors: number;
  todayErrors: number;
  totalAICalls: number;
  todayAICalls: number;
  totalToolUsage: number;
  topPaths: { path: string; cnt: number }[];
  toolBreakdown: { tool: string; cnt: number }[];
  recentIPs: { ip: string; cnt: number; last_seen: string }[];
  statusBreakdown: { status: number; cnt: number }[];
}

interface AccessLog {
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

interface ToolLog {
  id: number;
  timestamp: string;
  ip: string;
  tool: string;
  action: string;
  detail: string;
}

/* ─── Helpers ──────────────────────────────────────── */
function statusColor(s: number) {
  if (s < 300) return "text-green-400";
  if (s < 400) return "text-blue-400";
  if (s < 500) return "text-yellow-400";
  return "text-red-400";
}

function statusBg(s: number) {
  if (s < 300) return "bg-green-500/15 text-green-400 border border-green-500/30";
  if (s < 400) return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
  if (s < 500) return "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30";
  return "bg-red-500/15 text-red-400 border border-red-500/30";
}

function methodBg(m: string) {
  if (m === "GET") return "bg-blue-500/15 text-blue-400";
  if (m === "POST") return "bg-purple-500/15 text-purple-400";
  if (m === "DELETE") return "bg-red-500/15 text-red-400";
  return "bg-zinc-500/15 text-zinc-400";
}

function toolIcon(t: string) {
  if (t === "chat" || t === "prompt-gen" || t === "ocr" || t === "formatter") return <Bot size={12} />;
  return <Wrench size={12} />;
}

function toolColor(t: string) {
  const map: Record<string, string> = {
    chat: "text-violet-400 bg-violet-500/15 border-violet-500/30",
    "prompt-gen": "text-purple-400 bg-purple-500/15 border-purple-500/30",
    ocr: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
    formatter: "text-sky-400 bg-sky-500/15 border-sky-500/30",
    yt: "text-red-400 bg-red-500/15 border-red-500/30",
    trim: "text-orange-400 bg-orange-500/15 border-orange-500/30",
    notes: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30",
  };
  return map[t] ?? "text-zinc-400 bg-zinc-500/15 border-zinc-500/30";
}

function fmtTime(ts: string) {
  try {
    return new Date(ts).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return ts; }
}

function fmtDur(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ─── Login Gate ──────────────────────────────────────── */
function LoginGate({ onLogin }: { onLogin: (key: string) => void }) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${BASE}/api/admin/stats`, {
        headers: { "x-admin-key": key },
      });
      if (r.ok) {
        sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
        onLogin(key);
      } else {
        setError("Sai mật khẩu admin");
      }
    } catch {
      setError("Không kết nối được server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(124,58,237,0.12) 0%, #050505 70%)" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="rounded-2xl border border-white/8 p-8"
          style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)" }}>
          <div className="flex flex-col items-center mb-8 gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
              <Shield size={28} className="text-white" />
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">Nexora Admin</div>
              <div className="text-sm text-white/40 mt-1">Nhập mật khẩu để tiếp tục</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="Admin key..."
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-violet-500/60 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
                autoFocus
              />
              <button type="button" onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && <div className="text-red-400 text-sm text-center">{error}</div>}
            <button type="submit" disabled={loading || !key.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
              {loading ? "Đang kiểm tra..." : "Đăng nhập"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── AnimBorderCard (running-border) ───────────────── */
function AnimBorderCard({
  children, speed = 5, color = "rgba(124,58,237,0.9)",
  radius = 18, style = {}, className = "",
}: {
  children: React.ReactNode; speed?: number; color?: string;
  radius?: number; style?: React.CSSProperties; className?: string;
}) {
  return (
    <div
      className={`running-border ${className}`}
      style={{
        "--rb-speed": `${speed}s`,
        "--rb-color": color,
        "--rb-radius": `${radius}px`,
        background: "rgba(255,255,255,0.04)",
        ...style,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────── */
function StatCard({
  icon, label, value, sub, color = "#7c3aed"
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <AnimBorderCard speed={6} color={`${color}cc`} radius={18} style={{ padding: "1.25rem" }}>
      <div className="flex gap-4 items-start">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}22` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <div className="text-2xl font-bold text-white leading-none mb-1">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
          <div className="text-sm text-white/50">{label}</div>
          {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
        </div>
      </div>
    </AnimBorderCard>
  );
}

/* ─── Pagination ─────────────────────────────────────── */
function Pagination({
  page, total, limit, onChange
}: { page: number; total: number; limit: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-2 justify-center mt-4">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white disabled:opacity-30 transition-colors"
        style={{ background: "rgba(255,255,255,0.06)" }}>
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm text-white/50">
        Trang {page}/{pages} ({total.toLocaleString()} bản ghi)
      </span>
      <button onClick={() => onChange(page + 1)} disabled={page >= pages}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white disabled:opacity-30 transition-colors"
        style={{ background: "rgba(255,255,255,0.06)" }}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

/* ─── Access Logs Table ──────────────────────────────── */
function AccessLogsPanel({
  adminKey, onlyErrors = false
}: { adminKey: string; onlyErrors?: boolean }) {
  const [rows, setRows] = useState<AccessLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const limit = 50;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p: number, s: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p), limit: String(limit),
        type: onlyErrors ? "error" : "all",
        search: s,
      });
      const r = await fetch(`${BASE}/api/admin/logs?${params}`, {
        headers: { "x-admin-key": adminKey },
      });
      const data = await r.json();
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [adminKey, onlyErrors]);

  useEffect(() => {
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400);
  }, [search]);

  useEffect(() => { load(page, debouncedSearch); }, [load, page, debouncedSearch]);

  function exportCSV() {
    const header = "ID,Timestamp,IP,Method,Path,Status,Duration(ms),User-Agent";
    const csvRows = rows.map(r =>
      [r.id, r.timestamp, r.ip, r.method, r.path, r.status, r.duration_ms, `"${r.user_agent}"`].join(",")
    );
    const blob = new Blob([[header, ...csvRows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `access-logs-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo path, IP..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-violet-500/50 transition-colors"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
        </div>
        <button onClick={() => load(page, debouncedSearch)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white border border-white/10 hover:border-violet-500/50 transition-all"
          style={{ background: "rgba(255,255,255,0.05)" }}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white border border-white/10 hover:border-violet-500/50 transition-all"
          style={{ background: "rgba(255,255,255,0.05)" }}>
          <Download size={14} /> CSV
        </button>
      </div>

      <div className="rounded-xl border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                {["Thời gian", "IP", "Method", "Path", "Status", "Thời lượng"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr><td colSpan={6} className="text-center py-12 text-white/30">Không có dữ liệu</td></tr>
              )}
              {rows.map((row, i) => (
                <tr key={row.id}
                  className="border-t border-white/5 hover:bg-white/3 transition-colors group"
                  style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <td className="px-4 py-2.5 text-white/40 text-xs whitespace-nowrap font-mono">
                    {fmtTime(row.timestamp)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-cyan-400/80">{row.ip}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${methodBg(row.method)}`}>
                      {row.method}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 max-w-xs">
                    <span className="font-mono text-xs text-white/70 truncate block" title={row.path}>
                      {row.path}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${statusBg(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-mono ${row.duration_ms > 2000 ? "text-red-400" : row.duration_ms > 500 ? "text-yellow-400" : "text-green-400"}`}>
                      {fmtDur(row.duration_ms)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} total={total} limit={limit} onChange={setPage} />
    </div>
  );
}

/* ─── Tool Logs Panel ────────────────────────────────── */
function ToolLogsPanel({ adminKey }: { adminKey: string }) {
  const [rows, setRows] = useState<ToolLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tool, setTool] = useState("all");
  const [loading, setLoading] = useState(false);
  const limit = 50;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tools = ["all", "chat", "prompt-gen", "formatter", "ocr", "yt", "trim", "notes"];

  const load = useCallback(async (p: number, s: string, t: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit), tool: t, search: s });
      const r = await fetch(`${BASE}/api/admin/tool-logs?${params}`, {
        headers: { "x-admin-key": adminKey },
      });
      const data = await r.json();
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400);
  }, [search]);

  useEffect(() => { load(page, debouncedSearch, tool); }, [load, page, debouncedSearch, tool]);

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm trong nội dung, IP..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-violet-500/50 transition-colors"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {tools.map(t => (
            <button key={t} onClick={() => { setTool(t); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                tool === t
                  ? "text-white border-violet-500/60 bg-violet-500/20"
                  : "text-white/40 border-white/10 hover:text-white/70"
              }`}
              style={{ background: tool === t ? undefined : "rgba(255,255,255,0.04)" }}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={() => load(page, debouncedSearch, tool)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white border border-white/10 hover:border-violet-500/50 transition-all"
          style={{ background: "rgba(255,255,255,0.05)" }}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      <div className="rounded-xl border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                {["Thời gian", "IP", "Tool", "Action", "Nội dung"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr><td colSpan={5} className="text-center py-12 text-white/30">Không có dữ liệu</td></tr>
              )}
              {rows.map((row, i) => (
                <tr key={row.id}
                  className="border-t border-white/5 hover:bg-white/3 transition-colors"
                  style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <td className="px-4 py-2.5 text-white/40 text-xs whitespace-nowrap font-mono">
                    {fmtTime(row.timestamp)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-cyan-400/80">{row.ip}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium border ${toolColor(row.tool)}`}>
                      {toolIcon(row.tool)}{row.tool}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-white/50 font-mono">{row.action}</span>
                  </td>
                  <td className="px-4 py-2.5 max-w-sm">
                    <span className="text-xs text-white/60 break-words line-clamp-2" title={row.detail}>
                      {row.detail || <span className="text-white/20 italic">—</span>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} total={total} limit={limit} onChange={setPage} />
    </div>
  );
}

/* ─── Stats Overview ─────────────────────────────────── */
function StatsPanel({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Activity size={20} />} label="Tổng requests" value={stats.totalRequests} sub={`${stats.todayRequests} hôm nay`} color="#7c3aed" />
        <StatCard icon={<Users size={20} />} label="IP độc lập" value={stats.uniqueIPs} sub="tất cả thời gian" color="#0ea5e9" />
        <StatCard icon={<AlertTriangle size={20} />} label="Tổng lỗi" value={stats.totalErrors} sub={`${stats.todayErrors} hôm nay`} color="#f59e0b" />
        <StatCard icon={<Bot size={20} />} label="AI calls" value={stats.totalAICalls} sub={`${stats.todayAICalls} hôm nay`} color="#10b981" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top paths */}
        <AnimBorderCard speed={7} color="rgba(124,58,237,0.7)" radius={18} style={{ padding: "1.25rem" }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-violet-400" />
            <span className="text-sm font-semibold text-white">Top Paths</span>
          </div>
          <div className="space-y-2">
            {stats.topPaths.map((p, i) => {
              const max = stats.topPaths[0]?.cnt || 1;
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-mono text-white/60 truncate max-w-[180px]">{p.path || "/"}</span>
                    <span className="text-white/40 ml-2 flex-shrink-0">{p.cnt}</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-violet-500/60 transition-all"
                      style={{ width: `${(p.cnt / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {stats.topPaths.length === 0 && <div className="text-white/30 text-xs">Chưa có dữ liệu</div>}
          </div>
        </AnimBorderCard>

        {/* Tool Breakdown */}
        <AnimBorderCard speed={8} color="rgba(6,182,212,0.7)" radius={18} style={{ padding: "1.25rem" }}>
          <div className="flex items-center gap-2 mb-4">
            <Wrench size={16} className="text-cyan-400" />
            <span className="text-sm font-semibold text-white">Tool Usage</span>
          </div>
          <div className="space-y-2">
            {stats.toolBreakdown.map((t, i) => {
              const max = stats.toolBreakdown[0]?.cnt || 1;
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`inline-flex items-center gap-1 font-medium ${toolColor(t.tool).split(" ")[0]}`}>
                      {toolIcon(t.tool)} {t.tool}
                    </span>
                    <span className="text-white/40">{t.cnt}</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-cyan-500/60 transition-all"
                      style={{ width: `${(t.cnt / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {stats.toolBreakdown.length === 0 && <div className="text-white/30 text-xs">Chưa có dữ liệu</div>}
          </div>
        </AnimBorderCard>

        {/* Status Breakdown + Recent IPs */}
        <div className="space-y-4">
          <AnimBorderCard speed={9} color="rgba(16,185,129,0.7)" radius={18} style={{ padding: "1.25rem" }}>
            <div className="flex items-center gap-2 mb-3">
              <Globe size={16} className="text-green-400" />
              <span className="text-sm font-semibold text-white">HTTP Status</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {stats.statusBreakdown.map((s, i) => (
                <div key={i} className={`text-xs px-2 py-1.5 rounded-lg flex justify-between items-center ${statusBg(s.status)}`}>
                  <span className="font-mono font-semibold">{s.status}</span>
                  <span className="font-medium">{s.cnt}</span>
                </div>
              ))}
              {stats.statusBreakdown.length === 0 && <div className="col-span-2 text-white/30 text-xs">Chưa có dữ liệu</div>}
            </div>
          </AnimBorderCard>

          <AnimBorderCard speed={7} color="rgba(249,115,22,0.7)" radius={18} style={{ padding: "1rem" }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-orange-400" />
              <span className="text-sm font-semibold text-white">IP gần đây</span>
            </div>
            <div className="space-y-1.5">
              {stats.recentIPs.slice(0, 5).map((ip, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="font-mono text-cyan-400/70 truncate">{ip.ip}</span>
                  <span className="text-white/30 ml-2 flex-shrink-0">{ip.cnt} req</span>
                </div>
              ))}
              {stats.recentIPs.length === 0 && <div className="text-white/30 text-xs">Chưa có dữ liệu</div>}
            </div>
          </AnimBorderCard>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Admin Page ──────────────────────────────── */
type Tab = "overview" | "access" | "errors" | "tools";

export function Admin() {
  const [adminKey, setAdminKey] = useState<string | null>(
    sessionStorage.getItem(ADMIN_KEY_STORAGE)
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [clearing, setClearing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadStats = useCallback(async (key: string) => {
    try {
      const r = await fetch(`${BASE}/api/admin/stats`, { headers: { "x-admin-key": key } });
      if (r.ok) setStats(await r.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (adminKey) loadStats(adminKey);
  }, [adminKey, loadStats]);

  useEffect(() => {
    if (!autoRefresh || !adminKey) return;
    const id = setInterval(() => loadStats(adminKey), 10000);
    return () => clearInterval(id);
  }, [autoRefresh, adminKey, loadStats]);

  function handleLogin(key: string) {
    setAdminKey(key);
  }

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    setAdminKey(null);
    setStats(null);
  }

  async function handleClear(type: "access" | "tool" | "all") {
    if (!adminKey) return;
    const label = type === "access" ? "access logs" : type === "tool" ? "tool logs" : "TẤT CẢ logs";
    if (!confirm(`Xoá ${label}? Hành động này không thể hoàn tác.`)) return;
    setClearing(true);
    try {
      await fetch(`${BASE}/api/admin/logs?type=${type}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
      await loadStats(adminKey);
    } finally {
      setClearing(false);
    }
  }

  if (!adminKey) return <LoginGate onLogin={handleLogin} />;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Tổng quan", icon: <TrendingUp size={20} /> },
    { id: "access", label: "Access Logs", icon: <Globe size={20} /> },
    { id: "errors", label: "Error Logs", icon: <AlertTriangle size={20} /> },
    { id: "tools", label: "Tool & AI", icon: <Bot size={20} /> },
  ];

  return (
    <div className="min-h-screen" style={{
      background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.10) 0%, #050505 60%)"
    }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/8"
        style={{ background: "rgba(5,5,5,0.94)", backdropFilter: "blur(20px)" }}>

        {/* Top bar: logo + title centered, logout right */}
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Spacer left */}
          <div className="w-10" />

          {/* Center: logo + title */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}>
              <Shield size={20} className="text-white" />
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-white leading-tight">Quản trị viên Nexora</div>
              <div className="text-[10px] text-white/30 font-mono">nexorax.cloud/admin</div>
            </div>
          </motion.div>

          {/* Right: logout only */}
          <button onClick={handleLogout}
            title="Đăng xuất"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-white/30 hover:text-red-400 border border-white/8 hover:border-red-500/30 transition-all"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            <LogOut size={16} />
          </button>
        </div>

        {/* Tabs — lớn, luôn hiện label */}
        <div className="max-w-7xl mx-auto px-3 pb-0 flex gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1.5 px-2 py-3 text-xs font-semibold transition-all border-b-2 ${
                tab === t.id
                  ? "text-white border-violet-500"
                  : "text-white/35 border-transparent hover:text-white/60 hover:border-white/20"
              }`}>
              <span className={`transition-transform ${tab === t.id ? "scale-110" : ""}`}>
                {t.icon}
              </span>
              <span className="leading-tight text-center">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}>

            {tab === "overview" && stats && <StatsPanel stats={stats} />}
            {tab === "overview" && !stats && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-white/30">
                <RefreshCw size={24} className="animate-spin" />
                <span className="text-sm">Đang tải thống kê...</span>
              </div>
            )}
            {tab === "access" && <AccessLogsPanel adminKey={adminKey} />}
            {tab === "errors" && <AccessLogsPanel adminKey={adminKey} onlyErrors />}
            {tab === "tools" && <ToolLogsPanel adminKey={adminKey} />}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-white/15 text-xs border-t border-white/5">
        Nexora Admin Panel — chỉ dành cho Phan Trọng Khang
      </div>
    </div>
  );
}
