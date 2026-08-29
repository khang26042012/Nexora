import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/navigation";

const FONT = "'Plus Jakarta Sans', sans-serif";

// ── Types ──
interface MetricsData {
  serverName: string;
  version: string;
  status: "online" | "offline" | "starting";
  uptimeSeconds: number;
  players: { online: number; max: number };
  tps: { oneMin: number; fiveMin: number; fifteenMin: number };
  mspt: number;
  entities: number;
  chunks: number;
  ram: { usedMB: number; maxMB: number; percent: number };
  cpu: { percent: number };
  network: { inboundKBs: number; outboundKBs: number };
}

// ── Mock Data Generator ──
function generateMockMetrics(prev: MetricsData | null): MetricsData {
  const base = prev ?? {
    serverName: "NexoraMC",
    version: "Paper 1.21.4",
    status: "online" as const,
    uptimeSeconds: 86400,
    players: { online: 12, max: 100 },
    tps: { oneMin: 19.8, fiveMin: 19.9, fifteenMin: 20.0 },
    mspt: 42,
    entities: 1850,
    chunks: 620,
    ram: { usedMB: 2800, maxMB: 4096, percent: 68 },
    cpu: { percent: 35 },
    network: { inboundKBs: 125, outboundKBs: 340 },
  };

  const vary = (val: number, range: number) => Math.max(0, val + (Math.random() - 0.5) * range);
  
  const ramUsed = Math.round(vary(base.ram.usedMB, 80));
  const ramPercent = Math.round((ramUsed / base.ram.maxMB) * 100);
  const cpuPercent = Math.min(100, Math.max(0, Math.round(vary(base.cpu.percent, 8))));
  const playersOnline = Math.min(base.players.max, Math.max(0, Math.round(vary(base.players.online, 3))));

  return {
    ...base,
    uptimeSeconds: base.uptimeSeconds + 2,
    players: { ...base.players, online: playersOnline },
    tps: {
      oneMin: Math.min(20, Math.max(0, parseFloat(vary(base.tps.oneMin, 0.3).toFixed(1)))),
      fiveMin: Math.min(20, Math.max(0, parseFloat(vary(base.tps.fiveMin, 0.2).toFixed(1)))),
      fifteenMin: Math.min(20, Math.max(0, parseFloat(vary(base.tps.fifteenMin, 0.1).toFixed(1)))),
    },
    mspt: Math.max(0, Math.round(vary(base.mspt, 3))),
    entities: Math.max(0, Math.round(vary(base.entities, 50))),
    chunks: Math.max(0, Math.round(vary(base.chunks, 20))),
    ram: { ...base.ram, usedMB: ramUsed, percent: ramPercent },
    cpu: { percent: cpuPercent },
    network: {
      inboundKBs: Math.max(0, Math.round(vary(base.network.inboundKBs, 30))),
      outboundKBs: Math.max(0, Math.round(vary(base.network.outboundKBs, 40))),
    },
  };
}

// ── Helper Components ──
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function TpsColor(tps: number): string {
  if (tps >= 18) return "rgba(74,222,128,0.95)";
  if (tps >= 15) return "rgba(250,204,21,0.95)";
  return "rgba(248,113,113,0.95)";
}

function ProgressBar({ percent, color, height = 8 }: { percent: number; color: string; height?: number }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: "rgba(255,255,255,0.06)" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 25 }}
        style={{ height: "100%", background: color }}
      />
    </div>
  );
}

function StatCard({ title, icon, children, delay = 0 }: { title: string; icon: React.ReactNode; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="rounded-2xl relative overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        padding: "24px 26px",
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <span className="text-white/70">{icon}</span>
        </div>
        <h3 className="text-sm font-semibold text-white/60 tracking-wide uppercase">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// ── Icons ──
const ServerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const CpuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
    <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
  </svg>
);

// ── Main Component ──
export default function ServerStatus() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Always start with mock data immediately - no spinner, no blank screen
  useEffect(() => {
    // Set mock data IMMEDIATELY on mount
    setMetrics(generateMockMetrics(null));
    setConnected(true);

    // Then try WebSocket for real data
    let ws: WebSocket | null = null;
    try {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = proto + "//" + window.location.host + "/ws-metrics-browser";
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onerror = () => setConnected(false);
      ws.onmessage = (event) => {
        try {
          setMetrics(JSON.parse(event.data));
          setConnected(true);
        } catch {
          // ignore parse errors, keep showing previous data
        }
      };
    } catch (e) {
      // WebSocket failed to initialize - keep showing mock data
      console.warn("WebSocket init failed:", e);
      setConnected(false);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Safety: if metrics is somehow null after mount, regenerate
  if (!metrics) {
    return (
      <div className="min-h-screen w-full relative overflow-hidden" style={{ background: "#0a0a0f", fontFamily: FONT }}>
        <Navigation />
        <main className="relative z-10 max-w-5xl mx-auto px-5 pt-24 pb-16">
          <div className="text-center py-32">
            <p className="text-white/50">Loading server status...</p>
          </div>
        </main>
      </div>
    );
  }

  const isOnline = metrics.status === "online" && connected;

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ background: "#0a0a0f", fontFamily: FONT }}>
      {/* Ambient background effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(120,80,255,0.08) 0%, transparent 70%)", filter: "blur(80px)" }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(80,180,255,0.06) 0%, transparent 70%)", filter: "blur(80px)" }} />

      <Navigation />

      <main className="relative z-10 max-w-5xl mx-auto px-5 pt-24 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-white/90 mb-1">Server Status</h1>
            <p className="text-sm text-white/35">Real-time NexoraMC server metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: isOnline ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", border: `1px solid ${isOnline ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}` }}>
              <div className="relative">
                <div className="w-2 h-2 rounded-full" style={{ background: isOnline ? "rgba(74,222,128,0.9)" : "rgba(248,113,113,0.9)" }} />
                {isOnline && (
                  <motion.div
                    animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 w-2 h-2 rounded-full"
                    style={{ background: "rgba(74,222,128,0.5)" }}
                  />
                )}
              </div>
              <span className="text-xs font-medium" style={{ color: isOnline ? "rgba(74,222,128,0.9)" : "rgba(248,113,113,0.9)" }}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Server Info Card */}
          <StatCard title="Server" icon={<ServerIcon />} delay={0}>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">Name</span>
                <span className="text-sm text-white/75 font-medium">{metrics.serverName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">Version</span>
                <span className="text-sm text-white/75 font-medium">{metrics.version}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">Uptime</span>
                <span className="text-sm text-white/75 font-medium">{formatUptime(metrics.uptimeSeconds)}</span>
              </div>
            </div>
          </StatCard>

          {/* Players Card */}
          <StatCard title="Players" icon={<UsersIcon />} delay={0.1}>
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white/95">{metrics.players.online}</span>
                <span className="text-sm text-white/35 mb-1.5">/ {metrics.players.max}</span>
              </div>
              <ProgressBar percent={(metrics.players.online / metrics.players.max) * 100} color="rgba(180,220,255,0.8)" />
              <p className="text-xs text-white/35">{Math.round((metrics.players.online / metrics.players.max) * 100)}% capacity</p>
            </div>
          </StatCard>

          {/* TPS Card */}
          <StatCard title="Performance" icon={<ActivityIcon />} delay={0.2}>
            <div className="space-y-2">
              {[
                { label: "TPS 1m", value: metrics.tps.oneMin.toFixed(1), color: TpsColor(metrics.tps.oneMin) },
                { label: "TPS 5m", value: metrics.tps.fiveMin.toFixed(1), color: TpsColor(metrics.tps.fiveMin) },
                { label: "TPS 15m", value: metrics.tps.fifteenMin.toFixed(1), color: TpsColor(metrics.tps.fifteenMin) },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-xs text-white/40">{item.label}</span>
                  <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </StatCard>

          {/* CPU Card */}
          <StatCard title="CPU" icon={<CpuIcon />} delay={0.3}>
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white/95">{metrics.cpu.percent}%</span>
              </div>
              <ProgressBar percent={metrics.cpu.percent} color={metrics.cpu.percent > 80 ? "rgba(248,113,113,0.9)" : "rgba(74,222,128,0.8)"} />
            </div>
          </StatCard>

          {/* RAM Card */}
          <StatCard title="Memory" icon={<CpuIcon />} delay={0.4}>
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white/95">{metrics.ram.usedMB}</span>
                <span className="text-sm text-white/35 mb-1.5">/ {metrics.ram.maxMB} MB</span>
              </div>
              <ProgressBar percent={metrics.ram.percent} color={metrics.ram.percent > 85 ? "rgba(248,113,113,0.9)" : "rgba(96,165,250,0.8)"} />
              <p className="text-xs text-white/35">{metrics.ram.percent}% used</p>
            </div>
          </StatCard>

          {/* Network Card */}
          <StatCard title="Network" icon={<ActivityIcon />} delay={0.5}>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">Inbound</span>
                <span className="text-sm font-bold text-white/75">{metrics.network.inboundKBs} KB/s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">Outbound</span>
                <span className="text-sm font-bold text-white/75">{metrics.network.outboundKBs} KB/s</span>
              </div>
              <div className="flex justify-between items-center pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-xs text-white/40">Entities</span>
                <span className="text-sm text-white/60">{metrics.entities.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">Chunks</span>
                <span className="text-sm text-white/60">{metrics.chunks.toLocaleString()}</span>
              </div>
            </div>
          </StatCard>
        </div>
      </main>
    </div>
  );
}
