import { Navigation } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Download, Search, Clock, User,
  CheckCircle2, AlertCircle, Film, Loader2, Video
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

/* ── Helpers ── */
function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ── Nền tảng hỗ trợ ── */
const PLATFORMS = [
  { name: "YouTube",   emoji: "▶️" },
  { name: "TikTok",    emoji: "🎵" },
  { name: "Instagram", emoji: "📸" },
  { name: "Facebook",  emoji: "👤" },
  { name: "Twitter/X", emoji: "🐦" },
  { name: "& 1000+",   emoji: "🌐" },
];

/* ── Chất lượng ── */
const QUALITIES = [
  { label: "Tốt nhất", value: "best",  color: "#a78bfa" },
  { label: "720p",     value: "720p",  color: "#34d399" },
  { label: "480p",     value: "480p",  color: "#fbbf24" },
  { label: "360p",     value: "360p",  color: "#94a3b8" },
];

type VideoInfo = {
  title: string;
  thumbnail: string;
  duration: number;
  channel: string;
  platform: string;
};

async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const res = await fetch(`/api/yt/info?url=${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(35_000),
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

/* ── Main Component ── */
export function YtDownloader() {
  const [, navigate] = useLocation();
  const [url, setUrl]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [info, setInfo]         = useState<VideoInfo | null>(null);
  const [quality, setQuality]   = useState("best");
  const [dlReady, setDlReady]   = useState(false);

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setInfo(null);
    setDlReady(false);
    try {
      const result = await fetchVideoInfo(trimmed);
      setInfo(result);
    } catch (e: any) {
      setError(e.message ?? "Không lấy được thông tin video");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!info || !url.trim()) return;
    setDlReady(true);
    const params = new URLSearchParams({
      url:     url.trim(),
      quality: quality,
      title:   info.title,
    });
    const link = document.createElement("a");
    link.href = `/api/yt/download?${params.toString()}`;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Reset sau 3s để cho phép tải lại
    setTimeout(() => setDlReady(false), 3000);
  };

  return (
    <div className="min-h-screen" style={{ background: "#020008" }}>
      <Navigation />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.06) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[40vw] h-[40vw] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(52,211,153,0.04) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 pt-28 pb-24">

        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
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
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(124,58,237,0.14)", border: "1px solid rgba(124,58,237,0.25)" }}>
              <Video className="w-5 h-5" style={{ color: "#a78bfa" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Video Downloader</h1>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                Tải video từ YouTube, TikTok, Instagram & hơn 1000 nền tảng
              </p>
            </div>
          </div>

          {/* Platform badges */}
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <span key={p.name}
                className="px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
              >
                {p.emoji} {p.name}
              </span>
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
            <div className="relative flex-1">
              <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "rgba(167,139,250,0.5)" }} />
              <input
                type="text"
                placeholder="Dán link video vào đây (YouTube, TikTok, Instagram...)"
                value={url}
                onChange={e => { setUrl(e.target.value); setError(""); setInfo(null); }}
                onKeyDown={e => e.key === "Enter" && handleFetch()}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white/80 outline-none transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  caretColor: "#a78bfa",
                }}
                onFocus={e => {
                  e.target.style.border = "1px solid rgba(167,139,250,0.4)";
                  e.target.style.background = "rgba(124,58,237,0.06)";
                }}
                onBlur={e => {
                  e.target.style.border = "1px solid rgba(255,255,255,0.08)";
                  e.target.style.background = "rgba(255,255,255,0.04)";
                }}
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleFetch}
              disabled={loading || !url.trim()}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)" }}
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
                Đang phân tích video... có thể mất 5–15 giây
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-6 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <div className="flex items-start gap-2.5" style={{ color: "#fca5a5" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="whitespace-pre-line break-all">{error}</span>
              </div>
              {(error.includes("Sign in") || error.includes("bot") || error.includes("cookies")) && (
                <div className="mt-3 pt-3 text-xs space-y-1"
                  style={{ borderTop: "1px solid rgba(239,68,68,0.2)", color: "rgba(255,255,255,0.5)" }}>
                  <p className="font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>Fix YouTube bot check:</p>
                  <p>1. Cài <span className="font-mono" style={{ color: "#fbbf24" }}>"Get cookies.txt LOCALLY"</span> trên Chrome</p>
                  <p>2. Mở YouTube → export cookies</p>
                  <p>3. Set <span className="font-mono" style={{ color: "#fbbf24" }}>YOUTUBE_COOKIES</span> trên Render</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Info Card */}
        <AnimatePresence>
          {info && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Thumbnail + Meta */}
              <div className="rounded-2xl overflow-hidden mb-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>

                {info.thumbnail && (
                  <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                    <img src={info.thumbnail} alt={info.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0"
                      style={{ background: "linear-gradient(to top, rgba(2,0,8,0.85) 0%, transparent 50%)" }} />
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
                  <h2 className="text-base font-bold text-white leading-snug mb-2 line-clamp-2">
                    {info.title}
                  </h2>
                  <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <User className="w-3.5 h-3.5" />
                    <span className="text-xs">{info.channel}</span>
                  </div>
                </div>
              </div>

              {/* Quality Selection */}
              <div className="mb-4">
                <p className="text-xs font-semibold mb-3 tracking-wider uppercase"
                  style={{ color: "rgba(255,255,255,0.35)" }}>
                  Chọn chất lượng
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUALITIES.map(q => {
                    const active = quality === q.value;
                    return (
                      <motion.button
                        key={q.value}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setQuality(q.value)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                        style={{
                          background: active ? `${q.color}18` : "rgba(255,255,255,0.04)",
                          border: active ? `1px solid ${q.color}55` : "1px solid rgba(255,255,255,0.08)",
                          color: active ? q.color : "rgba(255,255,255,0.5)",
                        }}
                      >
                        <Film className="w-3.5 h-3.5" />
                        {q.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Download Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleDownload}
                disabled={dlReady}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-base font-bold text-white transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  background: dlReady
                    ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                    : "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                  boxShadow: dlReady
                    ? "0 8px 32px rgba(5,150,105,0.25)"
                    : "0 8px 32px rgba(124,58,237,0.3)",
                }}
              >
                {dlReady
                  ? <><CheckCircle2 className="w-5 h-5" />Đang tải xuống...</>
                  : <><Download className="w-5 h-5" />Tải xuống {QUALITIES.find(q => q.value === quality)?.label}</>
                }
              </motion.button>

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
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.12)" }}>
              <Video className="w-7 h-7" style={{ color: "rgba(167,139,250,0.4)" }} />
            </div>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.25)" }}>
              Dán link video từ bất kỳ nền tảng nào và nhấn Tìm
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {PLATFORMS.map(p => (
                <span key={p.name}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}
                >
                  {p.emoji} {p.name}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
