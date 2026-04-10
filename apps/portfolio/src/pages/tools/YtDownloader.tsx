import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Download, Search, Clock, User,
  CheckCircle2, AlertCircle, Film, Loader2, Video
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const PLATFORMS = [
  { name: "YouTube", emoji: "▶️" },
  { name: "TikTok", emoji: "🎵" },
  { name: "Instagram", emoji: "📸" },
  { name: "Facebook", emoji: "👤" },
  { name: "Twitter/X", emoji: "🐦" },
  { name: "& 1000+", emoji: "🌐" },
];

const QUALITIES = [
  { label: "Tốt nhất", value: "best",  color: "rgba(255,255,255,0.75)" },
  { label: "1080p",    value: "1080p", color: "rgba(255,255,255,0.65)" },
  { label: "720p",     value: "720p",  color: "rgba(255,255,255,0.6)" },
  { label: "480p",     value: "480p",  color: "rgba(255,255,255,0.5)" },
  { label: "360p",     value: "360p",  color: "rgba(255,255,255,0.4)" },
];

type VideoInfo = {
  title: string; thumbnail: string; duration: number; channel: string;
  platform: string; ffmpegAvailable?: boolean; qualityNote?: string | null;
  availableQualities?: string[]; maxQuality?: string;
};

async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const res = await fetch(`/api/yt/info?url=${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    let msg = `Lỗi ${res.status}`;
    try { const b = await res.json(); if (b?.error) msg = b.error; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  if (!data?.title) throw new Error("Không lấy được thông tin video");
  return data as VideoInfo;
}

/* ── Animated Border Card (CSS @property — nhẹ, không xoay DOM) ── */
function AnimBorderCard({
  children, speed = 5, color = "rgba(255,255,255,0.4)",
  radius = 16, innerStyle = {}, className = "",
}: {
  children: React.ReactNode; speed?: number; color?: string;
  radius?: number; innerStyle?: React.CSSProperties; className?: string;
}) {
  return (
    <div
      className="anim-border"
      style={{ "--ab-speed": `${speed}s`, "--ab-color": color, "--ab-radius": `${radius}px` } as React.CSSProperties}
    >
      <div className={`anim-border-inner ${className}`} style={innerStyle}>
        {children}
      </div>
    </div>
  );
}

/* ── Floating Particles ── */
function Particles() {
  const pts = Array.from({ length: 12 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    s: Math.random() * 2 + 0.8, d: Math.random() * 10 + 7, delay: Math.random() * 5, op: Math.random() * 0.15 + 0.04,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {pts.map(p => (
        <motion.div key={p.id}
          style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, borderRadius: "50%", background: "rgba(255,255,255,0.7)", opacity: p.op }}
          animate={{ y: [0, -45, 0], opacity: [p.op, p.op * 3, p.op] }}
          transition={{ duration: p.d, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export function YtDownloader() {
  const [, navigate] = useLocation();
  const [url, setUrl]             = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [info, setInfo]           = useState<VideoInfo | null>(null);
  const [quality, setQuality]     = useState("best");
  const [dlReady, setDlReady]     = useState(false);
  const [dlLoading, setDlLoading] = useState(false);

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true); setError(""); setInfo(null); setDlReady(false);
    try {
      const result = await fetchVideoInfo(trimmed);
      setInfo(result);
      if (result.maxQuality) setQuality(result.maxQuality === "360p" ? "360p" : "best");
    } catch (e: any) {
      setError(e.message ?? "Không lấy được thông tin video");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!info || !url.trim() || dlLoading) return;
    setDlLoading(true); setDlReady(false); setError("");
    try {
      const params = new URLSearchParams({ url: url.trim(), quality, title: info.title });
      const res = await fetch(`/api/yt/download?${params.toString()}`, {
        signal: AbortSignal.timeout(300_000),
      });
      if (!res.ok) {
        let msg = `Lỗi ${res.status}`;
        try { const b = await res.json(); if (b?.error) msg = b.error; } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const safeTitle = info.title.replace(/[^\w\s\-\(\)\[\]]/g, "").trim().slice(0, 80) || "video";
      const link = document.createElement("a");
      link.href = blobUrl; link.download = `${safeTitle}_${quality}.mp4`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      setDlReady(true);
      setTimeout(() => setDlReady(false), 3000);
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e.message ?? "Không tải được video");
    } finally {
      setDlLoading(false);
    }
  };

  const available = info?.availableQualities ?? QUALITIES.map(q => q.value);

  return (
    <div className="min-h-screen" style={{ background: "#050505" }}>
      <Navigation />
      <Particles />

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 18, repeat: Infinity }}
          className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 22, repeat: Infinity, delay: 6 }}
          className="absolute bottom-0 right-0 w-[40vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 pt-28 pb-24">

        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -3 }} whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.4 }}
          onClick={() => navigate("/tool")}
          className="flex items-center gap-2 mb-8 text-sm transition-colors duration-200"
          style={{ color: "rgba(255,255,255,0.4)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Tool Box
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <AnimBorderCard speed={4} color="rgba(255,255,255,0.45)" radius={14}
              innerStyle={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)" }}>
              <motion.div
                animate={{ rotate: [0, 10, -8, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, repeatDelay: 5 }}
              >
                <Video className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
              </motion.div>
            </AnimBorderCard>
            <div>
              <h1 className="text-2xl font-black text-white">Video Downloader</h1>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                Tải video từ YouTube, TikTok, Instagram & hơn 1000 nền tảng
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p, i) => (
              <motion.span
                key={p.name}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 + i * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.06, y: -1 }}
                className="px-2.5 py-1 rounded-lg text-xs font-medium cursor-default"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.45)" }}
              >
                {p.emoji} {p.name}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* URL Input */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <div className="flex gap-3">
            <AnimBorderCard speed={5} color="rgba(255,255,255,0.35)" radius={14} innerStyle={{ flex: 1 }}>
              <div className="relative">
                <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "rgba(255,255,255,0.3)" }} />
                <input
                  type="text"
                  placeholder="Dán link video vào đây (YouTube, TikTok, Instagram...)"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setError(""); setInfo(null); }}
                  onKeyDown={e => e.key === "Enter" && handleFetch()}
                  className="w-full pl-11 pr-4 py-3.5 rounded-[13px] text-sm text-white/80 outline-none"
                  style={{ background: "rgba(255,255,255,0.03)", caretColor: "rgba(255,255,255,0.7)" }}
                />
              </div>
            </AnimBorderCard>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFetch}
              disabled={loading || !url.trim()}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              style={{
                background: loading ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.18)",
                backdropFilter: "blur(10px)",
              }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Đang tìm..." : "Tìm"}
            </motion.button>
          </div>

          <AnimatePresence>
            {loading && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs mt-2 pl-1" style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Đang phân tích video... có thể mất 10–30 giây tuỳ nền tảng
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
              className="mb-6 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <div className="flex items-start gap-2.5" style={{ color: "#fca5a5" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="whitespace-pre-line break-all">{error}</span>
              </div>
              {(error.includes("Sign in") || error.includes("bot") || error.includes("cookies") || error.includes("GEO_BLOCKED") || error.includes("giới hạn") || error.includes("geo")) && (
                <div className="mt-3 pt-3 text-xs space-y-1.5"
                  style={{ borderTop: "1px solid rgba(239,68,68,0.2)", color: "rgba(255,255,255,0.5)" }}>
                  <p className="font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>
                    {error.includes("GEO_BLOCKED") ? "Fix video Việt Nam (geo-block):" : "Fix YouTube bot check:"}
                  </p>
                  <p>1. Cài extension <span className="font-mono px-1 py-0.5 rounded" style={{ color: "#fbbf24", background: "rgba(251,191,36,0.1)" }}>"Get cookies.txt LOCALLY"</span> trên Chrome</p>
                  <p>2. Truy cập <span style={{ color: "rgba(255,255,255,0.7)" }}>youtube.com</span> (đã đăng nhập)</p>
                  <p>3. Click icon extension → <span style={{ color: "rgba(255,255,255,0.7)" }}>Export</span> → copy toàn bộ nội dung</p>
                  <p>4. Vào Render.com → Settings → Environment → thêm: Key: <span className="font-mono px-1 py-0.5 rounded" style={{ color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.08)" }}>YOUTUBE_COOKIES</span></p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Info Card */}
        <AnimatePresence>
          {info && (
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <AnimBorderCard speed={5} color="rgba(255,255,255,0.4)" radius={18}
                innerStyle={{ background: "rgba(255,255,255,0.03)", marginBottom: "16px", overflow: "hidden" }}>
                <div>
                  {info.thumbnail && (
                    <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                      <img src={info.thumbnail} alt={info.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0"
                        style={{ background: "linear-gradient(to top, rgba(5,5,5,0.9) 0%, transparent 50%)" }} />
                      {info.duration > 0 && (
                        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
                          <Clock className="w-3 h-3" />
                          {formatDuration(info.duration)}
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
                        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.7)" }}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        {info.platform || "Video tìm thấy"}
                      </div>
                    </div>
                  )}
                  <div className="px-5 py-4">
                    <h2 className="text-base font-bold text-white leading-snug mb-2 line-clamp-2">{info.title}</h2>
                    <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                      <User className="w-3.5 h-3.5" />
                      <span className="text-xs">{info.channel}</span>
                    </div>
                  </div>
                  {info.qualityNote && (
                    <div className="mx-5 mb-4 px-3 py-2 rounded-lg text-xs text-amber-300"
                      style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
                      ⚠ {info.qualityNote}
                    </div>
                  )}
                </div>
              </AnimBorderCard>

              {/* Quality Selection */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold tracking-wider uppercase"
                    style={{ color: "rgba(255,255,255,0.35)" }}>Chọn chất lượng</p>
                  {info.maxQuality && (
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Cao nhất: <span style={{ color: "#34d399" }}>
                        {QUALITIES.find(q => q.value === info.maxQuality)?.label ?? info.maxQuality}
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUALITIES.map(q => {
                    const active = quality === q.value;
                    const isAvail = available.includes(q.value);
                    return (
                      <motion.button
                        key={q.value}
                        whileHover={isAvail ? { scale: 1.04, y: -1 } : {}}
                        whileTap={isAvail ? { scale: 0.94 } : {}}
                        onClick={() => isAvail && setQuality(q.value)}
                        disabled={!isAvail}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                        style={{
                          background: !isAvail ? "rgba(255,255,255,0.02)"
                            : active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                          border: !isAvail ? "1px solid rgba(255,255,255,0.04)"
                            : active ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.09)",
                          color: !isAvail ? "rgba(255,255,255,0.18)"
                            : active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
                          cursor: isAvail ? "pointer" : "not-allowed",
                        }}
                      >
                        <Film className="w-3.5 h-3.5" />
                        {q.label}
                      </motion.button>
                    );
                  })}
                </div>
                <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Nút mờ = video không có chất lượng đó
                </p>
              </div>

              {/* Download Button */}
              <AnimBorderCard speed={dlLoading ? 2.5 : 5} color={dlReady ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.5)"} radius={14}>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownload}
                  disabled={dlReady || dlLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-[13px] text-base font-bold text-white transition-all duration-300 disabled:cursor-not-allowed"
                  style={{
                    background: dlReady
                      ? "rgba(5,150,105,0.2)"
                      : dlLoading
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(255,255,255,0.07)",
                    boxShadow: dlReady ? "0 8px 32px rgba(5,150,105,0.2)" : "none",
                  }}
                >
                  {dlReady
                    ? <><CheckCircle2 className="w-5 h-5 text-emerald-400" />Tải xong!</>
                    : dlLoading
                    ? <><Loader2 className="w-5 h-5 animate-spin" />Đang tải xuống...</>
                    : <><Download className="w-5 h-5" />Tải xuống {QUALITIES.find(q => q.value === quality)?.label}</>
                  }
                </motion.button>
              </AnimBorderCard>

              <p className="text-center text-xs mt-3" style={{ color: "rgba(255,255,255,0.25)" }}>
                Server tải video trước, có thể mất 10–60 giây tuỳ độ dài video
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!loading && !info && !error && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-center py-16"
          >
            <AnimBorderCard speed={6} color="rgba(255,255,255,0.3)" radius={18}
              innerStyle={{ width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", margin: "0 auto 16px" }}>
              <motion.div
                animate={{ rotate: [0, 10, -8, 10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
              >
                <Video className="w-7 h-7" style={{ color: "rgba(255,255,255,0.35)" }} />
              </motion.div>
            </AnimBorderCard>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.25)" }}>
              Dán link video từ bất kỳ nền tảng nào và nhấn Tìm
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {PLATFORMS.map((p, i) => (
                <motion.span
                  key={p.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }}
                >
                  {p.emoji} {p.name}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
