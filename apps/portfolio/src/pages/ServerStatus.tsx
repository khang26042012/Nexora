import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Activity, Cpu, HardDrive, MemoryStick, Wifi, Clock, Users, Zap, Server, RefreshCw } from "lucide-react";
import { Navigation } from "@/components/navigation";

const FONT = "'Plus Jakarta Sans', sans-serif";

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
};

function AnimBorderCard({
  children,
  className = "",
  speed = 4,
  color = "rgba(255,255,255,0.85)",
  radius = 20,
  innerStyle = {},
  animate = true,
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  color?: string;
  radius?: number;
  innerStyle?: React.CSSProperties;
  animate?: boolean;
}) {
  return (
    <div
      className={`running-border ${!animate ? "animation-paused" : ""} ${className}`}
      style={{
        "--rb-speed": `${speed}s`,
        "--rb-color": color,
        "--rb-radius": `${radius}px`,
        background: "rgba(255,255,255,0.04)",
        ...innerStyle,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

function StatRow({ icon: Icon, label, value, sub, delay }: { icon: any; label: string; value: string; sub?: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center gap-3 py-2.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <Icon size={16} style={{ color: "rgba(255,255,255,0.6)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30">{label}</p>
        <p className="text-sm font-medium text-white/75 truncate">{value}</p>
        {sub && <p className="text-[10px] text-white/30 truncate">{sub}</p>}
      </div>
    </motion.div>
  );
}

export function ServerStatus() {
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("--:--:--");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number>(0);

  useEffect(() => {
    const connect = () => {
      const wsUrl = import.meta.env.VITE_WS_SERVER_STATS_URL || "wss://discord-ai-bot-production-d077.up.railway.app/ws/server-stats";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setStats(data);
          setLastUpdate(new Date().toLocaleTimeString("vi-VN"));
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer.current = window.setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        setConnected(false);
      };
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  const fmtMb = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
  const pct = (used: number, total: number) => total > 0 ? Math.round((used / total) * 100) : 0;

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ fontFamily: FONT, background: "rgba(0,0,0,0.0)" }}>
      {/* Video BG */}
      <div className="fixed inset-0" style={{ zIndex: -2 }}>
        <video
          loop muted playsInline preload="metadata" autoPlay
          className="w-full h-full object-cover"
          style={{ opacity: 0.38, backgroundColor: "#000010" }}
        >
          <source src="https://raw.githubusercontent.com/khang26042012/Nexora/main/apps/portfolio/public/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)" }} />
      </div>

      <Navigation />

      <section className="relative min-h-screen flex flex-col items-center justify-start px-5 pt-28 pb-20">
        <div className="w-full max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10"
          >
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/30 mb-2">Real-time</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: FONT, fontWeight: 800 }}>Server Status</h2>
            <div className="mt-3 h-px rounded-full" style={{ width: 40, background: "linear-gradient(to right, rgba(255,255,255,0.4), transparent)" }} />
          </motion.div>

          {/* Connection status badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.16em] uppercase mb-8"
            style={{
              color: connected ? "rgba(52,211,153,0.9)" : "rgba(251,191,36,0.9)",
              background: connected ? "rgba(52,211,153,0.08)" : "rgba(251,191,36,0.08)",
              border: `1px solid ${connected ? "rgba(52,211,153,0.2)" : "rgba(251,191,36,0.2)"}`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: connected ? "#34d399" : "#fbbf24" }} />
            {connected ? "Connected" : "Reconnecting..."}
          </motion.div>

          {!stats ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center py-20"
            >
              <div style={{ ...glass, borderRadius: 20, padding: "48px 24px" }}>
                <RefreshCw size={32} className="mx-auto mb-4 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
                <p className="text-white/40 text-sm">Đang chờ dữ liệu từ server Minecraft...</p>
                <p className="text-white/20 text-xs mt-2">Đảm bảo plugin StartSeachKhangg đã được cài đặt</p>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Main Stats Card */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <AnimBorderCard speed={6} color="rgba(255,255,255,0.45)" radius={20} innerStyle={{ padding: "24px" }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                      <Server size={20} style={{ color: "rgba(255,255,255,0.7)" }} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white/90" style={{ fontFamily: FONT }}>{stats.server_name || "Minecraft Server"}</h3>
                      <p className="text-xs text-white/35">MC {stats.minecraft_version || "?"} · {stats.hostname || "unknown"}</p>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <StatRow icon={Users} label="Players" value={stats.player_slots_formatted || "?/?"} delay={0.1} />
                    <StatRow icon={Zap} label="TPS" value={`${stats.tps ?? "?"}/20`} delay={0.15} />
                    <StatRow icon={Clock} label="Uptime" value={stats.uptime_formatted || "N/A"} delay={0.2} />
                    <StatRow icon={Activity} label="Last Update" value={lastUpdate} delay={0.25} />
                  </div>
                </AnimBorderCard>
              </motion.div>

              {/* Resource Stats Card */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <AnimBorderCard speed={7} color="rgba(255,255,255,0.4)" radius={20} innerStyle={{ padding: "24px" }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                      <Cpu size={20} style={{ color: "rgba(255,255,255,0.7)" }} />
                    </div>
                    <h3 className="text-base font-bold text-white/90" style={{ fontFamily: FONT }}>Resources</h3>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* RAM */}
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <div className="flex items-center gap-2">
                          <MemoryStick size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
                          <span className="text-[11px] font-semibold tracking-widest uppercase text-white/30">System RAM</span>
                        </div>
                        <span className="text-xs text-white/60 font-medium">
                          {fmtMb(stats.system_ram_used_mb || 0)} / {fmtMb(stats.system_ram_total_mb || 0)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct(stats.system_ram_used_mb || 0, stats.system_ram_total_mb || 1)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: "linear-gradient(90deg, rgba(139,92,246,0.7), rgba(59,130,246,0.7))" }}
                        />
                      </div>
                      <p className="text-[10px] text-white/25 mt-1">{stats.system_ram_usage_percent || 0}% used</p>
                    </div>

                    {/* JVM Heap */}
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <div className="flex items-center gap-2">
                          <MemoryStick size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
                          <span className="text-[11px] font-semibold tracking-widest uppercase text-white/30">JVM Heap</span>
                        </div>
                        <span className="text-xs text-white/60 font-medium">
                          {fmtMb(stats.jvm_heap_used_mb || 0)} / {fmtMb(stats.jvm_heap_max_mb || 0)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct(stats.jvm_heap_used_mb || 0, stats.jvm_heap_max_mb || 1)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: "linear-gradient(90deg, rgba(52,211,153,0.7), rgba(56,189,248,0.7))" }}
                        />
                      </div>
                    </div>

                    {/* CPU */}
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <div className="flex items-center gap-2">
                          <Cpu size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
                          <span className="text-[11px] font-semibold tracking-widest uppercase text-white/30">CPU Load</span>
                        </div>
                        <span className="text-xs text-white/60 font-medium">{stats.cpu_load_percent || 0}% ({stats.cpu_cores || "?"} cores)</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.cpu_load_percent || 0}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: "linear-gradient(90deg, rgba(251,191,36,0.7), rgba(249,115,22,0.7))" }}
                        />
                      </div>
                    </div>

                    {/* Disk */}
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <div className="flex items-center gap-2">
                          <HardDrive size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
                          <span className="text-[11px] font-semibold tracking-widest uppercase text-white/30">Disk</span>
                        </div>
                        <span className="text-xs text-white/60 font-medium">
                          {(stats.disk_used_gb || 0).toFixed(1)} / {(stats.disk_total_gb || 0).toFixed(1)} GB
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct(stats.disk_used_gb || 0, stats.disk_total_gb || 1)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: "linear-gradient(90deg, rgba(232,121,249,0.7), rgba(168,85,247,0.7))" }}
                        />
                      </div>
                    </div>
                  </div>
                </AnimBorderCard>
              </motion.div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

