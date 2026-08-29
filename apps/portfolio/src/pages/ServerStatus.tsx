import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/navigation";
import { Server, Users, Cpu, HardDrive, Activity, Wifi, Clock, AlertTriangle } from "lucide-react";

const FONT = "'Plus Jakarta Sans', sans-serif";

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
};

// ═══════════════════════════════════════════════════════════
// 🔧 CONFIG: Set to false when plugin WebSocket is ready
const USE_MOCK_DATA = true;
const WS_ENDPOINT = "ws://localhost:8080/ws/metrics";
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
  if (percent < 60) return "rgba(74,222,128,0.85)";
  if (percent < 85) return "rgba(250,204,21,0.85)";
  return "rgba(248,113,113,0.85)";
}

function getTpsColor(tps: number): string {
  if (tps >= 19) return "rgba(74,222,128,0.9)";
  if (tps >= 16) return "rgba(250,204,21,0.9)";
  return "rgba(248,113,113,0.9)";
}

// ── Mock Data Generator ──
function generateMockMetrics(prev: MetricsData | null): MetricsData {
  const base = prev || {
    ram: { usedMB: 2800, maxMB: 4096, freeMB: 1296, percent: 68 },
    cpu: { percent: 35 },
    players: { online: 12, max: 100 },
    tps: { oneMin: 19.8, fiveMin: 19.9, fifteenMin: 20.0 },
    mspt: 42,
    entities: 1850,
    chunks: 620,
    network: { inboundKBs: 125, outboundKBs: 340 },
    uptimeSeconds: 3600 * 5 + 1200,
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
    tps: { oneMin: tps1, fiveMin: parseFloat(jitter(base.tps.fiveMin, 0.3).toFixed(1)), fifteenMin: parseFloat(jitter(base.tps.fifteenMin, 0.1).toFixed(1)) },
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

// ── Progress Bar Component ──
function ProgressBar({ percent, color, height = 6 }: { percent: number; color: string; height?: number }) {
  return (
    <div style={{ width: "100%", height, borderRadius: height, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
      <motion.div
        animate={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        style={{ height: "100%", borderRadius: height, background: color }}
      />
    </div>
  );
}

// ── Metric Card Wrapper ──
function MetricCard({ title, icon: Icon, children, delay = 0 }: { title: string; icon: any; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ ...glass, padding: "20px 22px" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-white/40" />
        <span className="text-xs font-semibold tracking-widest uppercase text-white/35" style={{ fontFamily: FONT }}>{title}</span>
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

  // Start mock or real data source
  useEffect(() => {
    if (USE_MOCK_DATA) {
      setConnected(true);
      setMetrics(generateMockMetrics(null));
      mockTimerRef.current = setInterval(() => {
        setMetrics(prev => generateMockMetrics(prev));
      }, MOCK_INTERVAL_MS);
      return () => { if (mockTimerRef.current) clearInterval(mockTimerRef.current); };
    } else {
      // WebSocket connection
      try {
        const ws = new WebSocket(WS_ENDPOINT);
        wsRef.current = ws;
        ws.onopen = () => setConnected(true);
        ws.onclose = () => { setConnected(false); setMetrics(prev => prev ? { ...prev, status: "offline" } : null); };
        ws.onerror = () => setConnected(false);
        ws.onmessage = (event) => {
          try { setMetrics(JSON.parse(event.data)); setConnected(true); } catch {}
        };
        return () => ws.close();
      } catch {
        setConnected(false);
      }
    }
  }, []);

  const isOnline = metrics?.status === "online" && connected;

  return (
    <div className="min-h-screen w-full relative" style={{ background: "#0a0a0f", fontFamily: FONT }}>
      <Navigation />

      <main className="relative z-10 max-w-5xl mx-auto px-5 pt-24 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-white/90 mb-1">Server Status</h1>
          <p className="text-sm text-white/35">Real-time monitoring • NexoraMC Infrastructure</p>
        </motion.div>

        {!metrics ? (
          <div className="flex items-center justify-center py-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/50"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Card 1: Overview */}
            <MetricCard title="Trạng thái" icon={Server} delay={0}>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full" style={{ background: isOnline ? "rgba(74,222,128,0.9)" : "rgba(248,113,113,0.9)" }} />
                  {isOnline && (
                    <motion.div
                      animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 w-3 h-3 rounded-full bg-green-400"
                    />
                  )}
                </div>
                <span className="text-lg font-bold" style={{ color: isOnline ? "rgba(74,222,128,0.9)" : "rgba(248,113,113,0.9)" }}>
                  {isOnline ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/35">Server</span><span className="text-white/70 font-medium">{metrics.serverName}</span></div>
                <div className="flex justify-between"><span className="text-white/35">Version</span><span className="text-white/70 font-medium">{metrics.version}</span></div>
                <div className="flex justify-between"><span className="text-white/35">Uptime</span><span className="text-white/70 font-medium flex items-center gap-1"><Clock className="w-3 h-3" />{formatUptime(metrics.uptimeSeconds)}</span></div>
              </div>
            </MetricCard>

            {/* Card 2: Players */}
            <MetricCard title="Người chơi" icon={Users} delay={0.05}>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-white/90">{metrics.players.online}</span>
                <span className="text-sm text-white/35 mb-1">/ {metrics.players.max}</span>
              </div>
              <ProgressBar percent={(metrics.players.online / metrics.players.max) * 100} color="rgba(180,220,255,0.7)" />
              <p className="text-[11px] text-white/25 mt-2">{Math.round((metrics.players.online / metrics.players.max) * 100)}% capacity</p>
            </MetricCard>

            {/* Card 3: Performance */}
            <MetricCard title="Hiệu năng" icon={Activity} delay={0.1}>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: "TPS 1m", value: metrics.tps.oneMin.toFixed(1), color: getTpsColor(metrics.tps.oneMin) },
                  { label: "TPS 5m", value: metrics.tps.fiveMin.toFixed(1), color: getTpsColor(metrics.tps.fiveMin) },
                  { label: "TPS 15m", value: metrics.tps.fifteenMin.toFixed(1), color: getTpsColor(metrics.tps.fifteenMin) },
                ].map(t => (
                  <div key={t.label} className="text-center">
                    <div className="text-lg font-bold" style={{ color: t.color }}>{t.value}</div>
                    <div className="text-[10px] text-white/30">{t.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/35">MSPT</span><span className="text-white/70 font-medium">{metrics.mspt}ms</span></div>
                <div className="flex justify-between"><span className="text-white/35">Entities</span><span className="text-white/70 font-medium">{metrics.entities.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-white/35">Chunks</span><span className="text-white/70 font-medium">{metrics.chunks.toLocaleString()}</span></div>
              </div>
            </MetricCard>

            {/* Card 4: RAM */}
            <MetricCard title="Bộ nhớ RAM" icon={Cpu} delay={0.15}>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-2xl font-bold text-white/90">{metrics.ram.usedMB}</span>
                <span className="text-sm text-white/35 mb-0.5">/ {metrics.ram.maxMB} MB</span>
              </div>
              <ProgressBar percent={metrics.ram.percent} color={getColor(metrics.ram.percent)} />
              <div className="flex justify-between mt-2 text-xs text-white/30">
                <span>Free: {metrics.ram.freeMB} MB</span>
                <span>{metrics.ram.percent}%</span>
              </div>
            </MetricCard>

            {/* Card 5: CPU & Disk */}
            <MetricCard title="CPU & Disk" icon={HardDrive} delay={0.2}>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/40">CPU</span>
                    <span className="text-white/70 font-medium">{metrics.cpu.percent}%</span>
                  </div>
                  <ProgressBar percent={metrics.cpu.percent} color={getColor(metrics.cpu.percent)} height={5} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/40">Disk</span>
                    <span className="text-white/70 font-medium">{metrics.disk.usedGB} / {metrics.disk.totalGB} GB</span>
                  </div>
                  <ProgressBar percent={metrics.disk.percent} color={getColor(metrics.disk.percent)} height={5} />
                </div>
              </div>
            </MetricCard>

            {/* Card 6: Network */}
            <MetricCard title="Network" icon={Wifi} delay={0.25}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Inbound</div>
                  <div className="text-xl font-bold text-emerald-400/80">{metrics.network.inboundKBs}</div>
                  <div className="text-[11px] text-white/25">KB/s</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Outbound</div>
                  <div className="text-xl font-bold text-blue-400/80">{metrics.network.outboundKBs}</div>
                  <div className="text-[11px] text-white/25">KB/s</div>
                </div>
              </div>
              {!connected && !USE_MOCK_DATA && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-red-400/70">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Mất kết nối WebSocket</span>
                </div>
              )}
            </MetricCard>

          </div>
        )}

        {/* Debug badge */}
        {USE_MOCK_DATA && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 text-center"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium tracking-wide"
              style={{ background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.15)", color: "rgba(250,204,21,0.6)" }}>
              ⚠ MOCK DATA MODE — Dữ liệu giả để test UI
            </span>
          </motion.div>
        )}
      </main>
    </div>
  );
}
