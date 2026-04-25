import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Gauge, Download, Upload, Activity, Zap, RefreshCw, CheckCircle2, Wifi, Award } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { ToolVideoBg } from "@/components/ToolVideoBg";

const FONT = "'Plus Jakarta Sans', sans-serif";

const PING_DURATION_MS = 4000;
const DOWNLOAD_DURATION_MS = 8000;
const UPLOAD_DURATION_MS = 8000;

const CF_DOWN = "https://speed.cloudflare.com/__down";
const CF_UP = "https://speed.cloudflare.com/__up";

type Phase = "idle" | "ping" | "download" | "upload" | "done";

interface PhaseStats {
  min: number;
  max: number;
  avg: number;
  samples: number;
}
interface PingStats extends PhaseStats {
  jitter: number;
}
interface SpeedStats extends PhaseStats {
  totalMB: number;
}
interface FullStats {
  ping: PingStats;
  download: SpeedStats;
  upload: SpeedStats;
  duration: number;
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const a = avg(arr);
  return Math.sqrt(avg(arr.map(x => (x - a) ** 2)));
}

async function pingTest(durationMs: number, onSample: (ms: number, all: number[]) => void): Promise<number[]> {
  const samples: number[] = [];
  const end = performance.now() + durationMs;
  while (performance.now() < end) {
    const t0 = performance.now();
    try {
      await fetch(`${CF_DOWN}?bytes=0&t=${Math.random()}`, { cache: "no-store", mode: "cors" });
      const dt = performance.now() - t0;
      samples.push(dt);
      onSample(dt, [...samples]);
    } catch { /* skip */ }
    await new Promise(r => setTimeout(r, 250));
  }
  return samples;
}

async function downloadTest(
  durationMs: number,
  onTick: (mbpsNow: number, samples: number[]) => void,
  isAborted: () => boolean,
): Promise<{ samples: number[]; totalBytes: number }> {
  const PARALLEL = 4;
  const CHUNK_BYTES = 25_000_000;
  let totalBytes = 0;
  const start = performance.now();
  const controllers: AbortController[] = [];
  const samples: number[] = [];
  let lastBytes = 0;
  let lastT = start;

  const ticker = setInterval(() => {
    const now = performance.now();
    const dt = (now - lastT) / 1000;
    if (dt > 0) {
      const mbps = ((totalBytes - lastBytes) * 8) / dt / 1e6;
      samples.push(mbps);
      onTick(mbps, [...samples]);
      lastBytes = totalBytes;
      lastT = now;
    }
  }, 250);

  const pump = async () => {
    while (performance.now() - start < durationMs && !isAborted()) {
      const ctrl = new AbortController();
      controllers.push(ctrl);
      try {
        const r = await fetch(`${CF_DOWN}?bytes=${CHUNK_BYTES}&t=${Math.random()}`, {
          signal: ctrl.signal, cache: "no-store", mode: "cors",
        });
        const reader = r.body?.getReader();
        if (!reader) break;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) totalBytes += value.length;
          if (performance.now() - start >= durationMs || isAborted()) {
            try { ctrl.abort(); } catch { /* */ }
            break;
          }
        }
      } catch { /* aborted/err */ }
    }
  };

  await Promise.all(Array.from({ length: PARALLEL }, () => pump()));
  clearInterval(ticker);
  controllers.forEach(c => { try { c.abort(); } catch { /* */ } });

  return { samples, totalBytes };
}

async function uploadTest(
  durationMs: number,
  onTick: (mbpsNow: number, samples: number[]) => void,
  isAborted: () => boolean,
): Promise<{ samples: number[]; totalBytes: number }> {
  const PARALLEL = 4;
  const CHUNK_BYTES = 1_000_000;
  const blob = new Blob([new Uint8Array(CHUNK_BYTES)]);
  let totalBytes = 0;
  const start = performance.now();
  const samples: number[] = [];
  let lastBytes = 0;
  let lastT = start;
  const controllers: AbortController[] = [];

  const ticker = setInterval(() => {
    const now = performance.now();
    const dt = (now - lastT) / 1000;
    if (dt > 0) {
      const mbps = ((totalBytes - lastBytes) * 8) / dt / 1e6;
      samples.push(mbps);
      onTick(mbps, [...samples]);
      lastBytes = totalBytes;
      lastT = now;
    }
  }, 250);

  const pump = async () => {
    while (performance.now() - start < durationMs && !isAborted()) {
      const ctrl = new AbortController();
      controllers.push(ctrl);
      try {
        await fetch(CF_UP, { method: "POST", body: blob, cache: "no-store", mode: "cors", signal: ctrl.signal });
        totalBytes += CHUNK_BYTES;
      } catch { /* err/abort */ }
    }
  };

  await Promise.all(Array.from({ length: PARALLEL }, () => pump()));
  clearInterval(ticker);
  controllers.forEach(c => { try { c.abort(); } catch { /* */ } });

  return { samples, totalBytes };
}

function ratingFor(downloadMbps: number, ping: number): { label: string; color: string; desc: string } {
  if (downloadMbps >= 100 && ping < 30) return { label: "Xuất sắc", color: "rgba(134,239,172,0.95)", desc: "Mạng cực nhanh, chơi game / 4K streaming mượt" };
  if (downloadMbps >= 50 && ping < 60) return { label: "Tốt", color: "rgba(147,197,253,0.95)", desc: "Đủ cho 4K, video call HD, làm việc thoải mái" };
  if (downloadMbps >= 25 && ping < 100) return { label: "Khá", color: "rgba(253,224,71,0.95)", desc: "Đủ cho HD streaming, browsing, gọi video" };
  if (downloadMbps >= 10) return { label: "Trung bình", color: "rgba(251,146,60,0.95)", desc: "Tạm dùng cho duyệt web, SD video" };
  return { label: "Yếu", color: "rgba(248,113,113,0.95)", desc: "Mạng chậm — kiểm tra lại router hoặc nhà mạng" };
}

function formatMbps(v: number): string {
  if (!isFinite(v) || v < 0) return "0.00";
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function MiniChart({ samples, color, max }: { samples: number[]; color: string; max: number }) {
  const W = 100;
  const H = 40;
  if (samples.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full opacity-40">
        <line x1="0" y1={H} x2={W} y2={H} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      </svg>
    );
  }
  const m = max || Math.max(...samples, 1);
  const points = samples.map((s, i) => `${(i / (samples.length - 1)) * W},${H - (s / m) * H * 0.95}`).join(" ");
  const area = `0,${H} ${points} ${W},${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
      <polygon points={area} fill={color} opacity="0.15" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Gauge360({ value, max, label, unit, color, phase }: {
  value: number; max: number; label: string; unit: string; color: string; phase: Phase;
}) {
  const pct = Math.min(value / max, 1);
  const angle = pct * 270 - 135;
  const R = 90;
  const C = 2 * Math.PI * R;
  const arcLen = (270 / 360) * C;
  const filledLen = pct * arcLen;
  const isActive = phase !== "idle" && phase !== "done";
  return (
    <div className="relative" style={{ width: 220, height: 220 }}>
      <svg viewBox="0 0 220 220" className="absolute inset-0">
        <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"
          strokeDasharray={`${arcLen} ${C}`} strokeDashoffset={0} strokeLinecap="round"
          transform="rotate(135 110 110)" />
        <circle cx="110" cy="110" r={R} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${filledLen} ${C}`} strokeDashoffset={0} strokeLinecap="round"
          transform="rotate(135 110 110)"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 0.25s ease" }} />
        {isActive && (
          <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"
            strokeDasharray="2 6" transform={`rotate(${angle - 90} 110 110)`}>
            <animateTransform attributeName="transform" type="rotate" from={`${angle - 90} 110 110`}
              to={`${angle + 270} 110 110`} dur="6s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ pointerEvents: "none" }}>
        <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</div>
        <div className="text-5xl font-black mt-1" style={{ color: color, fontFamily: FONT, lineHeight: 1 }}>
          {formatMbps(value)}
        </div>
        <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>{unit}</div>
      </div>
    </div>
  );
}

export function SpeedTest() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [chartSamples, setChartSamples] = useState<number[]>([]);
  const [chartColor, setChartColor] = useState("rgba(134,239,172,0.95)");
  const [stats, setStats] = useState<FullStats | null>(null);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);

  const startTest = useCallback(async () => {
    abortRef.current = false;
    setStats(null);
    setCurrentSpeed(0);
    setChartSamples([]);

    const startedAt = performance.now();

    setPhase("ping");
    setChartColor("rgba(147,197,253,0.95)");
    const pingProgressTimer = setInterval(() => {
      const e = performance.now() - startedAt;
      setProgress(Math.min(e / (PING_DURATION_MS + DOWNLOAD_DURATION_MS + UPLOAD_DURATION_MS), 1));
    }, 100);

    const pingSamples = await pingTest(PING_DURATION_MS, (ms, all) => {
      setCurrentSpeed(ms);
      setChartSamples(all.slice(-30));
    });
    if (abortRef.current) { clearInterval(pingProgressTimer); setPhase("idle"); return; }

    setPhase("download");
    setChartColor("rgba(134,239,172,0.95)");
    setChartSamples([]);
    setCurrentSpeed(0);
    const dlResult = await downloadTest(DOWNLOAD_DURATION_MS, (mbps, all) => {
      setCurrentSpeed(mbps);
      setChartSamples(all.slice(-30));
    }, () => abortRef.current);
    if (abortRef.current) { clearInterval(pingProgressTimer); setPhase("idle"); return; }

    setPhase("upload");
    setChartColor("rgba(196,181,253,0.95)");
    setChartSamples([]);
    setCurrentSpeed(0);
    const ulResult = await uploadTest(UPLOAD_DURATION_MS, (mbps, all) => {
      setCurrentSpeed(mbps);
      setChartSamples(all.slice(-30));
    }, () => abortRef.current);
    clearInterval(pingProgressTimer);
    if (abortRef.current) { setPhase("idle"); return; }

    const dlSpeeds = dlResult.samples.filter(x => x > 0);
    const ulSpeeds = ulResult.samples.filter(x => x > 0);

    setStats({
      ping: {
        min: pingSamples.length ? Math.min(...pingSamples) : 0,
        max: pingSamples.length ? Math.max(...pingSamples) : 0,
        avg: avg(pingSamples),
        samples: pingSamples.length,
        jitter: stddev(pingSamples),
      },
      download: {
        min: dlSpeeds.length ? Math.min(...dlSpeeds) : 0,
        max: dlSpeeds.length ? Math.max(...dlSpeeds) : 0,
        avg: dlSpeeds.length ? avg(dlSpeeds) : 0,
        samples: dlSpeeds.length,
        totalMB: dlResult.totalBytes / 1e6,
      },
      upload: {
        min: ulSpeeds.length ? Math.min(...ulSpeeds) : 0,
        max: ulSpeeds.length ? Math.max(...ulSpeeds) : 0,
        avg: ulSpeeds.length ? avg(ulSpeeds) : 0,
        samples: ulSpeeds.length,
        totalMB: ulResult.totalBytes / 1e6,
      },
      duration: (performance.now() - startedAt) / 1000,
    });
    setProgress(1);
    setPhase("done");
  }, []);

  useEffect(() => {
    return () => { abortRef.current = true; };
  }, []);

  const phaseDisplay: Record<Phase, { label: string; unit: string; color: string; max: number }> = {
    idle: { label: "Sẵn sàng", unit: "Mbps", color: "rgba(255,255,255,0.6)", max: 100 },
    ping: { label: "Đo Ping", unit: "ms", color: "rgba(147,197,253,0.95)", max: 200 },
    download: { label: "Tải xuống", unit: "Mbps", color: "rgba(134,239,172,0.95)", max: Math.max(currentSpeed * 1.3, 100) },
    upload: { label: "Tải lên", unit: "Mbps", color: "rgba(196,181,253,0.95)", max: Math.max(currentSpeed * 1.3, 50) },
    done: { label: "Hoàn tất", unit: "Mbps", color: "rgba(134,239,172,0.95)", max: stats?.download.max ? stats.download.max * 1.2 : 100 },
  };
  const cur = phaseDisplay[phase];

  return (
    <div className="min-h-screen" style={{ background: "#050505", fontFamily: FONT }}>
      <ToolVideoBg />
      <Navigation />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(134,239,172,0.04) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 pt-28 pb-20" style={{ zIndex: 1 }}>
        <motion.button initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/tool")} className="flex items-center gap-2 mb-8 text-sm"
          style={{ color: "rgba(255,255,255,0.35)" }} whileHover={{ color: "rgba(255,255,255,0.7)" }}>
          <ArrowLeft size={15} /> Quay lại Tool
        </motion.button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(134,239,172,0.07)", border: "1px solid rgba(134,239,172,0.2)" }}>
              <Gauge size={20} style={{ color: "rgba(134,239,172,0.85)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Speed Test</h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>Đo tốc độ mạng thời gian thực — 20 giây qua Cloudflare</p>
            </div>
          </div>
        </motion.div>

        {/* Main test card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl p-6 mb-4 relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}>
          {/* Phase steps */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[
              { key: "ping" as Phase, icon: Activity, label: "Ping" },
              { key: "download" as Phase, icon: Download, label: "Download" },
              { key: "upload" as Phase, icon: Upload, label: "Upload" },
            ].map((s, i) => {
              const order: Phase[] = ["idle", "ping", "download", "upload", "done"];
              const curIdx = order.indexOf(phase);
              const myIdx = order.indexOf(s.key);
              const active = curIdx === myIdx;
              const done = curIdx > myIdx;
              return (
                <div key={s.key} className="flex items-center">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold"
                    style={{
                      background: active ? "rgba(255,255,255,0.1)" : done ? "rgba(134,239,172,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${active ? "rgba(255,255,255,0.25)" : done ? "rgba(134,239,172,0.25)" : "rgba(255,255,255,0.06)"}`,
                      color: active ? "rgba(255,255,255,0.95)" : done ? "rgba(134,239,172,0.85)" : "rgba(255,255,255,0.3)",
                    }}>
                    {done ? <CheckCircle2 size={12} /> : <s.icon size={12} />}
                    {s.label}
                  </div>
                  {i < 2 && <div className="w-4 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />}
                </div>
              );
            })}
          </div>

          {/* Gauge */}
          <div className="flex justify-center mb-4">
            <Gauge360 value={currentSpeed} max={cur.max} label={cur.label} unit={cur.unit} color={cur.color} phase={phase} />
          </div>

          {/* Mini chart */}
          <div className="h-12 mb-5 px-2">
            <MiniChart samples={chartSamples} color={chartColor} max={Math.max(...chartSamples, 1)} />
          </div>

          {/* Progress bar */}
          {phase !== "idle" && phase !== "done" && (
            <div className="h-1 rounded-full mb-5 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <motion.div animate={{ width: `${progress * 100}%` }} transition={{ ease: "linear", duration: 0.1 }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, rgba(147,197,253,0.7), rgba(134,239,172,0.7), rgba(196,181,253,0.7))" }} />
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-center">
            {(phase === "idle" || phase === "done") && (
              <motion.button onClick={startTest}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, rgba(134,239,172,0.18), rgba(147,197,253,0.18))",
                  border: "1px solid rgba(134,239,172,0.4)",
                  color: "rgba(255,255,255,0.95)",
                  boxShadow: "0 0 24px rgba(134,239,172,0.15)",
                }}>
                {phase === "done" ? <RefreshCw size={15} /> : <Zap size={15} />}
                {phase === "done" ? "Đo lại" : "Bắt đầu test"}
              </motion.button>
            )}
            {phase !== "idle" && phase !== "done" && (
              <button onClick={() => { abortRef.current = true; }}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "rgba(248,113,113,0.9)" }}>
                Hủy
              </button>
            )}
          </div>
        </motion.div>

        {/* Stats table */}
        <AnimatePresence>
          {stats && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}>
              {/* Verdict */}
              {(() => {
                const r = ratingFor(stats.download.avg, stats.ping.avg);
                return (
                  <div className="rounded-2xl p-5 mb-4 flex items-center gap-4"
                    style={{
                      background: `linear-gradient(135deg, ${r.color.replace(/[\d.]+\)$/, "0.08)")}, rgba(255,255,255,0.02))`,
                      border: `1px solid ${r.color.replace(/[\d.]+\)$/, "0.25)")}`,
                    }}>
                    <Award size={32} style={{ color: r.color, flexShrink: 0 }} />
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.4)" }}>Đánh giá</div>
                      <div className="text-xl font-black" style={{ color: r.color }}>{r.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{r.desc}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Table */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="px-5 py-3 flex items-center gap-2"
                  style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <Wifi size={14} style={{ color: "rgba(255,255,255,0.5)" }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>Thống kê chi tiết</span>
                  <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{stats.duration.toFixed(1)}s</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3">
                  {/* PING */}
                  <div className="p-5" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Activity size={14} style={{ color: "rgba(147,197,253,0.85)" }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(147,197,253,0.85)" }}>Ping</span>
                    </div>
                    <div className="text-3xl font-black text-white mb-0.5">{stats.ping.avg.toFixed(1)}<span className="text-sm font-medium ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>ms</span></div>
                    <div className="text-[10px] mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Trung bình</div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.4)" }}>Min</span><span className="text-white/80 font-mono">{stats.ping.min.toFixed(1)} ms</span></div>
                      <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.4)" }}>Max</span><span className="text-white/80 font-mono">{stats.ping.max.toFixed(1)} ms</span></div>
                      <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.4)" }}>Jitter</span><span className="text-white/80 font-mono">{stats.ping.jitter.toFixed(1)} ms</span></div>
                      <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.4)" }}>Mẫu</span><span className="text-white/80 font-mono">{stats.ping.samples}</span></div>
                    </div>
                  </div>

                  {/* DOWNLOAD */}
                  <div className="p-5" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Download size={14} style={{ color: "rgba(134,239,172,0.85)" }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(134,239,172,0.85)" }}>Download</span>
                    </div>
                    <div className="text-3xl font-black text-white mb-0.5">{formatMbps(stats.download.avg)}<span className="text-sm font-medium ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>Mbps</span></div>
                    <div className="text-[10px] mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Trung bình</div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.4)" }}>Min</span><span className="text-white/80 font-mono">{formatMbps(stats.download.min)} Mbps</span></div>
                      <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.4)" }}>Max</span><span className="text-white/80 font-mono">{formatMbps(stats.download.max)} Mbps</span></div>
                      <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.4)" }}>Đã tải</span><span className="text-white/80 font-mono">{stats.download.totalMB.toFixed(1)} MB</span></div>
                      <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.4)" }}>Mẫu</span><span className="text-white/80 font-mono">{stats.download.samples}</span></div>
                    </div>
                  </div>

                  {/* UPLOAD */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Upload size={14} style={{ color: "rgba(196,181,253,0.85)" }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(196,181,253,0.85)" }}>Upload</span>
                    </div>
                    <div className="text-3xl font-black text-white mb-0.5">{formatMbps(stats.upload.avg)}<span className="text-sm font-medium ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>Mbps</span></div>
                    <div className="text-[10px] mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Trung bình</div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.4)" }}>Min</span><span className="text-white/80 font-mono">{formatMbps(stats.upload.min)} Mbps</span></div>
                      <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.4)" }}>Max</span><span className="text-white/80 font-mono">{formatMbps(stats.upload.max)} Mbps</span></div>
                      <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.4)" }}>Đã gửi</span><span className="text-white/80 font-mono">{stats.upload.totalMB.toFixed(1)} MB</span></div>
                      <div className="flex justify-between"><span style={{ color: "rgba(255,255,255,0.4)" }}>Mẫu</span><span className="text-white/80 font-mono">{stats.upload.samples}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-[11px] mt-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                Server Cloudflare · Test client-side · Không lưu kết quả
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
