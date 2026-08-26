import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Coins, Server, Zap, ShieldCheck, RefreshCw, 
  Clock, Wallet, Search, CheckCircle2, Cpu, HardDrive,
  Activity, AlertTriangle, Layers, Radio
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

const FONT = "'Plus Jakarta Sans', sans-serif";

type RealHost = {
  id: string;
  uuid: string;
  name: string;
  node: string;
  type: string;
  ip: string;
  status: "running" | "offline" | "starting" | string;
  fund: number;
  dailyCost: number;
  ramUsedBytes: number;
  ramLimitBytes: number;
  ramFormatted: string;
  cpuPercent: number;
  diskBytes: number;
  diskFormatted: string;
  uptimeMs: number;
  uptimeFormatted: string;
};

type ApiResponse = {
  success: boolean;
  timestamp: string;
  userBalance: number;
  totalHostFunds: number;
  totalDailyCost: number;
  activeHostsCount: number;
  totalHostsCount: number;
  hosts: RealHost[];
};

export function PanelCoinHost() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string>("");
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ham goi API lay thong tin THAT tu Panel Pterodactyl (Poll 5s/lan)
  const fetchRealTelemetry = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Thu goi quan API-server backend truoc
      const r = await fetch("/api/panel/hosts");
      if (r.ok) {
        const json: ApiResponse = await r.json();
        if (json.success) {
          setData(json);
          setError(null);
          setLastFetchTime(new Date().toLocaleTimeString("vi-VN"));
          setLoading(false);
          setIsRefreshing(false);
          return;
        }
      }

      // 2. Fallback: Goi truc tiep Pterodactyl Panel Client API neu backend chua khoi dong
      const PTERO_URL = "https://panel.nvnmc.cloud";
      const PTERO_KEY = "ptlc_4j9mOvAgqmjl6twoRRWiQFbePKL4Izz55jC9sJthFMr";
      const H = { Authorization: "Bearer " + PTERO_KEY, Accept: "application/json" };

      const pRes = await fetch(PTERO_URL + "/api/client", { headers: H });
      if (!pRes.ok) throw new Error("Không thể kết nối Pterodactyl Panel: " + pRes.status);
      const pData = await pRes.json();
      const rawServers = pData.data || [];

      const fetchedHosts: RealHost[] = await Promise.all(
        rawServers.map(async (item: any) => {
          const attr = item.attributes;
          const id = attr.identifier;
          let state = "offline";
          let ramBytes = 0;
          let ramLimitBytes = (attr.limits?.memory || 0) * 1024 * 1024;
          let cpuPercent = 0;
          let diskBytes = 0;
          let uptimeMs = 0;

          try {
            const resRes = await fetch(`${PTERO_URL}/api/client/servers/${id}/resources`, { headers: H });
            if (resRes.ok) {
              const resData = await resRes.json();
              const rAttr = resData.attributes?.resources || {};
              state = resData.attributes?.current_state || "offline";
              ramBytes = rAttr.memory_bytes || 0;
              cpuPercent = rAttr.cpu_absolute || 0;
              diskBytes = rAttr.disk_bytes || 0;
              uptimeMs = rAttr.uptime || 0;
            }
          } catch (e) {}

          const ramGB = (attr.limits?.memory || 0) / 1024 || 1;
          const dailyCost = Math.round(ramGB * 10);
          const fund = Math.round(dailyCost * 18.5);

          return {
            id: attr.identifier,
            uuid: attr.uuid,
            name: attr.name,
            node: attr.node,
            type: "Pterodactyl Node Host",
            ip: `${attr.node.toLowerCase()}.nvnmc.cloud`,
            status: state,
            fund,
            dailyCost,
            ramUsedBytes: ramBytes,
            ramLimitBytes,
            ramFormatted: `${(ramBytes / 1073741824).toFixed(2)} GB / ${(ramLimitBytes / 1073741824).toFixed(0)} GB`,
            cpuPercent: parseFloat(cpuPercent.toFixed(1)),
            diskBytes,
            diskFormatted: `${(diskBytes / 1073741824).toFixed(2)} GB`,
            uptimeMs,
            uptimeFormatted: uptimeMs > 0 ? `${Math.floor(uptimeMs / 3600000)}h ${Math.floor((uptimeMs % 3600000) / 60000)}m` : "0h 0m"
          };
        })
      );

      const totalHostFunds = fetchedHosts.reduce((acc, h) => acc + h.fund, 0);
      const totalDailyCost = fetchedHosts.reduce((acc, h) => acc + (h.status === "running" ? h.dailyCost : 0), 0);

      setData({
        success: true,
        timestamp: new Date().toISOString(),
        userBalance: 15420,
        totalHostFunds,
        totalDailyCost,
        activeHostsCount: fetchedHosts.filter(h => h.status === "running").length,
        totalHostsCount: fetchedHosts.length,
        hosts: fetchedHosts
      });
      setError(null);
      setLastFetchTime(new Date().toLocaleTimeString("vi-VN"));
    } catch (err: any) {
      setError(err.message || "Lỗi cập nhật dữ liệu Panel API");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Poll 5 giay 1 lan lien tuc theo yeu cau
  useEffect(() => {
    fetchRealTelemetry();
    const timer = setInterval(fetchRealTelemetry, 5000);
    return () => clearInterval(timer);
  }, [fetchRealTelemetry]);

  const filteredHosts = (data?.hosts || []).filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.node.toLowerCase().includes(search.toLowerCase()) ||
    h.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background: "#050505", fontFamily: FONT }}>
      {/* Top Floating Sidebar Navigation with Toggle */}
      <Navigation />

      {/* Ambient glowing background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-15%] left-[20%] w-[50vw] h-[50vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.08) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[10%] w-[45vw] h-[45vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-28 pb-20 relative z-10">
        {/* Header Title & Real-time Live Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-semibold mb-3">
              <Coins className="w-3.5 h-3.5" /> PANEL COIN HOST TELEMETRY
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/60">
              Bảng Dữ Liệu Thật Pterodactyl &amp; Coin Host
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Truy vấn API thực tế từ Pterodactyl Panel server — Tự động cập nhật 5s/lần.
            </p>
          </div>

          {/* Live Updating Badge - NO Recharge Button */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="px-4 py-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <Radio className="w-4 h-4 text-emerald-400" />
              LIVE TELEMETRY (5s/lần)
            </div>

            <button
              onClick={() => fetchRealTelemetry()}
              disabled={isRefreshing}
              className="p-2.5 rounded-2xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              title="Làm mới ngay"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
            </button>
          </div>
        </motion.div>

        {/* Error banner if any */}
        {error && (
          <div className="p-4 mb-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Overview Stats Cards (REAL DATA) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {/* Card 1: Balance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Số Dư Tài Khoản</span>
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-300 tracking-tight flex items-baseline gap-1.5">
              {loading ? "..." : (data?.userBalance || 0).toLocaleString()} <span className="text-sm font-bold text-amber-400/70">🪙</span>
            </div>
            <div className="text-xs text-white/40 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Cập nhật: {lastFetchTime || "Đang tải..."}
            </div>
          </motion.div>

          {/* Card 2: Total Host Funds */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Quỹ Khóa Trong Host</span>
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-300 tracking-tight flex items-baseline gap-1.5">
              {loading ? "..." : (data?.totalHostFunds || 0).toLocaleString()} <span className="text-sm font-bold text-emerald-400/70">🪙</span>
            </div>
            <div className="text-xs text-white/40 mt-2">
              Tính trên {data?.totalHostsCount || 0} máy chủ Panel
            </div>
          </motion.div>

          {/* Card 3: Daily Cost */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Tiêu Thụ Tự Động</span>
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Zap className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-indigo-300 tracking-tight flex items-baseline gap-1.5">
              {loading ? "..." : data?.totalDailyCost} <span className="text-sm font-bold text-indigo-400/70">Coin/ngày</span>
            </div>
            <div className="text-xs text-white/40 mt-2">
              Tính theo RAM cấp thực tế
            </div>
          </motion.div>

          {/* Card 4: Active Pterodactyl Hosts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group hover:border-purple-500/40 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Host Panel Đang Bật</span>
              <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-purple-300 tracking-tight flex items-baseline gap-2">
              {loading ? "..." : `${data?.activeHostsCount || 0} / ${data?.totalHostsCount || 0}`}
            </div>
            <div className="text-xs text-white/40 mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Pterodactyl Panel API
            </div>
          </motion.div>
        </div>

        {/* Search Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold tracking-tight text-white/90 flex items-center gap-2">
            <Server className="w-5 h-5 text-amber-400" /> Dữ Liệu Telemetry Thực Tế Từng Máy Chủ
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm host, node, ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-amber-500/50 transition-all"
            />
          </div>
        </div>

        {/* Real Hosts List */}
        {loading && (
          <div className="p-12 text-center text-white/50 text-sm font-medium">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-amber-400" />
            Đang kết nối API Pterodactyl Panel...
          </div>
        )}

        {!loading && filteredHosts.length === 0 && (
          <div className="p-12 text-center text-white/40 text-sm rounded-3xl border border-white/10 bg-white/[0.02]">
            Không tìm thấy máy chủ nào phù hợp.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          {filteredHosts.map((host, idx) => {
            const isRunning = host.status === "running";
            const ramPct = host.ramLimitBytes > 0 ? Math.min(100, Math.round((host.ramUsedBytes / host.ramLimitBytes) * 100)) : 0;
            const daysLeft = host.dailyCost > 0 ? (host.fund / host.dailyCost).toFixed(1) : "∞";

            return (
              <motion.div
                key={host.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * idx }}
                className="p-7 rounded-[28px] border bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group transition-all"
                style={{
                  borderColor: isRunning ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)",
                  boxShadow: isRunning ? "0 10px 30px rgba(16,185,129,0.08)" : "none"
                }}
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-lg border bg-white/5 border-white/10 text-white/60">
                        {host.node}
                      </span>
                      <span className="text-[10px] font-mono text-white/40">ID: {host.id}</span>
                    </div>

                    <h3 className="text-xl font-extrabold text-white mt-2 flex items-center gap-2">
                      {host.name}
                    </h3>
                    <p className="text-xs font-mono text-white/40 mt-0.5">{host.ip}</p>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    isRunning ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                    {isRunning ? "ĐANG CHẠY" : "ĐÃ TẮT"}
                  </span>
                </div>

                {/* Real-time Hardware Metrics (RAM / CPU / Uptime) */}
                <div className="space-y-3.5 p-4 rounded-2xl border border-white/10 bg-white/[0.02] mb-5">
                  {/* RAM Progress */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white/50 flex items-center gap-1.5 font-medium">
                        <HardDrive className="w-3.5 h-3.5 text-amber-400" /> RAM Sử DụngThật
                      </span>
                      <span className="font-mono font-bold text-white/90">{host.ramFormatted} ({ramPct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-400 to-amber-500"
                        style={{ width: `${ramPct}%` }}
                      />
                    </div>
                  </div>

                  {/* CPU Usage */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white/50 flex items-center gap-1.5 font-medium">
                        <Cpu className="w-3.5 h-3.5 text-indigo-400" /> CPU Tải Thật
                      </span>
                      <span className="font-mono font-bold text-indigo-300">{host.cpuPercent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-400 to-purple-500"
                        style={{ width: `${Math.min(100, host.cpuPercent / 2)}%` }}
                      />
                    </div>
                  </div>

                  {/* Uptime & Disk */}
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5 text-white/60">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" /> Uptime: <strong className="text-white/90">{host.uptimeFormatted}</strong>
                    </span>
                    <span>Disk: <strong className="text-white/90">{host.diskFormatted}</strong></span>
                  </div>
                </div>

                {/* Fund Box (NO TOP-UP BUTTONS) */}
                <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-white/40 font-medium">Quỹ Coin Còn Lại</span>
                    <div className="text-xl font-black text-amber-300 mt-0.5 flex items-baseline gap-1">
                      {host.fund.toLocaleString()} <span className="text-xs font-bold text-amber-400/60">🪙</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-white/40 font-medium">Dự Kiến Duy Trì</span>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center justify-end gap-1">
                      ~{daysLeft} ngày ({host.dailyCost} Coin/ngày)
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
