import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/navigation";
import { Server, Users, Cpu, HardDrive, Activity, Wifi, Clock, AlertTriangle } from "lucide-react";

const FONT = "'Plus Jakarta Sans', sans-serif";

// ── Glassmorphism style (synced with Home page cards) ──
const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 20,
  boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
};

// ═══════════════════════════════════════════════════════════
// 🔧 CONFIG: Set to false when plugin WebSocket is ready
const USE_MOCK_DATA = false;
// WebSocket endpoint computed at runtime inside useEffect (avoids SSR/top-level window access)
const MOCK_INTERVAL_MS = 1000;
// ═══════════════════════════════════════════════════════════

type MetricsData = {
  status: "online" | "offline";
  serverName: string;
  version: string;
  uptimeSeconds: number;
  players: { online: number; max: number };
  ram: { usedMB: number; maxMB: number; freeMB: number; percent: number };
  cpu: { percent: number };
  disk: { usedGB: number; totalGB: number; percent: number };
  tps: { oneMin: number; fiveMin: number; fifteenMin: number };
  mspt: number;
  entities: number;
  chunks: number;
  network: { inboundKBs: number; outboundKBs: number };
  timestamp: number;
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function getColor(percent: number): string {
  if (percent < 60) return "rgba(74,222,128,0.9)";
  if (percent < 85) return "rgba(250,204,21,0.9)";
  return "rgba(248,113,113,0.9)";
}

function getGradient(percent: number): string {
  if (percent < 60) return "linear-gradient(90deg, rgba(74,222,128,0.9), rgba(52,211,153,0.7))";
  if (percent < 85) return "linear-gradient(90deg, rgba(250,204,21,0.9), rgba(251,191,36,0.7))";
  return "linear-gradient(90deg, rgba(248,113,113,0.9), rgba(239,68,68,0.7))";
}

function getTpsColor(tps: number): string {
  if (tps >= 19) return "rgba(74,222,128,0.95)";
  if (tps >= 16) return "rgba(250,204,21,0.95)";
  return "rgba(248,113,113,0.95)";
}

// ── Mock Data Generator ──
function generateMockMetrics(prev: MetricsData | null): MetricsData {
  const base = prev || {
    status: "online" as const,
    serverName: "NexoraMC",
    version: "Paper 1.21.4",
    ram: { usedMB: 2800, maxMB: 4096, freeMB: 1296, percent: 68 },
    cpu: { percent: 35 },
    disk: { usedGB: 45, totalGB: 100, percent: 45 },
    players: { online: 12, max: 100 },
    tps: { oneMin: 19.8, fiveMin: 19.9, fifteenMin: 20.0 },
    mspt: 42,
    entities: 1850,
    chunks: 620,
    network: { inboundKBs: 125, outboundKBs: 340 },
    uptimeSeconds: 3600 * 5 + 1200,
    timestamp: Date.now(),
  };

  const jitter = (v: number, range: number) => Math.max(0, v + (Math.random() - 0.5) * range);
  const ramUsed = Math.round(jitter(base.ram.usedMB, 80));
  const ramMax = base.ram.maxMB;
  const ramPercent = Math.round((ramUsed / ramMax) * 100);
  const cpuPercent = Math.min(100, Math.max(0, Math.round(jitter(base.cpu.percent, 8))));
  const tps1 = Math.min(20, Math.max(14, parseFloat(jitter(base.tps.oneMin, 0.6).toFixed(1))));
  const mspt = Math.round(jitter(base.mspt, 8));
  const players = Math.max(0, Math.min(base.players.max, Math.round(jitter(base.players.online, 3))));

  return {
    status: "online",
    serverName: "NexoraMC",
    version: "Paper 1.21.4",
    uptimeSeconds: (prev?.uptimeSeconds || 18000) + 1,
    players: { online: players, max: base.players.max },
    ram: { usedMB: ramUsed, maxMB: ramMax, freeMB: ramMax - ramUsed, percent: ramPercent },
    cpu: { percent: cpuPercent },
    disk: { usedGB: 42.3, totalGB: 100, percent: 42 },
    tps: {
      oneMin: tps1,
      fiveMin: parseFloat(jitter(base.tps.fiveMin, 0.3).toFixed(1)),
      fifteenMin: parseFloat(jitter(base.tps.fifteenMin, 0.1).toFixed(1)),
    },
    mspt,
    entities: Math.round(jitter(base.entities, 50)),
    chunks: Math.round(jitter(base.chunks, 20)),
    network: {
      inboundKBs: Math.round(jitter(base.network.inboundKBs, 40)),
      outboundKBs: Math.round(jitter(base.network.outboundKBs, 60)),
    },
    timestamp: Date.now(),
  };
}

// ── Progress Bar Component (gradient + rounded) ──
function ProgressBar({ percent, color, height = 8 }: { percent: number; color: string; height?: number }) {
  const gradient = getGradient(percent);
  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: height / 2,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}
    >
      <motion.div
        animate={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        transition={{ type: "spring", stiffness: 100, damping: 25 }}
        style={{
          height: "100%",
          borderRadius: height / 2,
          background: gradient,
          boxShadow: `0 0 12px ${color.replace("0.9", "0.4")}`,
        }}
      />
    </div>
  );
}

// ── Metric Card Wrapper (synced with Home glassmorphism) ──
function MetricCard({
  title,
  icon: Icon,
  children,
  delay = 0,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      style={{ ...glass, padding: "24px 26px" }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <Icon className="w-4 h-4 text-white/50" />
        </div>
        <span
          className="text-xs font-semibold tracking-widest uppercase text-white/40"
          style={{ fontFamily: FONT }}
        >
          {title}
        </span>
      </div>
      {children}
    </motion.div>
  );
}

export default function ServerStatus() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (USE_MOCK_DATA) {
      setConnected(true);
      setMetrics(generateMockMetrics(null));
      mockTimerRef.current = setInterval(() => {
        setMetrics((prev) => generateMockMetrics(prev));
      }, MOCK_INTERVAL_MS);
      return () => {
        if (mockTimerRef.current) clearInterval(mockTimerRef.current);
      };
    } else {
      try {
        const WS_ENDPOINT = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws-metrics-browser`;
        const ws = new WebSocket(WS_ENDPOINT);
        wsRef.current = ws;
        ws.onopen = () => setConnected(true);
        ws.onclose = () => {
          setConnected(false);
          setMetrics((prev) => (prev ? { ...prev, status: "offline" } : null));
        };
        ws.onerror = () => setConnected(false);
        ws.onmessage = (event) => {
          try {
            setMetrics(JSON.parse(event.data));
            setConnected(true);
          } catch {}
        };
        return () => ws.close();
      } catch {
        setConnected(false);
      }
    }
  }, []);

  const isOnline = metrics?.status === "online" && connected;

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ background: "#0a0a0f", fontFamily: FONT }}>
      {/* ── Ambient background effects (synced with Home) ── */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(120,80,255,0.08) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(74,222,128,0.05) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(100,60,200,0.04) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <Navigation />

      <main className="relative z-10 max-w-5xl mx-auto px-5 pt-24 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-bold text-white/90 mb-2">Server Status</h1>
          <p className="text-sm text-white/35">Real-time monitoring • NexoraMC Infrastructure</p>
        </motion.div>

        {!metrics ? (
          <div className="flex items-center justify-center py-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/50"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: Overview */}
            <MetricCard title="Trạng thái" icon={Server} delay={0}>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{
                      background: isOnline ? "rgba(74,222,128,0.95)" : "rgba(248,113,113,0.95)",
                      boxShadow: isOnline
                        ? "0 0 12px rgba(74,222,128,0.6)"
                        : "0 0 12px rgba(248,113,113,0.6)",
                    }}
                  />
                  {isOnline && (
                    <motion.div
                      animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
                      className="absolute inset-0 w-3.5 h-3.5 rounded-full bg-green-400"
                    />
                  )}
                </div>
                <span
                  className="text-xl font-bold tracking-wide"
                  style={{
                    color: isOnline ? "rgba(74,222,128,0.95)" : "rgba(248,113,113,0.95)",
                    textShadow: isOnline
                      ? "0 0 20px rgba(74,222,128,0.3)"
                      : "0 0 20px rgba(248,113,113,0.3)",
                  }}
                >
                  {isOnline ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/35">Server</span>
                  <span className="text-white/75 font-medium">{metrics.serverName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/35">Version</span>
                  <span className="text-white/75 font-medium">{metrics.version}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-white/35">Uptime</span>
                  <span className="text-white/75 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-white/40" />
                    {formatUptime(metrics.uptimeSeconds)}
                  </span>
                </div>
              </div>
            </MetricCard>

            {/* Card 2: Players */}
            <MetricCard title="Người chơi" icon={Users} delay={0.05}>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-4xl font-bold text-white/95">{metrics.players.online}</span>
                <span className="text-sm text-white/35 mb-1.5">/ {metrics.players.max}</span>
              </div>
              <ProgressBar percent={(metrics.players.online / metrics.players.max) * 100} color="rgba(180,220,255,0.8)" />
              <p className="text-[11px] text-white/30 mt-3 font-medium">
                {Math.round((metrics.players.online / metrics.players.max) * 100)}% capacity
              </p>
            </MetricCard>

            {/* Card 3: Performance */}
            <MetricCard title="Hiệu năng" icon={Activity} delay={0.1}>
              <div className="grid grid-cols-3 gap-1 mb-4">
                {[
                  { label: "TPS 1m", value: metrics.tps.oneMin.toFixed(1), color: getTpsColor(metrics.tps.oneMin) },
                  { label: "TPS 5m", value: metrics.tps.fiveMin.toFixed(1), color: getTpsColor(metrics.tps.fiveMin) },
                  { label: "TPS 15m", value: metrics.tps.fifteenMin.toFixed(1), color: getTpsColor(metrics.tps.fifteenMin) },
                ].map((t, i) => (
                  <div
                    key={t.label}
                    className="text-center py-2.5 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    }}
                  >
                    <div className="text-lg font-bold" style={{ color: t.color }}>
                      {t.value}
                    </div>
                    <div className="text-[10px] text-white/30 font-medium">{t.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/35">MSPT</span>
                  <span className="text-white/75 font-medium">{metrics.mspt}ms</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/35">Entities</span>
                  <span className="text-white/75 font-medium">{metrics.entities.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-white/35">Chunks</span>
                  <span className="text-white/75 font-medium">{metrics.chunks.toLocaleString()}</span>
                </div>
              </div>
            </MetricCard>

            {/* Card 4: RAM */}
            <MetricCard title="Bộ nhớ RAM" icon={Cpu} delay={0.15}>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-bold text-white/95">{metrics.ram.usedMB}</span>
                <span className="text-sm text-white/35 mb-1">/ {metrics.ram.maxMB} MB</span>
              </div>
              <ProgressBar percent={metrics.ram.percent} color={getColor(metrics.ram.percent)} />
              <div className="flex justify-between mt-3 text-xs text-white/35 font-medium">
                <span>Free: {metrics.ram.freeMB} MB</span>
                <span>{metrics.ram.percent}%</span>
              </div>
            </MetricCard>

            {/* Card 5: CPU & Disk */}
            <MetricCard title="CPU & Disk" icon={HardDrive} delay={0.2}>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/40 font-medium">CPU</span>
                    <span className="text-white/75 font-bold">{metrics.cpu.percent}%</span>
                  </div>
                  <ProgressBar percent={metrics.cpu.percent} color={getColor(metrics.cpu.percent)} height={8} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/40 font-medium">Disk</span>
                    <span className="text-white/75 font-bold">
                      {metrics.disk.usedGB} / {metrics.disk.totalGB} GB
                    </span>
                  </div>
                  <ProgressBar percent={metrics.disk.percent} color={getColor(metrics.disk.percent)} height={8} />
                </div>
              </div>
            </MetricCard>

            {/* Card 6: Network */}
            <MetricCard title="Network" icon={Wifi} delay={0.25}>
              <div className="grid grid-cols-2 gap-4">
                <div className="py-2 px-3 rounded-xl" style={{ background: "rgba(74,222,128,0.06)" }}>
                  <div className="text-[10px] text-white/35 uppercase tracking-wider mb-1.5 font-semibold">
                    Inbound
                  </div>
                  <div className="text-2xl font-bold text-emerald-400/90">{metrics.network.inboundKBs}</div>
                  <div className="text-[11px] text-white/30 font-medium">KB/s</div>
                </div>
                <div className="py-2 px-3 rounded-xl" style={{ background: "rgba(96,165,250,0.06)" }}>
                  <div className="text-[10px] text-white/35 uppercase tracking-wider mb-1.5 font-semibold">
                    Outbound
                  </div>
                  <div className="text-2xl font-bold text-blue-400/90">{metrics.network.outboundKBs}</div>
                  <div className="text-[11px] text-white/30 font-medium">KB/s</div>
                </div>
              </div>
              {!connected && !USE_MOCK_DATA && (
                <div className="mt-4 flex items-center gap-2 text-xs text-red-400/80 py-2 px-3 rounded-lg" style={{ background: "rgba(248,113,113,0.08)" }}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Mất kết nối WebSocket</span>
                </div>
              )}
            </MetricCard>
          </div>
        )}


      </main>
    </div>
  );
}
