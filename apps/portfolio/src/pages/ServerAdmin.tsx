import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, LogOut, RefreshCw, Search, Users, Lock, Unlock,
  AlertTriangle, Ban, Zap, MessageSquare, Activity,
  Download, Eye, EyeOff, Wifi, WifiOff, Power
} from "lucide-react";
import { Navigation } from "@/components/navigation";

const FONT = "'Plus Jakarta Sans', sans-serif";
const VIDEO_URL = "https://raw.githubusercontent.com/khang26042012/Nexora/main/apps/portfolio/public/hero-bg.mp4";
const TOKEN_KEY = "nexora_server_admin_token";
const TOKEN_EXP_KEY = "nexora_server_admin_token_exp";

interface Player {
  name: string;
  uuid: string;
  ip: string;
  ping: number;
  world: string;
  x: number; y: number; z: number;
  gameMode: string;
  health: number;
  food: number;
}

interface BanEntry {
  name: string;
  uuid: string;
  reason: string;
  bannedAt: number;
  expiresAt: number;
  by: string;
}

interface ActionLog {
  ts: number;
  admin: string;
  action: string;
  target: string;
  detail: string;
}

interface PluginInfo {
  version: string;
  jarName: string;
  downloadUrl: string;
  size: number;
  publishedAt: string;
}

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
};
const cardInner: React.CSSProperties = { padding: "20px" };
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  fontFamily: FONT,
};

function getStoredToken(): string | null {
  const tok = localStorage.getItem(TOKEN_KEY);
  const exp = localStorage.getItem(TOKEN_EXP_KEY);
  if (!tok || !exp) return null;
  if (Date.now() > Number(exp)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXP_KEY);
    return null;
  }
  return tok;
}

function storeToken(token: string, expiresAt: number) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXP_KEY, String(expiresAt));
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXP_KEY);
}

async function adminFetch(path: string, opts: RequestInit = {}): Promise<any> {
  const token = getStoredToken();
  if (!token) throw new Error("Chưa đăng nhập");
  const r = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": token,
      ...(opts.headers || {}),
    },
  });
  if (r.status === 401) {
    clearToken();
    throw new Error("Phiên hết hạn — đăng nhập lại");
  }
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await r.json() : await r.text();
  if (!r.ok) {
    const err = typeof data === "object" && data && data.error ? data.error : `HTTP ${r.status}`;
    throw new Error(err);
  }
  return data;
}

function formatDuration(ms: number): string {
  if (ms === -1) return "Vĩnh viễn";
  const days = Math.ceil(ms / 86400000);
  if (days >= 365) return Math.floor(days / 365) + " năm";
  if (days >= 30) return Math.floor(days / 30) + " tháng";
  return days + " ngày";
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString("vi-VN", { hour12: false });
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password) { setError("Nhập mật khẩu"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/server-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data && data.error ? data.error : "Đăng nhập thất bại");
        return;
      }
      storeToken(data.token, data.expiresAt);
      onLogin();
    } catch (err: any) {
      setError((err && err.message) || "Lỗi mạng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={glass}>
        <div style={cardInner} className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.3)" }}>
              <Shield size={24} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: FONT }}>Server Admin</h2>
              <p className="text-xs text-white/40">Cần mật khẩu để vào</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu" autoComplete="current-password" autoFocus
                className="w-full px-4 py-3 pr-12 rounded-xl text-white placeholder-white/30 outline-none transition-all"
                style={{ ...inputStyle, paddingRight: 48 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,80,80,0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")} />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)" }}>
                <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-300">{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: loading ? "rgba(255,80,80,0.5)" : "linear-gradient(135deg, #ff5050 0%, #ff8060 100%)", fontFamily: FONT }}>
              {loading ? "Đang kiểm tra..." : "Đăng nhập"}
            </button>
          </form>

          <p className="text-[10px] text-white/30 text-center mt-6">Mọi hành động sẽ được ghi log. Tự chịu trách nhiệm.</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function ServerAdmin() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [authed, setAuthed] = useState(!!getStoredToken());
  const [players, setPlayers] = useState<Player[]>([]);
  const [bans, setBans] = useState<BanEntry[]>([]);
  const [ipBans, setIpBans] = useState<string[]>([]);
  const [log, setLog] = useState<ActionLog[]>([]);
  const [pluginInfo, setPluginInfo] = useState<PluginInfo | null>(null);
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<"players" | "bans" | "log" | "plugin">("players");
  const [status, setStatus] = useState<"online" | "offline" | "loading">("loading");
  const [modal, setModal] = useState<{ action: string; player: Player | null } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = useCallback((msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const logout = useCallback(() => {
    adminFetch("/api/server-admin/logout", { method: "POST" }).catch(() => {});
    clearToken();
    setAuthed(false);
  }, []);

  const fetchAll = useCallback(async () => {
    setStatus("loading");
    try {
      const [p, b, l] = await Promise.all([
        adminFetch("/api/server-admin/plugin/players"),
        adminFetch("/api/server-admin/plugin/bans"),
        adminFetch("/api/server-admin/plugin/log"),
      ]);
      setPlayers(p.players || []);
      setBans(b.bans || []);
      setIpBans(b.ipBans || []);
      setLog(l.log || []);
      setStatus("online");
    } catch (err: any) {
      setStatus("offline");
      const msg = (err && err.message) || "Lỗi";
      if (msg.includes("Phiên hết hạn")) {
        setAuthed(false);
        clearToken();
      }
    }
  }, []);

  useEffect(() => { if (authed) fetchAll(); }, [authed, refreshKey, fetchAll]);

  useEffect(() => {
    if (!authed || !autoRefresh) return;
    const id = setInterval(() => setRefreshKey((k) => k + 1), 5000);
    return () => clearInterval(id);
  }, [authed, autoRefresh]);

  useEffect(() => {
    if (authed && tab === "plugin") {
      adminFetch("/api/server-admin/plugin/download").then(setPluginInfo).catch(() => setPluginInfo(null));
    }
  }, [authed, tab]);

  const executeAction = useCallback(async (action: string, player: Player | null, extra: any = {}) => {
    const payload: any = { admin: "admin", ...extra };
    if (player && (action === "ban" || action === "kick" || action === "clear-effects" || action === "whisper")) {
      payload.name = player.name;
    }
    if (player && action === "ban-ip") {
      payload.ip = player.ip;
    }
    try {
      await adminFetch(`/api/server-admin/plugin/${action}`, { method: "POST", body: JSON.stringify(payload) });
      showToast(`Đã ${action} ${(player && player.name) || "OK"}`, "ok");
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      showToast((err && err.message) || "Lỗi", "err");
    }
  }, [showToast]);

  const filtered = players.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ fontFamily: FONT }}>
      <div className="fixed inset-0" style={{ zIndex: -2 }}>
        <video ref={videoRef} loop muted playsInline preload="metadata" autoPlay
          className="w-full h-full object-cover" style={{ opacity: 0.45 }}>
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
      </div>

      <Navigation />

      <section className="relative min-h-screen flex flex-col items-center justify-start px-4 pt-28 pb-20">
        <div className="w-full max-w-6xl mx-auto">
          {!authed ? (
            <>
              <div className="mb-8 text-center">
                <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/30 mb-2">Restricted Area</p>
                <h1 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: FONT, fontWeight: 800 }}>
                  <span style={{ background: "linear-gradient(90deg, #ff5050, #ff8060)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Server Admin
                  </span>
                </h1>
                <p className="text-sm text-white/40 mt-2">Quản lý người chơi Minecraft từ xa</p>
              </div>
              <LoginPage onLogin={() => setAuthed(true)} />
            </>
          ) : (
            <Dashboard
              status={status} players={players} bans={bans} ipBans={ipBans} log={log} pluginInfo={pluginInfo}
              search={search} setSearch={setSearch}
              autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh}
              tab={tab} setTab={setTab}
              refresh={() => setRefreshKey((k) => k + 1)}
              onAction={(a: string, p: Player | null) => setModal({ action: a, player: p })}
              onLogout={logout}
              onUnban={(name: string) => executeAction("unban", { name } as any, {})}
              onUnbanIp={(ip: string) => executeAction("unban-ip", null, { ip })}
              filtered={filtered}
            />
          )}
        </div>
      </section>

      {modal && <ActionModal action={modal.action} player={modal.player} onClose={() => setModal(null)}
        onConfirm={(payload: any) => { executeAction(modal.action, modal.player, payload); setModal(null); }} />}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold text-white shadow-2xl"
            style={{ background: toast.type === "ok" ? "rgba(80,200,120,0.95)" : "rgba(255,80,80,0.95)", backdropFilter: "blur(8px)" }}>
            {toast.type === "ok" ? "OK " : "ERR "}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayerCard({ player, onAction }: { player: Player; onAction: (action: string, data?: any) => void }) {
  const healthColor = player.health > 15 ? "text-green-400" : player.health > 10 ? "text-yellow-400" : "text-red-400";
  const foodColor = player.food > 15 ? "text-green-400" : player.food > 10 ? "text-yellow-400" : "text-red-400";
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={glass}>
      <div style={cardInner}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(120,180,255,0.15)", border: "1px solid rgba(120,180,255,0.3)" }}>
              <Users size={18} className="text-blue-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: FONT }}>{player.name}</h3>
              <p className="text-[10px] text-white/40 font-mono">{player.uuid.slice(0, 18)}...</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-white/40">Ping</div>
            <div className="text-sm font-bold" style={{ color: player.ping < 100 ? "#4ade80" : player.ping < 300 ? "#facc15" : "#f87171" }}>{player.ping}ms</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="text-[9px] text-white/40">Health</div>
            <div className={"text-sm font-bold " + healthColor}>{Math.round(player.health)}/20</div>
          </div>
          <div className="text-center py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="text-[9px] text-white/40">Food</div>
            <div className={"text-sm font-bold " + foodColor}>{player.food}/20</div>
          </div>
          <div className="text-center py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="text-[9px] text-white/40">Mode</div>
            <div className="text-[10px] font-bold text-purple-300 truncate" title={player.gameMode}>{player.gameMode.slice(0, 6)}</div>
          </div>
        </div>

        <div className="text-[10px] text-white/40 mb-3 font-mono truncate">loc {player.world} {player.x},{player.y},{player.z}</div>
        <div className="text-[10px] text-white/30 mb-3 font-mono truncate" title={player.ip}>ip {player.ip || "?"}</div>

        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => onAction("kick", player)} className="px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1" style={{ background: "rgba(255,180,40,0.15)", border: "1px solid rgba(255,180,40,0.3)", color: "#fbbf24" }}>
            <Zap size={11} /> Kick
          </button>
          <button onClick={() => onAction("clear-effects", player)} className="px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1" style={{ background: "rgba(120,255,180,0.15)", border: "1px solid rgba(120,255,180,0.3)", color: "#86efac" }}>
            <Activity size={11} /> Clear FX
          </button>
          <button onClick={() => onAction("whisper", player)} className="px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1" style={{ background: "rgba(120,180,255,0.15)", border: "1px solid rgba(120,180,255,0.3)", color: "#93c5fd" }}>
            <MessageSquare size={11} /> Whisper
          </button>
          <button onClick={() => onAction("ban", player)} className="px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1" style={{ background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.3)", color: "#fca5a5" }}>
            <Ban size={11} /> Ban
          </button>
          <button onClick={() => onAction("ban-ip", player)} className="col-span-2 px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1" style={{ background: "rgba(180,80,255,0.15)", border: "1px solid rgba(180,80,255,0.3)", color: "#d8b4fe" }}>
            <Lock size={11} /> Ban IP {player.ip ? "(" + player.ip + ")" : ""}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-white/60 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, onConfirm, confirmText, danger, disabled, children }: any) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()} style={glass} className="w-full max-w-md">
          <div style={cardInner}>
            <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: FONT }}>{title}</h3>
            {children}
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-white/70" style={{ background: "rgba(255,255,255,0.06)" }}>Hủy</button>
              <button onClick={onConfirm} disabled={disabled} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: danger ? "linear-gradient(135deg, #ff5050 0%, #ff8060 100%)" : "linear-gradient(135deg, #50a0ff 0%, #80c0ff 100%)" }}>
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ActionModal({ action, player, onClose, onConfirm }: any) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [days, setDays] = useState("7");
  const [permanent, setPermanent] = useState(false);

  const title: any = { ban: "Cấm player", "ban-ip": "Cấm IP", kick: "Kick player", "clear-effects": "Gỡ hiệu ứng", whisper: "Gửi tin nhắn riêng" };
  const titleText = title[action] || action;

  if (action === "clear-effects") {
    return <Modal title={titleText} onClose={onClose} onConfirm={() => onConfirm({})} confirmText="Gỡ">
      <p className="text-sm text-white/70 mb-2">Gỡ mọi hiệu ứng potion + lửa cho <b>{player && player.name}</b>?</p>
    </Modal>;
  }

  if (action === "kick") {
    return <Modal title={titleText} onClose={onClose} onConfirm={() => onConfirm({ reason: reason || "Kicked by admin" })} confirmText="Kick" danger>
      <Field label="Lý do">
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="spam, hack, ..."
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none" style={inputStyle} />
      </Field>
    </Modal>;
  }

  if (action === "whisper") {
    return <Modal title={titleText} onClose={onClose} onConfirm={() => onConfirm({ message })} confirmText="Gửi" disabled={!message}>
      <Field label={"Tin nhắn gửi tới " + (player && player.name)}>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Nội dung..."
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none" style={inputStyle} />
      </Field>
    </Modal>;
  }

  return <Modal title={titleText} onClose={onClose} onConfirm={() => onConfirm({
    reason: reason || (action === "ban-ip" ? "IP banned" : "Banned by admin"),
    days: permanent ? -1 : (Number(days) || 1),
  })} confirmText="Cấm" danger>
    <Field label="Lý do">
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="hack, xúc phạm, ..."
        className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none" style={inputStyle} />
    </Field>
    <Field label="Thời hạn">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
          <input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)} className="w-4 h-4 rounded" />
          <span>Vĩnh viễn</span>
        </label>
        {!permanent && (
          <div className="flex items-center gap-2">
            <input type="number" value={days} onChange={(e) => setDays(e.target.value)} min="1" max="3650"
              className="w-20 px-2 py-1 rounded-lg text-sm text-white outline-none text-center" style={inputStyle} />
            <span className="text-xs text-white/50">ngày</span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-white/40 mt-1">-1 = vĩnh viễn · 1 = 1 ngày · 7 = 1 tuần · 30 = 1 tháng</p>
    </Field>
  </Modal>;
}

function Dashboard(props: any) {
  const { status, players, bans, ipBans, log, pluginInfo, search, setSearch, autoRefresh, setAutoRefresh, tab, setTab, refresh, onAction, onLogout, onUnban, onUnbanIp, filtered } = props;

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: FONT, fontWeight: 800 }}>
            <span style={{ background: "linear-gradient(90deg, #ff5050, #ff8060)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Server Admin
            </span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {status === "online" && <><Wifi size={12} className="text-green-400" /><span className="text-xs text-green-400">Plugin online · {players.length} player(s)</span></>}
            {status === "offline" && <><WifiOff size={12} className="text-red-400" /><span className="text-xs text-red-400">Plugin offline</span></>}
            {status === "loading" && <><RefreshCw size={12} className="text-yellow-400 animate-spin" /><span className="text-xs text-yellow-400">Đang tải…</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="px-3 py-2 rounded-lg text-sm font-semibold text-white/80 flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.06)" }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setAutoRefresh(!autoRefresh)} className="px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5"
            style={{ background: autoRefresh ? "rgba(80,200,120,0.15)" : "rgba(255,255,255,0.06)", color: autoRefresh ? "#86efac" : "rgba(255,255,255,0.7)", border: autoRefresh ? "1px solid rgba(80,200,120,0.3)" : "none" }}>
            <Power size={14} /> Auto 5s
          </button>
          <button onClick={onLogout} className="px-3 py-2 rounded-lg text-sm font-semibold text-red-300 flex items-center gap-1.5" style={{ background: "rgba(255,80,80,0.1)" }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-white/10 overflow-x-auto">
        {([["players", "Players", <Users size={14} key="u" />], ["bans", "Bans", <Ban size={14} key="b" />], ["log", "Log", <Activity size={14} key="l" />], ["plugin", "Plugin", <Download size={14} key="d" />]] as [string, string, React.ReactNode][]).map(([k, label, icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={"px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 transition-all relative whitespace-nowrap " + (tab === k ? "text-white" : "text-white/40 hover:text-white/70")}>
            {icon}{label}
            {tab === k && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "#ff5050" }} />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "players" && (
          <motion.div key="players" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="mb-4 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm player..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none" style={inputStyle} />
            </div>
            {status === "offline" ? (
              <div style={glass}><div style={cardInner} className="text-center py-12">
                <WifiOff size={48} className="mx-auto mb-3 text-white/20" />
                <p className="text-white/60 text-sm">Plugin chưa kết nối được</p>
                <p className="text-white/30 text-xs mt-1">Kiểm tra server Minecraft có bật và plugin rconkhang đã load</p>
              </div></div>
            ) : filtered.length === 0 ? (
              <div style={glass}><div style={cardInner} className="text-center py-12">
                <Users size={48} className="mx-auto mb-3 text-white/20" />
                <p className="text-white/60 text-sm">{search ? "Không tìm thấy player" : "Không có player online"}</p>
              </div></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map((p: Player) => <PlayerCard key={p.uuid} player={p} onAction={onAction} />)}
              </div>
            )}
          </motion.div>
        )}

        {tab === "bans" && (
          <motion.div key="bans" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div style={glass} className="mb-3"><div style={cardInner}>
              <h3 className="text-sm font-bold text-white mb-3" style={{ fontFamily: FONT }}>Banned players ({bans.length})</h3>
              {bans.length === 0 ? (
                <p className="text-xs text-white/40 text-center py-4">Chưa có ban nào</p>
              ) : (
                <div className="space-y-1.5">
                  {bans.map((b: BanEntry) => (
                    <div key={b.uuid} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div>
                        <div className="text-sm font-semibold text-white">{b.name}</div>
                        <div className="text-[10px] text-white/40">{b.reason || "Không có lý do"} · {b.by} · {formatTime(b.bannedAt)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/60">
                          {b.expiresAt === -1 ? <span className="text-red-400">Vĩnh viễn</span> : <span className="text-yellow-400">{formatDuration(b.expiresAt - Date.now())}</span>}
                        </span>
                        <button onClick={() => onUnban(b.name)} className="px-2 py-1 rounded text-[10px] font-semibold text-green-300" style={{ background: "rgba(80,200,120,0.15)" }}>
                          <Unlock size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div></div>
            <div style={glass}><div style={cardInner}>
              <h3 className="text-sm font-bold text-white mb-3" style={{ fontFamily: FONT }}>IP bans ({ipBans.length})</h3>
              {ipBans.length === 0 ? (
                <p className="text-xs text-white/40 text-center py-4">Chưa có IP ban nào</p>
              ) : (
                <div className="space-y-1.5">
                  {ipBans.map((ip: string) => (
                    <div key={ip} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <span className="text-sm font-mono text-white">{ip}</span>
                      <button onClick={() => onUnbanIp(ip)} className="px-2 py-1 rounded text-[10px] font-semibold text-green-300" style={{ background: "rgba(80,200,120,0.15)" }}>
                        <Unlock size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div></div>
          </motion.div>
        )}

        {tab === "log" && (
          <motion.div key="log" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div style={glass}><div style={cardInner}>
              <h3 className="text-sm font-bold text-white mb-3" style={{ fontFamily: FONT }}>Action log ({log.length})</h3>
              {log.length === 0 ? (
                <p className="text-xs text-white/40 text-center py-4">Chưa có action nào</p>
              ) : (
                <div className="space-y-1">
                  {log.map((entry: ActionLog, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 px-3 py-1.5 rounded text-[11px]" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <span className="text-white/40 font-mono w-32 flex-shrink-0">{formatTime(entry.ts)}</span>
                      <span className="font-semibold text-blue-300 w-20 flex-shrink-0">{entry.action}</span>
                      <span className="text-white">{entry.target}</span>
                      {entry.detail && <span className="text-white/40 truncate">— {entry.detail}</span>}
                      <span className="text-white/30 ml-auto text-[10px]">{entry.admin}</span>
                    </div>
                  ))}
                </div>
              )}
            </div></div>
          </motion.div>
        )}

        {tab === "plugin" && (
          <motion.div key="plugin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div style={glass}><div style={cardInner}>
              <h3 className="text-sm font-bold text-white mb-3" style={{ fontFamily: FONT }}>rconkhang plugin</h3>
              {pluginInfo ? (
                <div>
                  <div className="text-2xl font-bold text-white mb-1" style={{ fontFamily: FONT }}>v{pluginInfo.version}</div>
                  <div className="text-xs text-white/40 mb-4">Released {new Date(pluginInfo.publishedAt).toLocaleString("vi-VN")}</div>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-white/40">File:</span> <span className="text-white font-mono">{pluginInfo.jarName}</span></div>
                    <div><span className="text-white/40">Size:</span> <span className="text-white">{(pluginInfo.size / 1024).toFixed(1)} KB</span></div>
                  </div>
                  <a href={pluginInfo.downloadUrl} target="_blank" rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #50a0ff 0%, #80c0ff 100%)" }}>
                    <Download size={14} /> Tải .jar
                  </a>
                </div>
              ) : (
                <p className="text-xs text-white/40">Chưa có release. Xem README để build thủ công.</p>
              )}
              <div className="mt-5 pt-4 border-t border-white/10 text-xs text-white/50 space-y-1">
                <p>Cài đặt:</p>
                <p>1. Tải <code className="text-white/80">rconkhang-X.X.X.jar</code></p>
                <p>2. Copy vào <code className="text-white/80">plugins/</code> của Paper server</p>
                <p>3. Khởi động server, lấy API key: <code className="text-white/80">/rconkhang key</code></p>
                <p>4. Set env <code className="text-white/80">RCONKHANG_KEY</code> trên Railway</p>
              </div>
            </div></div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
